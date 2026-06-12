import json

from fastapi import APIRouter

from .. import db
from ..model.poisson import load_params

router = APIRouter()


@router.get("/api/methodology/params")
def params():
    conn = db.connect()
    try:
        backtest = conn.execute(
            "SELECT value FROM meta WHERE key='backtest_score'"
        ).fetchone()
        sim = conn.execute(
            "SELECT value FROM meta WHERE key='latest_sim_run_id'"
        ).fetchone()
        elo_note = conn.execute(
            "SELECT value FROM meta WHERE key='elo_seed_note'"
        ).fetchone()
    finally:
        conn.close()
    return {
        "model": load_params(),
        "elo": {"k_world_cup": 60, "home_bonus": 100, "seed_note":
                elo_note["value"] if elo_note else None},
        "backtest": json.loads(backtest["value"]) if backtest else None,
        "latest_sim": sim["value"] if sim else None,
    }
