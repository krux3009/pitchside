"""Betting-market document for Gamba Mode: model book + real consensus odds.

One payload for every not-yet-finished match. Settlement deliberately does NOT
use this endpoint — the frontend settles bets against /api/matches scores — so
this document can lag or vanish without corrupting anyone's (fake) balance.
"""
from datetime import datetime, timezone

from fastapi import APIRouter

from .. import db
from ..services import markets

router = APIRouter()

LIST_SQL = """
SELECT m.id AS match_id, m.stage, m.group_letter, m.kickoff_utc, m.status,
       th.id AS home_id, th.name AS home_name, th.fifa_code AS home_code,
       ta.id AS away_id, ta.name AS away_name, ta.fifa_code AS away_code
FROM matches m
LEFT JOIN teams th ON th.id = m.home_team_id
LEFT JOIN teams ta ON ta.id = m.away_team_id
WHERE m.status != 'FT'
ORDER BY m.kickoff_utc, m.id
"""


def _row(r: dict) -> dict:
    return {"median": r["price_median"], "best": r["price_best"],
            "book": r["book_best"], "n": r["n_books"]}


def _real_book(rows: list[dict]) -> dict | None:
    """Group a match's market_odds rows into {h2h, totals[], btts}. Every real
    market is optional — The Odds API doesn't guarantee totals/btts per event."""
    if not rows:
        return None
    out = {"fetched_at": max(r["fetched_at"] or "" for r in rows) or None,
           "h2h": None, "totals": [], "btts": None}
    by_line = {}
    for r in rows:
        if r["market"] == "h2h":
            out["h2h"] = out["h2h"] or {}
            out["h2h"][r["selection"]] = _row(r)
        elif r["market"] == "btts":
            out["btts"] = out["btts"] or {}
            out["btts"][r["selection"]] = _row(r)
        elif r["market"] == "totals":
            by_line.setdefault(r["line"], {})[r["selection"]] = _row(r)
    out["totals"] = [{"line": line, **sels} for line, sels in sorted(by_line.items())]
    return out


@router.get("/api/odds")
def list_odds():
    conn = db.connect()
    try:
        rows = conn.execute(LIST_SQL).fetchall()
        preds = {p["match_id"]: p for p in conn.execute(
            "SELECT match_id, score_matrix_json FROM predictions"
        ).fetchall()}
        odds_rows = conn.execute("SELECT * FROM market_odds").fetchall()
    finally:
        conn.close()

    real_by_match = {}
    for r in odds_rows:
        real_by_match.setdefault(r["match_id"], []).append(r)

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "margin": markets.MODEL_MARGIN,
        "matches": [
            {**m,
             "model": markets.model_markets(preds.get(m["match_id"])),
             "real": _real_book(real_by_match.get(m["match_id"], []))}
            for m in rows
        ],
    }
