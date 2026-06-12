import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import config, db

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    shutil.copy(SEED, path)
    monkeypatch.setattr(config, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["db_matches"] == 104


def test_matches_list_and_filters(client):
    assert len(client.get("/api/matches").json()) == 104
    group_a = client.get("/api/matches", params={"group": "a"}).json()
    assert all(m["group_letter"] == "A" for m in group_a)
    assert len(client.get("/api/matches", params={"stage": "R32"}).json()) == 16


def test_match_detail_shape(client):
    m = client.get("/api/matches/1").json()
    assert m["home_name"] == "Mexico"
    assert m["status"] == "FT"
    assert {"team_stats", "lineups", "prediction"} <= set(m)
    assert client.get("/api/matches/9999").status_code == 404


def test_standings_ranked(client):
    groups = client.get("/api/standings").json()
    assert len(groups) == 12
    table_a = groups[0]["table"]
    assert table_a[0]["name"] == "Mexico"  # won their opener 2-0
    assert table_a[0]["pts"] == 3


def test_players_empty_before_ingest(client):
    assert client.get("/api/players").json() == []
    assert client.get("/api/players/12345").status_code == 404


def test_sim_empty_before_first_run(client):
    assert client.get("/api/sim/championship").json()["run"] is None


def test_methodology_params(client):
    body = client.get("/api/methodology/params").json()
    assert "b1" in body["model"]
    assert body["elo"]["k_world_cup"] == 60


def test_refresh_requires_key(client):
    assert client.get("/api/internal/refresh").status_code == 403
    assert client.get("/api/internal/refresh", params={"key": "wrong"}).status_code == 403
