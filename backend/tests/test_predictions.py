"""Elo replay honours the regulation-score contract (*_goals_90)."""
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


def test_replay_waits_for_regulation_score(conn):
    predictions.replay_unapplied_results(conn)   # drain any seed backlog first

    m = conn.execute(
        """SELECT * FROM matches WHERE status='SCHEDULED'
           AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL
           ORDER BY id LIMIT 1"""
    ).fetchone()
    # a fresh final whose regulation split hasn't arrived yet (ET/pens finish:
    # the scoreboard defers *_goals_90 to the summary header)
    conn.execute(
        """UPDATE matches SET status='FT', home_goals=2, away_goals=1,
           home_goals_90=NULL, away_goals_90=NULL, winner_team_id=? WHERE id=?""",
        (m["home_team_id"], m["id"]),
    )
    conn.commit()
    before = conn.execute(
        "SELECT elo FROM teams WHERE id=?", (m["home_team_id"],)
    ).fetchone()["elo"]

    assert predictions.replay_unapplied_results(conn) == 0   # waits, no corruption
    assert conn.execute(
        "SELECT 1 FROM elo_history WHERE match_id=?", (m["id"],)
    ).fetchone() is None

    # the header ingest lands the split; the next cycle applies Elo exactly once
    conn.execute(
        "UPDATE matches SET home_goals_90=1, away_goals_90=1 WHERE id=?", (m["id"],)
    )
    conn.commit()
    assert predictions.replay_unapplied_results(conn) == 1
    after = conn.execute(
        "SELECT elo FROM teams WHERE id=?", (m["home_team_id"],)
    ).fetchone()["elo"]
    assert after != before
    assert conn.execute(
        "SELECT 1 FROM elo_history WHERE match_id=?", (m["id"],)
    ).fetchone()
    assert predictions.replay_unapplied_results(conn) == 0   # idempotent
