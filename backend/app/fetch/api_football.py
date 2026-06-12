"""API-Football (api-sports.io) client with a hard daily budget guard.

Free plan: 100 requests/day, reset 00:00 UTC. We refuse past a soft cap of
80 so that a restart wiping the fetch_log ledger can never overrun the real
limit (worst observed day needs ~35).
"""
from datetime import datetime, timezone

import httpx

from ..config import API_FOOTBALL_DAILY_SOFT_CAP, API_FOOTBALL_KEY

BASE = "https://v3.football.api-sports.io"
TIMEOUT = 25.0


class BudgetExceeded(Exception):
    pass


def requests_today(conn) -> int:
    row = conn.execute(
        "SELECT COUNT(*) AS n FROM fetch_log"
        " WHERE source='api_football' AND date(fetched_at) = date('now')"
    ).fetchone()
    return row["n"]


def get(conn, endpoint: str, params: dict) -> dict | None:
    """One budgeted request. Returns parsed JSON 'response' or None on error."""
    if not API_FOOTBALL_KEY:
        return None
    if requests_today(conn) >= API_FOOTBALL_DAILY_SOFT_CAP:
        raise BudgetExceeded(f"soft cap {API_FOOTBALL_DAILY_SOFT_CAP} reached")
    try:
        r = httpx.get(
            f"{BASE}/{endpoint}", params=params,
            headers={"x-apisports-key": API_FOOTBALL_KEY}, timeout=TIMEOUT,
        )
        status = r.status_code
    except httpx.HTTPError:
        status = 0
    conn.execute(
        "INSERT INTO fetch_log (fetched_at, source, endpoint, params, status)"
        " VALUES (?,?,?,?,?)",
        (datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
         "api_football", endpoint, str(sorted(params.items())), status),
    )
    conn.commit()
    if status != 200:
        return None
    body = r.json()
    if body.get("errors"):
        return None
    return body.get("response")
