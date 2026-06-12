"""ESPN athlete-stats JSON -> player_career rows.

Fetch plan per player (espn.athlete_stats):
  1. no params        -> the team filter lists every side they ever played for
  2. ?team=X          -> that team's default competition rows + its league list
  3. ?team=X&league=Y -> each remaining competition

Pure parsing lives here so tests never touch the network; the bulk runner is
scripts/fetch_careers.py.
"""
import re
import unicodedata

from . import espn

# ESPN stat label -> player_career column. The general and goalkeeping
# categories share one season row, merged on (team, league, season).
STAT_COLUMNS = {
    "STRT": "starts",
    "G": "goals",
    "A": "assists",
    "SHOT": "shots",
    "SOG": "shots_on_target",
    "YC": "yellows",
    "RC": "reds",
    "FC": "fouls_committed",
    "FA": "fouls_suffered",
    "OF": "offsides",
    "CS": "clean_sheets",
    "SV": "saves",
    "GA": "goals_against",
}

_YOUTH_TEAM = re.compile(r" U-?\d{2}$")


def _normalize_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name or "")
    return "".join(c for c in decomposed if not unicodedata.combining(c)).casefold().strip()


def parse_stats_payload(payload: dict) -> dict:
    """One stats response -> {(team_id, league_slug, year, season_name): row}."""
    rows = {}
    for category in (payload or {}).get("categories", []):
        names = category.get("names", [])
        for entry in category.get("statistics", []):
            season = entry.get("season", {})
            key = (str(entry.get("teamId")), entry.get("leagueSlug"),
                   season.get("year"), season.get("type", {}).get("name"))
            row = rows.setdefault(key, {})
            for label, raw in zip(names, entry.get("stats", [])):
                col = STAT_COLUMNS.get(label)
                if col is None:
                    continue
                try:
                    row[col] = int(float(raw))
                except (TypeError, ValueError):
                    pass
    return rows


def _filter_options(payload: dict, name: str) -> list[tuple[str, str]]:
    for f in (payload or {}).get("filters", []):
        if f.get("name") == name:
            return [(o["value"], o.get("displayValue", o["value"]))
                    for o in f.get("options", [])]
    return []


def fetch_career(espn_id: str) -> tuple[dict, dict, int]:
    """All season rows for one athlete.

    Returns (rows keyed like parse_stats_payload, team_names by espn team id,
    request count). League display names ride along inside the rows.
    """
    overview = espn.athlete_stats(espn_id)
    requests = 1
    if not overview:
        return {}, {}, requests
    rows = {}
    team_names = dict(_filter_options(overview, "team"))
    for team_id in team_names:
        first = espn.athlete_stats(espn_id, team=team_id)
        requests += 1
        rows.update(parse_stats_payload(first))
        leagues = _filter_options(first, "league")
        league_names = dict(leagues)
        fetched_slugs = {k[1] for k in parse_stats_payload(first)}
        for slug, _ in leagues:
            if slug in fetched_slugs:
                continue
            more = espn.athlete_stats(espn_id, team=team_id, league=slug)
            requests += 1
            rows.update(parse_stats_payload(more))
        for key in rows:
            if key[0] == team_id and "league_name" not in rows[key]:
                rows[key]["league_name"] = league_names.get(key[1])
    return rows, team_names, requests


def store_career(conn, player_id: int, national_espn_id: str | None,
                 rows: dict, team_names: dict) -> int:
    """Insert parsed season rows, tagging national-team duty.

    A row is international when the team is the player's own senior side or
    any youth selection ('Mexico U20') — name-pattern matched so it holds even
    where ESPN and FIFA disagree on country naming.
    """
    written = 0
    for (team_id, league_slug, year, season_name), stats in rows.items():
        if year is None:
            continue
        if league_slug == "fifa.world" and year == 2026:
            continue  # the live tournament is the page's main section, not career
        team_name = team_names.get(team_id, team_id)
        is_national = int(team_id == national_espn_id
                          or bool(_YOUTH_TEAM.search(team_name or "")))
        conn.execute(
            """INSERT OR REPLACE INTO player_career
               (player_id, espn_team_id, team_name, league_slug, league_name,
                season_year, season_name, is_national, starts, goals, assists,
                shots, shots_on_target, yellows, reds, fouls_committed,
                fouls_suffered, offsides, clean_sheets, saves, goals_against)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (player_id, team_id, team_name, league_slug, stats.get("league_name"),
             year, season_name, is_national, stats.get("starts"),
             stats.get("goals"), stats.get("assists"), stats.get("shots"),
             stats.get("shots_on_target"), stats.get("yellows"), stats.get("reds"),
             stats.get("fouls_committed"), stats.get("fouls_suffered"),
             stats.get("offsides"), stats.get("clean_sheets"), stats.get("saves"),
             stats.get("goals_against")),
        )
        written += 1
    return written


def discover_espn_ids(conn) -> tuple[int, int]:
    """Fill teams.espn_id (all 48) and players.espn_id from ESPN squad rosters.

    Same resolution order as ingest._resolve_player (jersey, then accent-
    stripped name) but read-only on the squad list: discovery never inserts
    players. Returns (teams matched, players newly mapped).
    """
    payload = espn.league_teams()
    if not payload:
        raise RuntimeError("ESPN teams list unavailable")
    teams_matched = players_mapped = 0
    for wrapper in payload["sports"][0]["leagues"][0]["teams"]:
        team = wrapper["team"]
        row = conn.execute(
            "SELECT id FROM teams WHERE fifa_code=? OR name=?",
            (team.get("abbreviation"), team.get("displayName")),
        ).fetchone()
        if not row:
            print(f"  UNMATCHED espn team: {team.get('displayName')}")
            continue
        conn.execute("UPDATE teams SET espn_id=? WHERE id=?", (team["id"], row["id"]))
        teams_matched += 1
        roster = espn.team_roster(team["id"])
        if not roster:
            print(f"  roster unavailable: {team.get('displayName')}")
            continue
        players_mapped += _map_roster(conn, row["id"], roster.get("athletes", []))
    conn.commit()
    return teams_matched, players_mapped


def _exact_name(athlete: dict, pool: list) -> dict | None:
    target = _normalize_name(athlete.get("displayName", ""))
    for row in pool:
        if _normalize_name(row["name"]) == target:
            return row


def _subset_name(athlete: dict, pool: list) -> dict | None:
    """'Juan Cáceres' <-> 'Juan José Cáceres': one name's tokens contain the
    other's. Ambiguous (multiple hits) is left for the jersey pass."""
    tokens = set(_normalize_name(athlete.get("displayName", "")).split())
    if not tokens:
        return None
    hits = []
    for row in pool:
        candidate = set(_normalize_name(row["name"]).split())
        if tokens <= candidate or candidate <= tokens:
            hits.append(row)
    return hits[0] if len(hits) == 1 else None


def _jersey(athlete: dict, pool: list) -> dict | None:
    if not athlete.get("jersey"):
        return None
    number = int(athlete["jersey"])
    for row in pool:
        if row["shirt_number"] == number:
            return row


def _map_roster(conn, team_id: int, athletes: list) -> int:
    """Narrowing passes: exact name, then token-subset name, then jersey —
    each pass removes matched pairs from both sides. Jersey runs last because
    ESPN squad jerseys have proven unreliable (duplicate numbers); a wrong
    espn_id here would hang another player's whole career on the page."""
    known = {r["espn_id"] for r in conn.execute(
        "SELECT espn_id FROM players WHERE team_id=? AND espn_id IS NOT NULL",
        (team_id,))}
    pool = conn.execute(
        "SELECT id, name, shirt_number FROM players WHERE team_id=? AND espn_id IS NULL",
        (team_id,)).fetchall()
    todo = [a for a in athletes if str(a["id"]) not in known]
    mapped = 0
    for match in (_exact_name, _subset_name, _jersey):
        leftover = []
        for athlete in todo:
            row = match(athlete, pool)
            if not row:
                leftover.append(athlete)
                continue
            headshot = athlete.get("headshot")
            photo_url = headshot.get("href") if isinstance(headshot, dict) else None
            conn.execute(
                "UPDATE players SET espn_id=?, photo_url=COALESCE(photo_url, ?) WHERE id=?",
                (str(athlete["id"]), photo_url, row["id"]),
            )
            pool.remove(row)
            mapped += 1
        todo = leftover
    return mapped
