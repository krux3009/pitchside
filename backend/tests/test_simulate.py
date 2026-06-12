import shutil
from pathlib import Path

import pytest

from app import db
from app.model import simulate

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"


@pytest.fixture()
def conn(tmp_path):
    path = tmp_path / "test.db"
    shutil.copy(SEED, path)
    c = db.connect(path)
    yield c
    c.close()


def test_deterministic_under_fixed_seed(conn):
    a = simulate.run(conn, n=200, seed=42)
    b = simulate.run(conn, n=200, seed=42)
    assert a == b


def test_probabilities_sane(conn):
    probs = simulate.run(conn, n=500, seed=7)
    assert len(probs) == 48
    total_champion = sum(p["p_champion"] for p in probs.values())
    assert total_champion == pytest.approx(1.0, abs=1e-9)
    # exactly 32 teams reach the R32 in every iteration
    assert sum(p["p_r32"] for p in probs.values()) == pytest.approx(32.0, abs=1e-9)
    for p in probs.values():
        # round-reach probabilities can only shrink deeper into the bracket
        assert p["p_r32"] >= p["p_r16"] >= p["p_qf"] >= p["p_sf"] >= p["p_final"] >= p["p_champion"]


def test_strong_teams_beat_weak_teams(conn):
    probs = simulate.run(conn, n=500, seed=7)
    elo = {t["id"]: (t["name"], t["elo"]) for t in conn.execute("SELECT * FROM teams")}
    by_name = {elo[tid][0]: p for tid, p in probs.items()}
    assert by_name["Spain"]["p_champion"] > by_name["Qatar"]["p_champion"]
    assert by_name["Argentina"]["p_r16"] > by_name["Haiti"]["p_r16"]


def test_played_match_is_fact(conn):
    # Mexico beat South Africa 2-0 (match 1, FT in the seed): in every
    # iteration that result must stand, so with only 1 game played Mexico
    # can never finish below South Africa on equal footing... weaker claim:
    # Mexico's p_win_group must exceed South Africa's.
    probs = simulate.run(conn, n=500, seed=7)
    name_to_id = {t["name"]: t["id"] for t in conn.execute("SELECT * FROM teams")}
    assert probs[name_to_id["Mexico"]]["p_win_group"] > \
        probs[name_to_id["South Africa"]]["p_win_group"]
