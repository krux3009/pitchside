"""ESPN public JSON API — no key, no quota. Used for live-ish scores and as
the full fallback source for lineups/stats (Plan B).

    scoreboard:  .../scoreboard?dates=YYYYMMDD
    summary:     .../summary?event={espn_event_id}

The athletes API (career stats, team rosters) lives on a different host and is
only called by scripts/fetch_careers.py — never from the matchday refresh loop —
so those helpers take no conn and do their own retries instead of fetch_log rows.
"""
import time
from datetime import datetime, timezone

import httpx

BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world"
ATHLETES_BASE = "https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes"
TIMEOUT = 25.0


def _log(conn, endpoint: str, params: str, status: int):
    conn.execute(
        "INSERT INTO fetch_log (fetched_at, source, endpoint, params, status)"
        " VALUES (?,?,?,?,?)",
        (datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
         "espn", endpoint, params, status),
    )
    conn.commit()


def scoreboard(conn, yyyymmdd: str) -> dict | None:
    try:
        r = httpx.get(f"{BASE}/scoreboard", params={"dates": yyyymmdd}, timeout=TIMEOUT)
        _log(conn, "scoreboard", yyyymmdd, r.status_code)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPError:
        return None


def summary(conn, event_id: str) -> dict | None:
    try:
        r = httpx.get(f"{BASE}/summary", params={"event": event_id}, timeout=TIMEOUT)
        _log(conn, "summary", event_id, r.status_code)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPError:
        return None


def injuries(conn) -> dict | None:
    try:
        r = httpx.get(f"{BASE}/injuries", timeout=TIMEOUT)
        _log(conn, "injuries", "", r.status_code)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPError:
        return None


# Pooled client for the bulk career fetch: the TLS handshake is ~1.3s against
# ESPN, dwarfing the ~0.5s response itself, so keep-alive is a 3x speedup
# across the ~15k-request seed build. Thread-safe under the script's pool.
_client = httpx.Client(timeout=TIMEOUT, limits=httpx.Limits(max_connections=32))


def _get_json(url: str, params: dict | None = None, retries: int = 2) -> dict | None:
    for attempt in range(retries + 1):
        try:
            r = _client.get(url, params=params)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError:
            if attempt == retries:
                return None
            time.sleep(1.5 * (attempt + 1))


def league_teams() -> dict | None:
    """All 48 World Cup teams with their ESPN ids."""
    return _get_json(f"{BASE}/teams")


def team_roster(espn_team_id: str) -> dict | None:
    """Registered 26-man squad — maps every player to an ESPN athlete id."""
    return _get_json(f"{BASE}/teams/{espn_team_id}/roster")


def athlete_stats(espn_id: str, team: str | None = None,
                  league: str | None = None) -> dict | None:
    """Season-by-season totals. No params -> current team/league + the full
    team filter list; ?team= -> that team's default competition + its league
    filter list; ?team=&league= -> one team x competition history."""
    params = {}
    if team:
        params["team"] = team
    if league:
        params["league"] = league
    return _get_json(f"{ATHLETES_BASE}/{espn_id}/stats", params or None)
