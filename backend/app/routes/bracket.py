"""Knockout bracket: the R32->Final tree, served straight from the matches table.

Each knockout row already carries its FIFA slot grammar (home_slot/away_slot, e.g.
'1A', '2B', '3A/B/C/D/F', 'W73') and a resolved team id once the feeding result is
known, so the tree renders whether or not the group stage is complete — unresolved
sides fall back to their slot label. Per-team advancement odds are layered on from
the latest Monte-Carlo run (sim_results) so each node can show a win probability.
No model code runs here; simulate.run() already wrote the odds.
"""
from fastapi import APIRouter

from .. import db

router = APIRouter()

# left-to-right bracket order; THIRD (3rd-place playoff) trails the FINAL as a side fixture
STAGE_ORDER = ["R32", "R16", "QF", "SF", "FINAL", "THIRD"]
_ODDS_COLS = ("p_r32", "p_r16", "p_qf", "p_sf", "p_final", "p_champion")

BRACKET_SQL = """
SELECT m.id, m.stage, m.kickoff_utc, m.venue, m.status,
       m.home_slot, m.away_slot,
       m.home_goals, m.away_goals, m.home_pens, m.away_pens, m.winner_team_id,
       th.id AS home_id, th.name AS home_name, th.fifa_code AS home_code,
       ta.id AS away_id, ta.name AS away_name, ta.fifa_code AS away_code
FROM matches m
LEFT JOIN teams th ON th.id = m.home_team_id
LEFT JOIN teams ta ON ta.id = m.away_team_id
WHERE m.stage IN ('R32','R16','QF','SF','THIRD','FINAL')
ORDER BY m.id
"""


def _side(row: dict, prefix: str) -> dict:
    """A resolved team ({team_id,name,code}) or, until then, just its slot label."""
    return {
        "team_id": row[f"{prefix}_id"],
        "name": row[f"{prefix}_name"],
        "code": row[f"{prefix}_code"],
        "slot": row[f"{prefix}_slot"],
    }


@router.get("/api/bracket")
def bracket():
    conn = db.connect()
    try:
        ko = conn.execute(BRACKET_SQL).fetchall()
        run = conn.execute(
            "SELECT value FROM meta WHERE key='latest_sim_run_id'"
        ).fetchone()
        odds_rows = (
            conn.execute("SELECT * FROM sim_results WHERE run_id = ?", (run["value"],)).fetchall()
            if run else []
        )
    finally:
        conn.close()

    by_stage: dict[str, list] = {s: [] for s in STAGE_ORDER}
    for row in ko:
        by_stage[row["stage"]].append({
            "id": row["id"],
            "stage": row["stage"],
            "kickoff_utc": row["kickoff_utc"],
            "venue": row["venue"],
            "status": row["status"],
            "home": _side(row, "home"),
            "away": _side(row, "away"),
            "home_goals": row["home_goals"],
            "away_goals": row["away_goals"],
            "home_pens": row["home_pens"],
            "away_pens": row["away_pens"],
            "winner_team_id": row["winner_team_id"],
        })

    n_iterations = odds_rows[0]["n_iterations"] if odds_rows else None
    odds = {r["team_id"]: {k: r[k] for k in _ODDS_COLS} for r in odds_rows}

    rounds = [{"stage": s, "matches": by_stage[s]} for s in STAGE_ORDER if by_stage[s]]
    return {"rounds": rounds, "odds": odds, "n_iterations": n_iterations}
