"""ESPN roster -> canonical squad-player reconciliation."""
import shutil
from pathlib import Path

import pytest

from app import db
from app.fetch.ingest import _normalize_name, _resolve_player, espn_events

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"
SCHEMA = Path(__file__).resolve().parent.parent / "app" / "schema.sql"


@pytest.fixture()
def conn(tmp_path):
    path = tmp_path / "test.db"
    shutil.copy(SEED, path)
    c = db.connect(path)
    # the shipped seed has espn_ids baked in by scripts/fetch_careers.py;
    # these tests exercise first-sight reconciliation, so start unmapped
    c.execute("UPDATE players SET espn_id=NULL")
    c.commit()
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


# --- timeline events ----------------------------------------------------

def _ev(etype, team_espn, clock, parts=(), text=""):
    return {
        "type": {"type": etype},
        "team": {"id": team_espn},
        "clock": {"displayValue": clock, "value": _CLOCK_SECONDS.get(clock, 0.0)},
        "participants": [{"athlete": {"id": a, "displayName": n}} for a, n in parts],
        "shortText": text,
    }


_CLOCK_SECONDS = {"17'": 999.0, "30'": 1800.0, "60'": 3600.0}


@pytest.fixture()
def events_db(conn):
    """conn fixture + the match_events table, with MEX wired to ESPN ids so the
    event participants resolve to canonical player ids."""
    conn.executescript(SCHEMA.read_text())  # create match_events (IF NOT EXISTS)
    mex = conn.execute("SELECT id FROM teams WHERE fifa_code='MEX'").fetchone()["id"]
    conn.execute("UPDATE teams SET espn_id='202' WHERE id=?", (mex,))
    rows = conn.execute(
        "SELECT id FROM players WHERE team_id=? ORDER BY shirt_number LIMIT 2", (mex,)
    ).fetchall()
    scorer, assister = rows[0]["id"], rows[1]["id"]
    conn.execute("UPDATE players SET espn_id='AA' WHERE id=?", (scorer,))
    conn.execute("UPDATE players SET espn_id='BB' WHERE id=?", (assister,))
    conn.commit()
    return conn, mex, scorer, assister


def test_espn_events_parses_and_filters(events_db):
    conn, mex, scorer, assister = events_db
    payload = {"keyEvents": [
        _ev("kickoff", "202", "", text="First Half begins."),           # dropped
        _ev("goal", "202", "17'", [("AA", "Striker"), ("BB", "Maker")], "Striker Goal"),
        _ev("yellow-card", "202", "30'", [("AA", "Striker")], "Booking"),
        _ev("substitution", "202", "60'", [("CC", "On"), ("BB", "Maker")], "Sub"),
    ]}
    n = espn_events(conn, 1, payload)
    assert n == 3  # kickoff filtered out

    rows = conn.execute(
        "SELECT * FROM match_events WHERE match_id=1 ORDER BY seq"
    ).fetchall()
    goal = rows[0]
    assert goal["type"] == "goal" and goal["team_id"] == mex
    assert goal["player_id"] == scorer and goal["assist_id"] == assister
    assert goal["clock"] == "17'"

    sub = rows[2]
    assert sub["type"] == "substitution"
    assert sub["player_id"] is None          # "CC" never seen -> unresolved id
    assert sub["player_name"] == "On"        # name always stored
    assert sub["assist_id"] == assister      # player coming off

    # idempotent: a re-ingest replaces rather than duplicates
    assert espn_events(conn, 1, payload) == 3
    assert conn.execute(
        "SELECT COUNT(*) AS n FROM match_events WHERE match_id=1"
    ).fetchone()["n"] == 3


def test_event_minute_from_clock(events_db):
    """minute is parsed from the board clock displayValue; stoppage time folds in
    by summing the numbers ('45'+1'' -> 46)."""
    conn, *_ = events_db
    payload = {"keyEvents": [
        _ev("goal", "202", "17'", [("AA", "Striker")], "Goal"),
        _ev("yellow-card", "202", "45'+1'", [("AA", "Striker")], "Booking"),
    ]}
    espn_events(conn, 1, payload)
    minutes = [r["minute"] for r in conn.execute(
        "SELECT minute FROM match_events WHERE match_id=1 ORDER BY seq"
    ).fetchall()]
    assert minutes == [17, 46]
