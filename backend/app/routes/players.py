from fastapi import APIRouter, HTTPException

from .. import db
from ..services import player_stats

router = APIRouter()


@router.get("/api/players")
def list_players(team: int | None = None):
    conn = db.connect()
    try:
        return player_stats.index(conn, team_id=team)
    finally:
        conn.close()


@router.get("/api/players/{player_id}")
def player_detail(player_id: int):
    conn = db.connect()
    try:
        result = player_stats.detail(conn, player_id)
    finally:
        conn.close()
    if not result:
        raise HTTPException(404, "player not found")
    return result
