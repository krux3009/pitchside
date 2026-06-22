from fastapi import APIRouter

from .. import db
from ..model import tiebreakers

router = APIRouter()


def _record(tid, results):
    """Win/draw/loss + goals-against for one team, from FT 90-min scores.

    Lives here (not in tiebreakers.table_stats) on purpose: table_stats runs
    inside the Monte-Carlo sim hot path, while this runs once per request.
    pts/gd/gf still come from table_stats — this only adds w/d/l/ga/played.
    """
    won = drawn = lost = ga = 0
    for h, a, hg, ag in results:
        if tid == h:
            margin, ga = hg - ag, ga + ag
        elif tid == a:
            margin, ga = ag - hg, ga + hg
        else:
            continue
        if margin > 0:
            won += 1
        elif margin == 0:
            drawn += 1
        else:
            lost += 1
    return {"played": won + drawn + lost, "won": won, "drawn": drawn,
            "lost": lost, "ga": ga}


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
                    **_record(tid, results),
                    **stats[tid],
                }
                for i, tid in enumerate(ranked)
            ],
        })
    return out
