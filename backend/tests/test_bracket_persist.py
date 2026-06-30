"""resolve_knockout persists decided knockout teams into the matches table."""
import shutil
from pathlib import Path

import pytest

from app import db
from app.services import predictions

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"


@pytest.fixture()
def conn(tmp_path):
    path = tmp_path / "test.db"
    shutil.copy(SEED, path)
    c = db.connect(path)
    yield c
    c.close()


def _finish_group_stage(conn):
    """Play out all 72 group matches with a strict, tie-free table per group:
    in every fixture the lower team-id wins 1-0, so each group ends 9/6/3/0 pts
    and rank == ascending team id. Returns {letter: [t1, t2, t3, t4]}."""
    desired = {}
    for t in conn.execute("SELECT id, group_letter FROM teams ORDER BY group_letter, id"):
        desired.setdefault(t["group_letter"], []).append(t["id"])
    for m in conn.execute("SELECT * FROM matches WHERE stage='GROUP'").fetchall():
        # lower id is ranked higher -> it wins
        winner = min(m["home_team_id"], m["away_team_id"])
        hg, ag = (1, 0) if winner == m["home_team_id"] else (0, 1)
        conn.execute(
            """UPDATE matches SET status='FT', home_goals=?, away_goals=?,
               home_goals_90=?, away_goals_90=?, winner_team_id=? WHERE id=?""",
            (hg, ag, hg, ag, winner, m["id"]),
        )
    conn.commit()
    return desired


def test_r32_fills_from_final_group_tables(conn):
    desired = _finish_group_stage(conn)
    filled = predictions.resolve_knockout(conn)
    assert filled == 16  # all R32 fixtures resolved

    r32 = conn.execute("SELECT * FROM matches WHERE stage='R32'").fetchall()
    assert all(m["home_team_id"] and m["away_team_id"] for m in r32)

    # match 73 is '2A' v '2B' -> each group's runner-up (rank index 1)
    m73 = conn.execute("SELECT * FROM matches WHERE id=73").fetchone()
    assert m73["home_slot"] == "2A" and m73["away_slot"] == "2B"
    assert m73["home_team_id"] == desired["A"][1]
    assert m73["away_team_id"] == desired["B"][1]

    # idempotent
    assert predictions.resolve_knockout(conn) == 0


def test_r16_fills_from_winner_feeds(conn):
    _finish_group_stage(conn)
    predictions.resolve_knockout(conn)

    # an R16 fixture needs BOTH its W<n> feeders decided, so play all 16 R32
    # (home side wins each), then resolve.
    win = {}
    for m in conn.execute("SELECT * FROM matches WHERE stage='R32'").fetchall():
        win[m["id"]] = m["home_team_id"]
        conn.execute(
            "UPDATE matches SET status='FT', winner_team_id=?, home_goals=1,"
            " away_goals=0, home_goals_90=1, away_goals_90=0 WHERE id=?",
            (m["home_team_id"], m["id"]),
        )
    conn.commit()

    predictions.resolve_knockout(conn)
    r16 = conn.execute("SELECT * FROM matches WHERE stage='R16'").fetchall()
    assert len(r16) == 8
    for m in r16:
        # R16 slots are W<n> winner feeds from the R32
        assert m["home_team_id"] == win[int(m["home_slot"][1:])]
        assert m["away_team_id"] == win[int(m["away_slot"][1:])]
