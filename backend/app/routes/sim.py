from fastapi import APIRouter

from .. import db

router = APIRouter()


@router.get("/api/sim/championship")
def championship():
    conn = db.connect()
    try:
        run_id = conn.execute(
            "SELECT value FROM meta WHERE key='latest_sim_run_id'"
        ).fetchone()
        if not run_id:
            return {"run": None, "teams": []}
        rows = conn.execute(
            """SELECT s.*, t.name, t.fifa_code, t.elo
               FROM sim_results s JOIN teams t ON t.id = s.team_id
               WHERE s.run_id = ? ORDER BY s.p_champion DESC""",
            (run_id["value"],),
        ).fetchall()
    finally:
        conn.close()
    # latest_sim_run_id can outlive its rows (a partial/cleared run); without this
    # guard rows[0] would IndexError into a 500 instead of an empty payload.
    if not rows:
        return {"run": None, "teams": []}
    return {
        "run": {"run_id": run_id["value"], "n_iterations": rows[0]["n_iterations"]},
        "teams": rows,
    }
