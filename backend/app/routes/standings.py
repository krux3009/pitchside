from fastapi import APIRouter

from .. import db
from ..model import tiebreakers

router = APIRouter()


@router.get("/api/standings")
def standings():
    """12 group tables ranked with the same tie-breaker code the simulator uses."""
    conn = db.connect()
    try:
        teams = conn.execute("SELECT * FROM teams ORDER BY group_letter, id").fetchall()
        results = [
            (m["home_team_id"], m["away_team_id"], m["home_goals_90"], m["away_goals_90"])
            for m in conn.execute("SELECT * FROM matches WHERE stage='GROUP' AND status='FT'")
        ]
    finally:
        conn.close()

    by_group: dict[str, list] = {}
    for t in teams:
        by_group.setdefault(t["group_letter"], []).append(t)

    out = []
    for letter in sorted(by_group):
        members = by_group[letter]
        ids = [t["id"] for t in members]
        stats = tiebreakers.table_stats(ids, results)
        ranked = tiebreakers.rank_group(ids, results)
        info = {t["id"]: t for t in members}
        out.append({
            "group": letter,
            "table": [
                {
                    "rank": i + 1,
                    "team_id": tid,
                    "name": info[tid]["name"],
                    "code": info[tid]["fifa_code"],
                    "played": sum(
                        1 for h, a, *_ in results if tid in (h, a)
                    ),
                    **stats[tid],
                }
                for i, tid in enumerate(ranked)
            ],
        })
    return out
