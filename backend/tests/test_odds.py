"""The Odds API client: name matching, consensus ingest, quota guards."""
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app import config, db
from app.fetch import odds_api

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    shutil.copy(SEED, path)
    monkeypatch.setattr(config, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    c = db.bootstrap(path)  # apply schema.sql -> market_odds/odds_event_map exist
    # Pin a deterministic upcoming fixture: bootstrap applies the committed
    # results archive, which advances the tournament past the seed, so force
    # match 3 (Czech Republic v South Africa) back to a known SCHEDULED state.
    c.execute(
        """UPDATE matches SET status='SCHEDULED',
           kickoff_utc='2026-06-18T16:00:00Z', home_goals=NULL, away_goals=NULL,
           home_goals_90=NULL, away_goals_90=NULL, winner_team_id=NULL
           WHERE id=3"""
    )
    c.commit()
    yield c
    c.close()


# ---- name normalization -----------------------------------------------------

def test_norm_strips_accents_punctuation_and_aliases():
    assert odds_api._norm("Côte d’Ivoire") == "ivory coast"
    assert odds_api._norm("Bosnia and Herzegovina") == \
        odds_api._norm("Bosnia & Herzegovina")
    assert odds_api._norm("Czechia") == "czech republic"
    assert odds_api._norm("Korea Republic") == "south korea"
    assert odds_api._norm("United States") == "usa"
    assert odds_api._norm("Netherlands") == "netherlands"  # 'and' inside a token survives


# ---- fixture matching -------------------------------------------------------

def kickoff_of(conn, match_id):
    return conn.execute(
        "SELECT kickoff_utc FROM matches WHERE id=?", (match_id,)
    ).fetchone()["kickoff_utc"]


def test_match_fixture_straight_swapped_and_miss(conn):
    # match 3: Czech Republic v South Africa, pinned SCHEDULED by the fixture
    ko = kickoff_of(conn, 3)
    straight = {"id": "e1", "commence_time": ko,
                "home_team": "Czechia", "away_team": "South Africa"}
    assert odds_api.match_fixture(conn, straight) == (3, 0)

    flipped = {"id": "e2", "commence_time": ko,
               "home_team": "South Africa", "away_team": "Czechia"}
    assert odds_api.match_fixture(conn, flipped) == (3, 1)

    far = datetime.fromisoformat(ko.replace("Z", "+00:00")) + timedelta(hours=6)
    off_window = {**straight, "commence_time": _iso(far)}
    assert odds_api.match_fixture(conn, off_window) is None

    unknown = {**straight, "home_team": "Atlantis", "away_team": "Mu"}
    assert odds_api.match_fixture(conn, unknown) is None


# ---- sweep with mock payloads ----------------------------------------------

BULK_BOOKS = [
    {"key": "bet365", "title": "Bet365", "markets": [
        {"key": "h2h", "outcomes": [
            {"name": "Czechia", "price": 2.1},
            {"name": "Draw", "price": 3.2},
            {"name": "South Africa", "price": 3.6}]},
        {"key": "totals", "outcomes": [
            {"name": "Over", "price": 1.95, "point": 2.5},
            {"name": "Under", "price": 1.90, "point": 2.5},
            {"name": "Over", "price": 3.00, "point": 2.25}]},  # quarter line -> dropped
    ]},
    {"key": "pinnacle", "title": "Pinnacle", "markets": [
        {"key": "h2h", "outcomes": [
            {"name": "Czechia", "price": 2.2},
            {"name": "Draw", "price": 3.1},
            {"name": "South Africa", "price": 3.5}]},
    ]},
]

BTTS_BOOKS = [
    {"key": "bet365", "title": "Bet365", "markets": [
        {"key": "btts", "outcomes": [
            {"name": "Yes", "price": 1.8},
            {"name": "No", "price": 1.95}]},
    ]},
]


@pytest.fixture()
def swept(conn, monkeypatch):
    """Run a full sweep against mock payloads, match 3 kicking off in 24h
    (inside the BTTS window)."""
    ko = _iso(datetime.now(timezone.utc) + timedelta(hours=24))
    conn.execute("UPDATE matches SET kickoff_utc=? WHERE id=3", (ko,))
    conn.commit()

    events = [
        {"id": "ev1", "commence_time": ko,
         "home_team": "Czechia", "away_team": "South Africa"},
        {"id": "evX", "commence_time": ko,
         "home_team": "Atlantis", "away_team": "Mu"},
    ]
    bulk = [{"id": "ev1", "home_team": "Czechia", "away_team": "South Africa",
             "bookmakers": BULK_BOOKS}]
    btts = {"id": "ev1", "home_team": "Czechia", "away_team": "South Africa",
            "bookmakers": BTTS_BOOKS}

    def fake_get(c, path, label, params=None):
        if path.endswith("/events"):
            return events
        if "/events/" in path:
            return btts
        return bulk

    monkeypatch.setattr(odds_api, "ODDS_API_KEY", "test-key")
    monkeypatch.setattr(odds_api, "_get", fake_get)
    monkeypatch.setattr(odds_api.time, "sleep", lambda s: None)
    return odds_api.sweep(conn)


def test_sweep_maps_ingests_and_reports(conn, swept):
    assert swept["matched"] == 1
    assert swept["unmatched"] == ["Atlantis v Mu"]
    assert swept["btts_events"] == 1

    m = conn.execute("SELECT * FROM odds_event_map WHERE match_id=3").fetchone()
    assert m["odds_event_id"] == "ev1" and m["swapped"] == 0

    rows = {(r["market"], r["selection"], r["line"]): r for r in conn.execute(
        "SELECT * FROM market_odds WHERE match_id=3").fetchall()}
    # h2h consensus across 2 books
    home = rows[("h2h", "home", 0)]
    assert home["price_median"] == pytest.approx(2.15)
    assert home["price_best"] == 2.2 and home["book_best"] == "Pinnacle"
    assert home["n_books"] == 2
    # totals kept the half-line, dropped the quarter-line
    assert ("totals", "over", 2.5) in rows
    assert not any(k[0] == "totals" and k[2] == 2.25 for k in rows)
    # btts from the per-event endpoint
    assert rows[("btts", "yes", 0)]["price_median"] == 1.8


def test_swapped_event_swaps_h2h_prices(conn, monkeypatch):
    ko = _iso(datetime.now(timezone.utc) + timedelta(hours=72))  # outside btts window
    conn.execute("UPDATE matches SET kickoff_utc=? WHERE id=3", (ko,))
    conn.commit()
    ev = {"id": "ev9", "commence_time": ko,
          "home_team": "South Africa", "away_team": "Czechia"}
    bulk = [{**ev, "bookmakers": [
        {"key": "b", "title": "B", "markets": [
            {"key": "h2h", "outcomes": [
                {"name": "South Africa", "price": 3.6},
                {"name": "Draw", "price": 3.2},
                {"name": "Czechia", "price": 2.1}]},
        ]}]}]

    def fake_get(c, path, label, params=None):
        return [ev] if path.endswith("/events") else bulk

    monkeypatch.setattr(odds_api, "ODDS_API_KEY", "test-key")
    monkeypatch.setattr(odds_api, "_get", fake_get)
    odds_api.sweep(conn)

    rows = {r["selection"]: r["price_median"] for r in conn.execute(
        "SELECT selection, price_median FROM market_odds WHERE match_id=3 AND market='h2h'"
    ).fetchall()}
    # provider's 'home' (South Africa) is OUR away side
    assert rows == {"home": 2.1, "draw": 3.2, "away": 3.6}
    assert conn.execute(
        "SELECT swapped FROM odds_event_map WHERE match_id=3"
    ).fetchone()["swapped"] == 1


# ---- guards -----------------------------------------------------------------

def test_sweep_inert_without_key(conn, monkeypatch):
    monkeypatch.setattr(odds_api, "ODDS_API_KEY", "")
    assert odds_api.sweep(conn) == {"skipped": "no api key"}


def test_sweep_halts_below_credit_floor(conn, monkeypatch):
    monkeypatch.setattr(odds_api, "ODDS_API_KEY", "test-key")
    conn.execute("INSERT OR REPLACE INTO meta (key, value)"
                 " VALUES ('odds_api:remaining', '10')")
    conn.commit()
    report = odds_api.sweep(conn)
    assert report["skipped"] == "credit floor"


# ---- /api/odds document -----------------------------------------------------

def test_odds_route_document(conn, swept):
    from app.routes import odds as odds_route

    doc = odds_route.list_odds()
    assert doc["margin"] == 0.05
    by_id = {m["match_id"]: m for m in doc["matches"]}
    assert all(m["status"] != "FT" for m in doc["matches"])

    m3 = by_id[3]
    assert m3["real"]["h2h"]["home"]["median"] == pytest.approx(2.15)
    assert m3["real"]["totals"][0]["line"] == 2.5
    assert m3["real"]["btts"]["yes"]["best"] == 1.8

    # knockout fixtures without resolved teams appear locked: model None
    unresolved = [m for m in doc["matches"] if m["home_id"] is None]
    assert unresolved and all(m["model"] is None for m in unresolved)
    # every match with a stored prediction carries the four model markets
    modeled = [m for m in doc["matches"] if m["model"]]
    for m in modeled[:3]:
        assert {"h2h", "totals", "btts", "correct_score"} == set(m["model"])
