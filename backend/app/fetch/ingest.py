"""Raw source JSON -> SQLite rows."""
import json
import re
import unicodedata
from datetime import datetime, timezone
from math import hypot

# ESPN team-stat name -> match_team_stats column
ESPN_TEAM_STATS = {
    "possessionPct": "possession",
    "totalShots": "shots",
    "shotsOnTarget": "shots_on_target",
    "wonCorners": "corners",
    "foulsCommitted": "fouls",
    "offsides": "offsides",
    "yellowCards": "yellows",
    "redCards": "reds",
    "totalPasses": "passes",
}

# ESPN per-player stat name -> player_match_stats column
ESPN_PLAYER_STATS = {
    "totalGoals": "goals",
    "goalAssists": "assists",
    "yellowCards": "yellow",
    "redCards": "red",
    "totalShots": "shots",
    "shotsOnTarget": "shots_on_target",
}

# Non-goal play type.text -> shot-map result. "Shot On Target" (non-goal) is a
# save; the separate keeper-side "Save" plays and "Assists Shot" markers drop.
# Goals are matched separately by prefix — ESPN suffixes the technique
# ("Goal - Header", "Goal - Volley", ...), so an exact "Goal" lookup misses most.
SHOT_RESULT_BY_TEXT = {
    "Shot On Target": "saved",
    "Shot Off Target": "off-target",
    "Shot Blocked": "blocked",
}


def _canonical_event_type(ev: dict) -> str | None:
    """Map an ESPN keyEvent to one of our timeline types, or None to drop it.

    ESPN labels goals by technique (type.type 'goal---header'/'goal---volley',
    text 'Goal - Header'), so an exact 'goal' match drops most of them. Detect a
    goal by its scoringPlay flag or a 'goal' in the slug, then fold the variants
    back to goal / own-goal / penalty-goal. Cards and subs match exactly.

    Shootout attempts also carry scoringPlay metadata, so drop them first — the
    shot importer skips p.get('shootout') the same way; counting a shootout
    conversion as a timeline penalty-goal would inflate the match's goal tally.
    """
    if ev.get("shootout"):
        return None
    t = ev.get("type", {}) or {}
    slug = (t.get("type") or "").lower()
    blob = slug + " " + (t.get("text") or "").lower()
    if ev.get("scoringPlay") or "goal" in slug:
        if "own" in blob:
            return "own-goal"
        if "penalt" in blob:
            return "penalty-goal"
        return "goal"
    if slug in ("yellow-card", "red-card", "substitution"):
        return slug
    return None


def _shot_result(text: str | None) -> str | None:
    """Core-feed play text -> shot-map result. A scored goal is 'Goal' or
    'Goal - <technique>' (Header/Volley/Penalty/...); the dash is what separates
    it from the 'Goal Kick' restart, which must NOT count as a goal."""
    if not text:
        return None
    if text == "Goal" or text.startswith("Goal -"):
        return "goal"
    return SHOT_RESULT_BY_TEXT.get(text)


def _team_by_espn(conn, competitor: dict) -> dict | None:
    """Resolve an ESPN competitor to our team, learning espn_id on first sight."""
    team = competitor.get("team", {})
    espn_id = team.get("id")
    row = conn.execute("SELECT * FROM teams WHERE espn_id=?", (espn_id,)).fetchone()
    if row:
        return row
    abbr = team.get("abbreviation")
    name = team.get("displayName")
    row = conn.execute(
        "SELECT * FROM teams WHERE fifa_code=? OR name=?", (abbr, name)
    ).fetchone()
    if row:
        conn.execute("UPDATE teams SET espn_id=? WHERE id=?", (espn_id, row["id"]))
        conn.commit()
    return row


def _int_score(v) -> int | None:
    """ESPN scores arrive as int, float, or numeric string; None/'' stay None."""
    if v in (None, ""):
        return None
    return int(float(v))


def _find_match(conn, home_id: int, away_id: int, date_utc: str) -> dict | None:
    return conn.execute(
        """SELECT * FROM matches
           WHERE home_team_id=? AND away_team_id=?
             AND date(kickoff_utc) BETWEEN date(?, '-1 day') AND date(?, '+1 day')""",
        (home_id, away_id, date_utc, date_utc),
    ).fetchone()


def espn_scoreboard(conn, payload: dict) -> list[int]:
    """Update scores/status from a scoreboard. Returns match ids that newly hit FT."""
    newly_finished = []
    for event in payload.get("events", []):
        comp = event["competitions"][0]
        sides = {c["homeAway"]: c for c in comp["competitors"]}
        home = _team_by_espn(conn, sides["home"])
        away = _team_by_espn(conn, sides["away"])
        if not home or not away:
            continue
        m = _find_match(conn, home["id"], away["id"], event["date"][:10])
        if not m:
            continue
        st = ((comp.get("status") or event.get("status") or {}).get("type") or {})
        state = st.get("state")
        status = {"pre": "SCHEDULED", "in": "LIVE", "post": "FT"}.get(state, m["status"])
        hg = int(sides["home"].get("score") or 0)
        ag = int(sides["away"].get("score") or 0)
        if status == "SCHEDULED":
            conn.execute("UPDATE matches SET espn_event_id=? WHERE id=?",
                         (event["id"], m["id"]))
            continue
        pens_h = _int_score(sides["home"].get("shootoutScore"))
        pens_a = _int_score(sides["away"].get("shootoutScore"))
        winner = None
        if status == "FT":
            # ESPN flags the advancing side on the competitor even when a knockout
            # is level after 90'/120' and decided on penalties, so trust the flag
            # first; then the shootout score; fall back to the full score.
            if sides["home"].get("winner"):
                winner = home["id"]
            elif sides["away"].get("winner"):
                winner = away["id"]
            elif pens_h is not None and pens_a is not None and pens_h != pens_a:
                winner = home["id"] if pens_h > pens_a else away["id"]
            elif hg != ag:
                winner = home["id"] if hg > ag else away["id"]
        # *_goals_90 is the regulation score (Elo replay, standings, and the
        # backtest read it), so write it only when ESPN says the match ended in
        # 90' (detail "FT"). An extra-time/penalty finish carries the inflated
        # full score here; its true split comes from the summary header's
        # per-period linescores (espn_header_scores), same refresh cycle.
        if status == "FT" and st.get("detail") == "FT":
            conn.execute(
                """UPDATE matches SET espn_event_id=?, status=?, home_goals=?,
                   away_goals=?, home_goals_90=?, away_goals_90=?, home_pens=?,
                   away_pens=?, winner_team_id=? WHERE id=?""",
                (event["id"], status, hg, ag, hg, ag, pens_h, pens_a, winner, m["id"]),
            )
        else:
            conn.execute(
                """UPDATE matches SET espn_event_id=?, status=?, home_goals=?,
                   away_goals=?, home_pens=?, away_pens=?, winner_team_id=? WHERE id=?""",
                (event["id"], status, hg, ag, pens_h, pens_a, winner, m["id"]),
            )
        if status == "FT" and m["status"] != "FT":
            newly_finished.append(m["id"])
    conn.commit()
    return newly_finished


def _stat_value(stats: list, name: str):
    for s in stats:
        if s.get("name") == name:
            return s.get("value", s.get("displayValue"))
    return None


def _normalize_name(name: str) -> str:
    """Accent-stripped casefold for cross-source name matching."""
    decomposed = unicodedata.normalize("NFKD", name or "")
    return "".join(c for c in decomposed if not unicodedata.combining(c)).casefold().strip()


def _resolve_player(conn, team_id: int, entry: dict) -> int:
    """Map an ESPN roster entry to the canonical squad-seeded player row.

    Resolution order: known espn_id -> shirt number -> normalized name ->
    insert new (late squad replacement). Learns espn_id / finer position /
    photo on first sight.
    """
    athlete = entry.get("athlete", {})
    espn_id = str(athlete["id"])
    row = conn.execute(
        "SELECT id FROM players WHERE team_id=? AND espn_id=?", (team_id, espn_id)
    ).fetchone()
    if row:
        return row["id"]

    jersey = int(entry["jersey"]) if entry.get("jersey") else None
    row = None
    if jersey is not None:
        row = conn.execute(
            "SELECT id FROM players WHERE team_id=? AND shirt_number=? AND espn_id IS NULL",
            (team_id, jersey),
        ).fetchone()
    if not row:
        target = _normalize_name(athlete.get("displayName", ""))
        for cand in conn.execute(
            "SELECT id, name FROM players WHERE team_id=? AND espn_id IS NULL", (team_id,)
        ).fetchall():
            if _normalize_name(cand["name"]) == target:
                row = cand
                break

    photo = athlete.get("headshot", {})
    photo_url = photo.get("href") if isinstance(photo, dict) else None
    pos = entry.get("position", {}).get("abbreviation")
    if row:
        # keep the squad's coarse GK/DF/MF/FW position — squad grouping sorts
        # on it; ESPN's finer position already lives in the lineups JSON
        conn.execute(
            "UPDATE players SET espn_id=?, photo_url=COALESCE(?, photo_url) WHERE id=?",
            (espn_id, photo_url, row["id"]),
        )
        return row["id"]

    # not in the seeded squad at all: insert under the ESPN id (>= 100000,
    # so it can't collide with canonical team_id*100+number ids)
    new_id = int(espn_id) + 100_000
    conn.execute(
        """INSERT OR IGNORE INTO players
           (id, team_id, name, position, shirt_number, photo_url, espn_id)
           VALUES (?,?,?,?,?,?,?)""",
        (new_id, team_id, athlete.get("displayName", "?"), pos, jersey, photo_url, espn_id),
    )
    return new_id


def _player_by_espn(conn, athlete_id) -> int | None:
    """Canonical player id for an ESPN athlete id, or None if not yet seen.
    Safe to call after the rosters loop, which learns espn_id for every starter
    and used sub via _resolve_player."""
    if not athlete_id:
        return None
    row = conn.execute(
        "SELECT id FROM players WHERE espn_id=?", (str(athlete_id),)
    ).fetchone()
    return row["id"] if row else None


def _event_minute(ev: dict) -> int | None:
    """The match minute a keyEvent happened on, parsed from the board clock.

    ESPN's ev["clock"]["displayValue"] is the authoritative board string — e.g.
    "17'", "45'+1'", "90'+4'" — and already shows stoppage time the way a viewer
    reads it. We fold stoppage into the integer by summing the numbers, so a row
    sorts/labels sensibly: "17'" -> 17, "45'+1'" -> 46, "90'+4'" -> 94. Returns
    None when there's no usable clock (the `clock` column keeps the raw string).
    """
    disp = (ev.get("clock", {}) or {}).get("displayValue") or ""
    nums = re.findall(r"\d+", disp)
    return sum(int(n) for n in nums) if nums else None


def espn_events(conn, match_id: int, payload: dict) -> int:
    """Parse the summary feed's keyEvents into match_events (goals/cards/subs).

    Idempotent: clears the match's rows then re-inserts, so a re-ingest of a
    corrected feed self-heals. Must run AFTER the rosters loop so player espn_ids
    are known. Returns the number of events stored.
    """
    conn.execute("DELETE FROM match_events WHERE match_id=?", (match_id,))
    rows = []
    for seq, ev in enumerate(payload.get("keyEvents", [])):
        etype = _canonical_event_type(ev)
        if etype is None:
            continue
        team = _team_by_espn(conn, ev) if ev.get("team") else None
        parts = ev.get("participants", []) or []
        primary = parts[0].get("athlete", {}) if len(parts) > 0 else {}
        second = parts[1].get("athlete", {}) if len(parts) > 1 else {}
        clock = ev.get("clock", {}) or {}
        rows.append((
            match_id, seq, _event_minute(ev), clock.get("displayValue"), etype,
            team["id"] if team else None,
            _player_by_espn(conn, primary.get("id")), primary.get("displayName"),
            _player_by_espn(conn, second.get("id")), second.get("displayName"),
            ev.get("shortText") or ev.get("text"),
        ))
    conn.executemany(
        """INSERT INTO match_events
           (match_id, seq, minute, clock, type, team_id,
            player_id, player_name, assist_id, assist_name, text)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        rows,
    )
    # marker (archived via the ingested:% pattern) — lets refresh.run skip a match
    # once its events are in, so the backfill pass is one-shot and self-terminating
    # even for genuinely event-less matches (0-0, no cards/subs).
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
        (f"ingested:events:v2:{match_id}", now),
    )
    conn.commit()
    return len(rows)


def _espn_id_from_ref(ref: str | None, kind: str) -> str | None:
    """Pull the numeric id out of a core-feed $ref URL, e.g.
    '.../athletes/45843?lang=en' with kind='athletes' -> '45843'."""
    if not ref:
        return None
    m = re.search(rf"/{kind}/(\d+)", ref)
    return m.group(1) if m else None


def _shot_player_name(conn, pid: int | None, play: dict) -> str | None:
    """Prefer the canonical squad name; the core feed doesn't inline the athlete
    name on a shot, so fall back to the leading name in the play text
    ('Lionel Messi (Argentina) ...')."""
    if pid:
        row = conn.execute("SELECT name FROM players WHERE id=?", (pid,)).fetchone()
        if row:
            return row["name"]
    m = re.match(r"^(.*?)\s+\(", play.get("text") or "")
    return m.group(1) if m else (play.get("shortText") or None)


def espn_shots(conn, match_id: int, plays: list) -> int:
    """Parse the core feed's shot plays into match_shots (xG + location + outcome).

    Idempotent (clear + reinsert). Resolves team/player from the $ref ids -> our
    espn_id, so it must run after the match's roster ingest. Returns shots stored.
    """
    conn.execute("DELETE FROM match_shots WHERE match_id=?", (match_id,))
    rows = []
    for p in plays or []:
        result = _shot_result((p.get("type") or {}).get("text"))
        fx, fy = p.get("fieldPositionX"), p.get("fieldPositionY")
        if not result or p.get("shootout") or fx is None or fy is None:
            continue  # not a plottable open-play shot
        parts = p.get("participants") or []
        shooter_ref = (parts[0].get("athlete", {}) if parts else {}).get("$ref")
        pid = _player_by_espn(conn, _espn_id_from_ref(shooter_ref, "athletes"))
        team_espn = _espn_id_from_ref((p.get("team") or {}).get("$ref"), "teams")
        team = conn.execute(
            "SELECT id FROM teams WHERE espn_id=?", (team_espn,)
        ).fetchone()
        rows.append((
            match_id, int(p["id"]), _event_minute(p),
            (p.get("clock") or {}).get("displayValue"),
            (p.get("period") or {}).get("number"),
            team["id"] if team else None, pid, _shot_player_name(conn, pid, p), result,
            p.get("expectedGoals"), p.get("expectedGoalsOnTarget"),
            (p.get("contactType") or {}).get("text"),
            (p.get("shotInfo") or {}).get("text"),
            (p.get("targetZone") or {}).get("text"),
            fx, fy, p.get("goalPositionY"), p.get("goalPositionZ"),
            round(hypot((100 - fx) / 100 * 105, (50 - fy) / 100 * 68), 1),
        ))
    conn.executemany(
        """INSERT INTO match_shots
           (match_id, seq, minute, clock, period, team_id, player_id, player_name,
            result, xg, xgot, body_part, situation, goal_zone,
            field_x, field_y, goal_y, goal_z, distance)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        rows,
    )
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
        (f"ingested:shots:v2:{match_id}", now),
    )
    conn.commit()
    return len(rows)


def espn_header_scores(conn, match_id: int, payload: dict) -> bool:
    """Authoritative final score from the summary feed's header block.

    The scoreboard folds extra time into its single score, so a knockout decided
    after 90' would corrupt *_goals_90 (Elo replay, standings, and the backtest
    all read it as the regulation score). The header's per-period linescores give
    the true split — 2 entries = regulation, 4 = extra time, 5 = shootout rides
    as a pseudo-period — and shootoutScore carries the pens tally. Idempotent:
    fixed values; the meta marker only gates the refresh backfill.
    """
    comp = ((payload.get("header") or {}).get("competitions") or [{}])[0]
    sides = {c.get("homeAway"): c for c in comp.get("competitors") or []}
    if not sides.get("home") or not sides.get("away"):
        return False
    m = conn.execute("SELECT * FROM matches WHERE id=?", (match_id,)).fetchone()
    if not m:
        return False
    listed_home = _team_by_espn(conn, sides["home"])
    if listed_home and listed_home["id"] == m["away_team_id"]:
        sides = {"home": sides["away"], "away": sides["home"]}

    def goals_90(c):
        periods = c.get("linescores") or []
        if len(periods) < 2:
            return None
        return sum(_int_score(p.get("displayValue")) or 0 for p in periods[:2])

    detail = ((comp.get("status") or {}).get("type") or {}).get("detail")
    hg = _int_score(sides["home"].get("score")) or 0
    ag = _int_score(sides["away"].get("score")) or 0
    h90, a90 = goals_90(sides["home"]), goals_90(sides["away"])
    if h90 is None or a90 is None:
        if detail != "FT":
            return False  # can't split yet: retry on a later, complete feed
        h90, a90 = hg, ag
    pens_h = _int_score(sides["home"].get("shootoutScore"))
    pens_a = _int_score(sides["away"].get("shootoutScore"))
    winner = None
    if sides["home"].get("winner"):
        winner = m["home_team_id"]
    elif sides["away"].get("winner"):
        winner = m["away_team_id"]
    elif pens_h is not None and pens_a is not None and pens_h != pens_a:
        winner = m["home_team_id"] if pens_h > pens_a else m["away_team_id"]
    elif hg != ag:
        winner = m["home_team_id"] if hg > ag else m["away_team_id"]
    conn.execute(
        """UPDATE matches SET home_goals=?, away_goals=?, home_goals_90=?,
           away_goals_90=?, home_pens=?, away_pens=?, winner_team_id=? WHERE id=?""",
        (hg, ag, h90, a90, pens_h, pens_a, winner, match_id),
    )
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
        (f"ingested:header:v1:{match_id}", now),
    )
    conn.commit()
    return True


def espn_summary(conn, match_id: int, payload: dict, mark_done: bool = True):
    """Ingest team stats, lineups, and per-player stats from a summary feed.

    mark_done writes the one-shot 'ingested:espn_summary' marker that gates the
    FT pass. A LIVE re-pull passes mark_done=False so the authoritative final
    ingest still runs once the match ends — all writes are INSERT OR REPLACE, so
    repeated live calls just overwrite with the latest snapshot.
    """
    m = conn.execute("SELECT * FROM matches WHERE id=?", (match_id,)).fetchone()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for side in payload.get("boxscore", {}).get("teams", []):
        team = _team_by_espn(conn, side)
        if not team:
            continue
        cols = {}
        for espn_name, col in ESPN_TEAM_STATS.items():
            v = _stat_value(side.get("statistics", []), espn_name)
            cols[col] = float(v) if v is not None else None
        total = cols.get("passes")
        accurate = _stat_value(side.get("statistics", []), "accuratePasses")
        if total and accurate:
            cols["pass_accuracy"] = round(100 * float(accurate) / float(total), 1)
        else:
            cols["pass_accuracy"] = None
        conn.execute(
            """INSERT OR REPLACE INTO match_team_stats
               (match_id, team_id, possession, shots, shots_on_target, corners,
                fouls, offsides, yellows, reds, passes, pass_accuracy)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (match_id, team["id"], cols["possession"], cols["shots"],
             cols["shots_on_target"], cols["corners"], cols["fouls"], cols["offsides"],
             cols["yellows"], cols["reds"], cols["passes"], cols["pass_accuracy"]),
        )

    for roster in payload.get("rosters", []):
        team = _team_by_espn(conn, roster)
        if not team:
            continue
        starters, bench = [], []
        for entry in roster.get("roster", []):
            athlete = entry.get("athlete", {})
            pid = _resolve_player(conn, team["id"], entry)
            pos = entry.get("position", {}).get("abbreviation")
            item = {"player_id": pid, "name": athlete.get("displayName"),
                    "number": entry.get("jersey"), "pos": pos,
                    "grid": entry.get("formationPlace")}
            (starters if entry.get("starter") else bench).append(item)

            if not entry.get("starter") and not entry.get("subbedIn"):
                continue  # unused sub: no match stats row
            stats = entry.get("stats", [])
            # ESPN has no minutes; heuristic (only used when API-Football is
            # absent): unsubbed starter 90', subbed-out starter 65', sub-in 25'
            if entry.get("starter"):
                minutes = 90 if not entry.get("subbedOut") else 65
            else:
                minutes = 25
            def val(name):
                v = _stat_value(stats, name)
                return int(v) if v is not None else 0
            conn.execute(
                """INSERT OR REPLACE INTO player_match_stats
                   (match_id, player_id, team_id, started, minutes, goals, assists,
                    yellow, red, shots, shots_on_target, passes, rating)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (match_id, pid, team["id"], int(bool(entry.get("starter"))), minutes,
                 val("totalGoals"), val("goalAssists"), val("yellowCards"),
                 val("redCards"), val("totalShots"), val("shotsOnTarget"), None, None),
            )
        conn.execute(
            """INSERT OR REPLACE INTO lineups
               (match_id, team_id, formation, starters_json, bench_json, coach)
               VALUES (?,?,?,?,?,?)""",
            (match_id, team["id"], roster.get("formation"),
             json.dumps(starters), json.dumps(bench), None),
        )

    # timed event log — after rosters so participant athletes resolve to player ids
    espn_events(conn, match_id, payload)

    if mark_done:
        # authoritative regulation/pens split — the scoreboard can't provide it
        espn_header_scores(conn, match_id, payload)
        conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
            (f"ingested:espn_summary:{match_id}", now),
        )
    conn.commit()


def espn_injuries(conn, payload: dict) -> int:
    """Replace the injuries table from ESPN's injuries feed.

    Parsed defensively — the feed has been empty so far this tournament, so
    the item shape follows ESPN's standard injuries schema (per-team groups
    of {athlete, status, details}); unknown fields are simply skipped.
    """
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = []
    for group in payload.get("injuries", []):
        team = _team_by_espn(conn, group) if group.get("team") else None
        for item in group.get("injuries", []):
            athlete = item.get("athlete", {})
            details = item.get("details", {}) or {}
            reason = details.get("type") or item.get("longComment") or item.get("shortComment")
            rows.append((
                team["id"] if team else None,
                athlete.get("displayName", "?"),
                reason,
                item.get("status"),
                item.get("date") or now,
            ))
    conn.execute("DELETE FROM injuries")
    conn.executemany(
        "INSERT INTO injuries (team_id, player_name, reason, status, reported_at)"
        " VALUES (?,?,?,?,?)",
        rows,
    )
    conn.commit()
    return len(rows)
