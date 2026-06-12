from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .config import ALLOWED_ORIGIN
from .routes import briefing, internal, matches, methodology, players, sim, standings


@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = db.bootstrap()
    conn.close()
    yield


app = FastAPI(title="Pitchside API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_methods=["GET"],
    allow_headers=["*"],
)

for module in (briefing, internal, matches, methodology, players, sim, standings):
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
