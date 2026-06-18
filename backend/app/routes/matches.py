import json

from fastapi import APIRouter, HTTPException

from .. import db
from ..services import momentum, player_stats

router = APIRouter()

CARD_SQL = """
SELECT m.id, m.stage, m.group_letter, m.kickoff_utc, m.venue, m.status,
       m.home_goals, m.away_goals, m.home_slot, m.away_slot,
       th.name AS home_name, th.fifa_code AS home_code, th.id AS home_id,
       ta.name AS away_name, ta.fifa_code AS away_code, ta.id AS away_id,
       p.p_home, p.p_draw, p.p_away, p.likely_score
FROM matches m
LEFT JOIN teams th ON th.id = m.home_team_id
LEFT JOIN teams ta ON ta.id = m.away_team_id
LEFT JOIN predictions p ON p.match_id = m.id
"""


@router.get("/api/matches")
def list_matches(stage: str | None = None, group: str | None = None,
                 team: int | None = None, date: str | None = None):
    clauses, args = [], []
    if stage:
        clauses.append("m.stage = ?")
        args.append(stage)
    if group:
        clauses.append("m.group_letter = ?")
        args.append(group.upper())
    if team:
        clauses.append("(m.home_team_id = ? OR m.away_team_id = ?)")
        args += [team, team]
    if date:
        clauses.append("date(m.kickoff_utc) = ?")
        args.append(date)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    conn = db.connect()
    try:
        rows = conn.execute(f"{CARD_SQL} {where} ORDER BY m.id", args).fetchall()
    finally:
        conn.close()
    return rows


@router.get("/api/matches/{match_id}")
def match_detail(match_id: int):
    conn = db.connect()
    try:
        m = conn.execute(f"{CARD_SQL} WHERE m.id = ?", (match_id,)).fetchone()
        if not m:
            raise HTTPException(404, "match not found")
        stats = conn.execute(
            "SELECT * FROM match_team_stats WHERE match_id = ?", (match_id,)
        ).fetchall()
        lineups = conn.execute(
            "SELECT * FROM lineups WHERE match_id = ?", (match_id,)
        ).fetchall()
        for lu in lineups:
            lu["starters"] = json.loads(lu.pop("starters_json") or "[]")
            lu["bench"] = json.loads(lu.pop("bench_json") or "[]")
        events = conn.execute(
            "SELECT * FROM match_events WHERE match_id = ? ORDER BY seq", (match_id,)
        ).fetchall()
        shots = conn.execute(
            "SELECT * FROM match_shots WHERE match_id = ? ORDER BY seq", (match_id,)
        ).fetchall()
        prediction = conn.execute(
            "SELECT * FROM predictions WHERE match_id = ?", (match_id,)
        ).fetchone()
        if prediction:
            prediction.pop("score_matrix_json", None)
        # in-match win-probability proxy (empty for unplayed matches); rides the
        # existing matches/{id}.json payload to the CDN — no new endpoint/contract
        momentum_series = momentum.series(
            events, shots, m["home_id"], m["away_id"],
            prediction["lambda_home"] if prediction else None,
            prediction["mu_away"] if prediction else None,
        )
        squads = None
        if not lineups and m["home_id"] and m["away_id"]:
            squads = {
                "home": player_stats.squad(conn, m["home_id"]),
                "away": player_stats.squad(conn, m["away_id"]),
            }
    finally:
        conn.close()
    return {**m, "team_stats": stats, "lineups": lineups, "events": events,
            "shots": shots, "prediction": prediction, "momentum": momentum_series,
            "squads": squads}
