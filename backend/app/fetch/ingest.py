"""Raw source JSON -> SQLite rows."""
import json
from datetime import datetime, timezone

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
        state = comp.get("status", event.get("status", {})).get("type", {}).get("state")
        status = {"pre": "SCHEDULED", "in": "LIVE", "post": "FT"}.get(state, m["status"])
        hg = int(sides["home"].get("score") or 0)
        ag = int(sides["away"].get("score") or 0)
        if status == "SCHEDULED":
            conn.execute("UPDATE matches SET espn_event_id=? WHERE id=?",
                         (event["id"], m["id"]))
            continue
        winner = None
        if status == "FT" and hg != ag:
            winner = home["id"] if hg > ag else away["id"]
        # NOTE: knockout extra-time/penalty splits need the summary feed; the
        # scoreboard score is treated as the 90' score during the group stage.
        conn.execute(
            """UPDATE matches SET espn_event_id=?, status=?, home_goals=?, away_goals=?,
               home_goals_90=?, away_goals_90=?, winner_team_id=? WHERE id=?""",
            (event["id"], status, hg, ag, hg, ag, winner, m["id"]),
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


def espn_summary(conn, match_id: int, payload: dict):
    """Ingest team stats, lineups, and per-player stats from a summary feed."""
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
            pid = int(athlete["id"])
            pos = entry.get("position", {}).get("abbreviation")
            conn.execute(
                """INSERT INTO players (id, team_id, name, position, shirt_number, photo_url)
                   VALUES (?,?,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET position=excluded.position""",
                (pid, team["id"], athlete.get("displayName", "?"), pos,
                 int(entry["jersey"]) if entry.get("jersey") else None,
                 athlete.get("headshot", {}).get("href") if isinstance(athlete.get("headshot"), dict) else None),
            )
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
    conn.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
        (f"ingested:espn_summary:{match_id}", now),
    )
    conn.commit()
