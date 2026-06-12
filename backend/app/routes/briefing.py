import json
from datetime import date

from fastapi import APIRouter

from .. import db
from ..services import briefing as briefing_service

router = APIRouter()


@router.get("/api/briefing/today")
def today():
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT * FROM briefings WHERE briefing_date = ?", (date.today().isoformat(),)
        ).fetchone()
        if row:
            return json.loads(row["content_json"])
        return briefing_service.rebuild(conn)
    finally:
        conn.close()
