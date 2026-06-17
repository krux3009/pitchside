import threading
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from .. import archive, db
from .. import publish as publisher
from ..config import REFRESH_KEY
from ..fetch import refresh as refresh_orchestrator


router = APIRouter()

# one refresh+publish cycle at a time. The external cron pinger fires every few
# minutes; a live-match tick (ESPN ingest + recompute + ~60 changed files over
# FTP) can outlast the interval, so collapse overlaps instead of stacking them.
_cycle_lock = threading.Lock()


def _check(key: str):
    if key != REFRESH_KEY:
        raise HTTPException(403, "bad key")


def _refresh_then_publish():
    if not _cycle_lock.acquire(blocking=False):
        return  # previous tick still running — drop this one
    try:
        conn = db.connect()
        try:
            refresh_orchestrator.run(conn)
        finally:
            conn.close()
        publisher.run(datetime.now(timezone.utc).isoformat())
    except Exception:
        pass  # fire-and-forget; /api/health and status.json surface real state
    finally:
        _cycle_lock.release()


@router.get("/api/internal/refresh")
def refresh(key: str = "", publish: int = 0):
    _check(key)
    if publish:
        # Pinger path: run the slow refresh+publish in a background thread and
        # return an instant, tiny 200. cron-job.org has a ~30s timeout and a small
        # response-size cap — a synchronous 1-2 min publish trips both ("Failed:
        # output too large"). The detached thread still runs to completion, and the
        # quick request keeps the Render free instance warm.
        threading.Thread(target=_refresh_then_publish, daemon=True).start()
        return {"started": True}
    # Manual / no-publish path stays synchronous so callers get the full report.
    conn = db.connect()
    try:
        return refresh_orchestrator.run(conn)
    finally:
        conn.close()


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
