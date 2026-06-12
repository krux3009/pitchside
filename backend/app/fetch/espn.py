"""ESPN public JSON API — no key, no quota. Used for live-ish scores and as
the full fallback source for lineups/stats (Plan B).

    scoreboard:  .../scoreboard?dates=YYYYMMDD
    summary:     .../summary?event={espn_event_id}
"""
from datetime import datetime, timezone

import httpx

BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world"
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
