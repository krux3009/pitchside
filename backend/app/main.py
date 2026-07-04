import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .config import ALLOWED_ORIGINS
from .routes import (bracket, briefing, internal, matches, methodology, odds,
                     players, sim, standings)

LIVE_TICK_SECONDS = 75    # refresh cadence while a match is in play
IDLE_CHECK_SECONDS = 120  # how often to peek at the schedule otherwise


def _catch_up():
    """Rebuild recomputable state (predictions/sim/briefing) lost to a redeploy."""
    from .fetch import refresh

    conn = db.connect()
    try:
        refresh.run(conn)
    finally:
        conn.close()


def _live_loop():
    """Fast refresh while a match is in play. The external pinger only fires
    every ~10 minutes — fine between matchdays, glacial mid-match. This loop
    shares the pinger's cycle lock, so ticks collapse instead of stacking.
    It lives only while the instance is awake; the pinger stays the heartbeat
    that keeps Render's free tier from sleeping through a match.
    """
    from .fetch import refresh
    from .routes.internal import _refresh_then_publish

    while True:
        hot = False
        try:
            conn = db.connect()
            try:
                hot = refresh.live_window_open(conn)
            finally:
                conn.close()
            if hot:
                _refresh_then_publish()
        except Exception:
            pass  # never let a bad tick kill the loop; next tick retries
        time.sleep(LIVE_TICK_SECONDS if hot else IDLE_CHECK_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = db.bootstrap()
    needs_catchup = conn.execute(
        "SELECT 1 FROM meta WHERE key='latest_sim_run_id'"
    ).fetchone() is None
    conn.close()
    if needs_catchup:
        threading.Thread(target=_catch_up, daemon=True).start()
    threading.Thread(target=_live_loop, daemon=True).start()
    yield


app = FastAPI(title="Pitchside API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

for module in (bracket, briefing, internal, matches, methodology, odds, players,
               sim, standings):
    app.include_router(module.router)


@app.get("/api/health")
def health():
    conn = db.connect()
    try:
        n_matches = conn.execute("SELECT COUNT(*) AS n FROM matches").fetchone()["n"]
        last_refresh = conn.execute(
            "SELECT value FROM meta WHERE key = 'last_refresh'"
        ).fetchone()
    finally:
        conn.close()
    return {
        "status": "ok",
        "db_matches": n_matches,
        "last_refresh": last_refresh["value"] if last_refresh else None,
    }
