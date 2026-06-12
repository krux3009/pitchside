"""ESPN athlete-stats payload -> player_career rows -> /api/players/{id} career."""
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import config, db
from app.fetch.careers import _map_roster, parse_stats_payload, store_career

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"
SCHEMA = Path(__file__).resolve().parent.parent / "app" / "schema.sql"

SEASON = {"year": 2019, "type": {"name": "2019-20 Eredivisie"}}
PAYLOAD = {
    "categories": [
        {
            "names": ["STRT", "FC", "FA", "YC", "RC", "G", "A", "SHOT", "SOG", "OF"],
            "statistics": [
                {"teamId": "139", "leagueSlug": "ned.1", "season": SEASON,
                 "stats": ["20", "10", "5", "3", "0", "2", "4", "15", "8", "1"]},
                {"teamId": "139", "leagueSlug": "ned.1",
                 "season": {"year": 2020, "type": {"name": "2020-21 Eredivisie"}},
                 "stats": ["28", "12", "9", "5", "1", "3", "6", "22", "11", "2"]},
            ],
        },
        {   # goalkeeping category merges into the same season rows
            "names": ["CS", "SV", "GA"],
            "statistics": [
                {"teamId": "139", "leagueSlug": "ned.1", "season": SEASON,
                 "stats": ["5", "40", "12"]},
            ],
        },
    ],
}


def _blank_copy(path):
    """Seed copy with career data stripped — the shipped seed carries the real
    fetched careers, and these tests need a known-empty starting state."""
    shutil.copy(SEED, path)
    c = db.connect(path)
    c.executescript(SCHEMA.read_text())
    c.execute("DELETE FROM player_career")
    c.execute("UPDATE players SET espn_id=NULL")
    c.commit()
    c.close()


@pytest.fixture()
def conn(tmp_path):
    path = tmp_path / "test.db"
    _blank_copy(path)
    c = db.connect(path)
    yield c
    c.close()


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    _blank_copy(path)
    monkeypatch.setattr(config, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_parse_merges_gk_category_into_season_row():
    rows = parse_stats_payload(PAYLOAD)
    assert len(rows) == 2
    row = rows[("139", "ned.1", 2019, "2019-20 Eredivisie")]
    assert row["starts"] == 20
    assert row["goals"] == 2
    assert row["assists"] == 4
    assert row["clean_sheets"] == 5          # merged from the GK category
    assert row["saves"] == 40
    second = rows[("139", "ned.1", 2020, "2020-21 Eredivisie")]
    assert "clean_sheets" not in second      # no GK row for that season


def test_store_classifies_club_senior_and_youth(conn):
    rows = {
        ("139", "ned.1", 2019, "2019-20 Eredivisie"): {"starts": 20, "goals": 2},
        ("203", "fifa.world", 2022, "Final"): {"starts": 4, "goals": 1},
        ("5172", "fifa.world.u20", 2017, "Final"): {"starts": 5, "goals": 2},
    }
    names = {"139": "Ajax Amsterdam", "203": "Mexico", "5172": "Mexico U20"}
    written = store_career(conn, 101, "203", rows, names)
    assert written == 3
    flags = {r["team_name"]: r["is_national"] for r in conn.execute(
        "SELECT team_name, is_national FROM player_career WHERE player_id=101")}
    assert flags == {"Ajax Amsterdam": 0, "Mexico": 1, "Mexico U20": 1}


def test_detail_aggregates_career_per_team(client, tmp_path):
    conn = db.connect(config.DB_PATH)
    rows = {
        ("139", "ned.1", 2019, "2019-20 Eredivisie"): {"starts": 20, "goals": 2},
        ("139", "ned.1", 2020, "2020-21 Eredivisie"): {"starts": 28, "goals": 3},
        ("139", "uefa.champions", 2020, "2020-21 Champions League"): {"starts": 6, "goals": 1},
        ("203", "fifa.world", 2022, "Final"): {"starts": 4, "goals": 1},
    }
    names = {"139": "Ajax Amsterdam", "203": "Mexico"}
    store_career(conn, 101, "203", rows, names)
    conn.commit()
    conn.close()

    career = client.get("/api/players/101").json()["career"]
    assert len(career) == 2
    club, national = career
    assert club["team_name"] == "Ajax Amsterdam"
    assert club["is_national"] == 0
    assert (club["from_year"], club["to_year"]) == (2019, 2020)
    assert club["starts"] == 54                  # league + cup summed
    assert club["goals"] == 6
    assert national["team_name"] == "Mexico"
    assert national["is_national"] == 1


def test_detail_career_empty_when_unfetched(client):
    body = client.get("/api/players/102").json()
    assert body["career"] == []


def test_store_excludes_live_world_cup_rows(conn):
    rows = {
        ("203", "fifa.world", 2026, "Group Stage"): {"starts": 1},
        ("203", "fifa.world", 2022, "Final"): {"starts": 4},
    }
    written = store_career(conn, 101, "203", rows, {"203": "Mexico"})
    assert written == 1                      # 2026 tournament is not "career"
    kept = conn.execute("SELECT season_year FROM player_career"
                        " WHERE player_id=101").fetchall()
    assert [r["season_year"] for r in kept] == [2022]


def test_map_roster_name_beats_wrong_espn_jersey(conn):
    """Real case (Paraguay): ESPN listed two #13s — 'Juan Cáceres' carried the
    jersey of our #13 'José Canale'. Name passes must win before jersey."""
    mexico = conn.execute("SELECT id FROM teams WHERE fifa_code='MEX'").fetchone()["id"]
    p13 = conn.execute("SELECT id, name FROM players WHERE team_id=? AND shirt_number=13",
                       (mexico,)).fetchone()
    p4 = conn.execute("SELECT id, name FROM players WHERE team_id=? AND shirt_number=4",
                      (mexico,)).fetchone()
    short_name = " ".join(p4["name"].split()[:1] + p4["name"].split()[-1:])
    athletes = [
        {"id": "111", "displayName": short_name, "jersey": "13"},      # wrong jersey
        {"id": "222", "displayName": p13["name"], "jersey": "7"},      # wrong jersey too
    ]
    assert _map_roster(conn, mexico, athletes) == 2
    ids = {r["id"]: r["espn_id"] for r in conn.execute(
        "SELECT id, espn_id FROM players WHERE id IN (?,?)", (p4["id"], p13["id"]))}
    assert ids[p13["id"]] == "222"           # exact name match
    assert ids[p4["id"]] == "111"            # token-subset match, jersey ignored
