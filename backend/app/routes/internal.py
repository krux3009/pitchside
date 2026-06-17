from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from .. import archive, db
from .. import publish as publisher
from ..config import REFRESH_KEY
from ..fetch import refresh as refresh_orchestrator


router = APIRouter()


def _check(key: str):
    if key != REFRESH_KEY:
        raise HTTPException(403, "bad key")


@router.get("/api/internal/refresh")
def refresh(key: str = "", publish: int = 0):
    _check(key)
    conn = db.connect()
    try:
        report = refresh_orchestrator.run(conn)
    finally:
        conn.close()
    if publish:
        # fail-soft: the refresh already succeeded, and this same ping keeps the
        # Render instance warm — a broken FTP push must never 500 it.
        try:
            report["publish"] = publisher.run(datetime.now(timezone.utc).isoformat())
        except Exception as e:  # noqa: BLE001 — report any publish error, never raise
            report["publish"] = {"error": str(e)}
    return report


@router.get("/api/internal/publish")
def publish_now(key: str = ""):
    """Snapshot + FTP-push without a refresh (manual re-publish / first full run)."""
    _check(key)
    return publisher.run(datetime.now(timezone.utc).isoformat())


@router.get("/api/internal/archive")
def dump_archive(key: str = ""):
    _check(key)
    conn = db.connect()
    try:
        return archive.dump(conn)
    finally:
        conn.close()
