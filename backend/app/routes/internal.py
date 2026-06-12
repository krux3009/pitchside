from fastapi import APIRouter, HTTPException

from .. import archive, db
from ..config import REFRESH_KEY
from ..fetch import refresh as refresh_orchestrator


router = APIRouter()


def _check(key: str):
    if key != REFRESH_KEY:
        raise HTTPException(403, "bad key")


@router.get("/api/internal/refresh")
def refresh(key: str = ""):
    _check(key)
    conn = db.connect()
    try:
        return refresh_orchestrator.run(conn)
    finally:
        conn.close()


@router.get("/api/internal/archive")
def dump_archive(key: str = ""):
    _check(key)
    conn = db.connect()
    try:
        return archive.dump(conn)
    finally:
        conn.close()
