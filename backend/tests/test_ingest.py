"""ESPN roster -> canonical squad-player reconciliation."""
import shutil
from pathlib import Path

import pytest

from app import db
from app.fetch.ingest import _normalize_name, _resolve_player

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"


@pytest.fixture()
def conn(tmp_path):
    path = tmp_path / "test.db"
    shutil.copy(SEED, path)
    c = db.connect(path)
    yield c
    c.close()


def entry(espn_id, name, jersey):
    return {"athlete": {"id": espn_id, "displayName": name}, "jersey": jersey,
            "position": {"abbreviation": "G"}}


def test_normalize_name():
    assert _normalize_name("Julián Quiñones") == "julian quinones"
    assert _normalize_name("  Matěj KOVÁŘ ") == "matej kovar"


def test_resolve_by_jersey_then_by_known_espn_id(conn):
    mexico = conn.execute("SELECT id FROM teams WHERE fifa_code='MEX'").fetchone()["id"]
    seeded = conn.execute(
        "SELECT id, name FROM players WHERE team_id=? AND shirt_number=1", (mexico,)
    ).fetchone()

    pid = _resolve_player(conn, mexico, entry("999001", "Totally Different Name", "1"))
    assert pid == seeded["id"]                       # jersey match wins
    stored = conn.execute("SELECT espn_id FROM players WHERE id=?", (pid,)).fetchone()
    assert stored["espn_id"] == "999001"             # espn_id learned

    # second sighting resolves via espn_id even with a different jersey
    pid2 = _resolve_player(conn, mexico, entry("999001", "Whoever", "13"))
    assert pid2 == seeded["id"]

    n = conn.execute(
        "SELECT COUNT(*) AS n FROM players WHERE team_id=?", (mexico,)
    ).fetchone()["n"]
    assert n == 26                                   # no duplicate created


def test_resolve_by_name_when_jersey_missing(conn):
    mexico = conn.execute("SELECT id FROM teams WHERE fifa_code='MEX'").fetchone()["id"]
    seeded = conn.execute(
        "SELECT id, name FROM players WHERE team_id=? AND shirt_number=2", (mexico,)
    ).fetchone()
    pid = _resolve_player(conn, mexico, entry("999002", seeded["name"].upper(), None))
    assert pid == seeded["id"]


def test_unknown_player_inserted_without_collision(conn):
    mexico = conn.execute("SELECT id FROM teams WHERE fifa_code='MEX'").fetchone()["id"]
    before = conn.execute("SELECT COUNT(*) AS n FROM players").fetchone()["n"]
    pid = _resolve_player(conn, mexico, entry("424242", "Late Replacement", "99"))
    assert pid == 424242 + 100_000                   # outside canonical id range
    after = conn.execute("SELECT COUNT(*) AS n FROM players").fetchone()["n"]
    assert after == before + 1
