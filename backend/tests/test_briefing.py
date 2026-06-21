"""Briefing content is structured data — sentences are composed client-side
so they can localize. No baked English strings may leak back in."""
import json
import shutil
from datetime import date, timedelta
from pathlib import Path

import pytest

from app import db
from app.fetch import espn, refresh
from app.services import briefing

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"
SCHEMA = Path(__file__).resolve().parent.parent / "app" / "schema.sql"


@pytest.fixture()
def conn(tmp_path):
    path = tmp_path / "test.db"
    shutil.copy(SEED, path)
    c = db.connect(path)
    yield c
    c.close()


def test_briefing_emits_structured_fields_not_sentences(conn):
    match = conn.execute(
        "SELECT * FROM matches WHERE status='FT' AND winner_team_id IS NOT NULL"
        " ORDER BY kickoff_utc LIMIT 1").fetchone()
    day = match["kickoff_utc"][:10]
    winner_is_home = match["winner_team_id"] == match["home_team_id"]
    conn.execute(
        """INSERT OR REPLACE INTO predictions
           (match_id, p_home, p_draw, p_away) VALUES (?,?,?,?)""",
        (match["id"],
         0.2 if winner_is_home else 0.5,
         0.3,
         0.5 if winner_is_home else 0.2),
    )
    scorer = conn.execute(
        "SELECT id, team_id FROM players WHERE team_id=? LIMIT 1",
        (match["winner_team_id"],)).fetchone()
    conn.execute(
        """INSERT OR REPLACE INTO player_match_stats
           (match_id, player_id, team_id, started, minutes, goals, assists,
            yellow, red, shots, shots_on_target)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (match["id"], scorer["id"], scorer["team_id"], 1, 90, 2, 1, 0, 0, 5, 3),
    )
    conn.commit()

    next_day = (date.fromisoformat(day) + timedelta(days=1)).isoformat()
    content = briefing.rebuild(conn, for_date=next_day)

    card = next(c for c in content["yesterday"] if c["match_id"] == match["id"])
    assert "upset_note" not in card
    assert card["upset"]["winner_code"]
    assert 0 < card["upset"]["p_winner"] < 0.25

    standout = content["standouts"][0]
    assert "line" not in standout
    assert standout["goals"] == 2
    assert standout["assists"] == 1
    assert standout["team_code"]


def test_yesterday_results_most_recent_first(conn):
    """The recap leads with the latest kickoff, so a later game sits above an
    earlier one."""
    day = conn.execute(
        "SELECT date(kickoff_utc) d FROM matches WHERE home_team_id IS NOT NULL"
        " GROUP BY d HAVING COUNT(*) >= 2 ORDER BY d LIMIT 1"
    ).fetchone()["d"]
    conn.execute(
        "UPDATE matches SET status='FT', home_goals=1, away_goals=0,"
        " home_goals_90=1, away_goals_90=0, winner_team_id=home_team_id"
        " WHERE date(kickoff_utc)=?", (day,))
    conn.commit()
    next_day = (date.fromisoformat(day) + timedelta(days=1)).isoformat()
    content = briefing.rebuild(conn, for_date=next_day)
    ids = [c["match_id"] for c in content["yesterday"]]
    assert len(ids) >= 2
    kickoffs = [
        conn.execute("SELECT kickoff_utc FROM matches WHERE id=?", (i,)).fetchone()["kickoff_utc"]
        for i in ids
    ]
    assert kickoffs == sorted(kickoffs, reverse=True)


def test_briefing_no_upset_for_expected_results(conn):
    match = conn.execute(
        "SELECT * FROM matches WHERE status='FT' AND winner_team_id IS NOT NULL"
        " ORDER BY kickoff_utc LIMIT 1").fetchone()
    winner_is_home = match["winner_team_id"] == match["home_team_id"]
    conn.execute(
        "INSERT OR REPLACE INTO predictions (match_id, p_home, p_draw, p_away)"
        " VALUES (?,?,?,?)",
        (match["id"],
         0.6 if winner_is_home else 0.2,
         0.2,
         0.2 if winner_is_home else 0.6),
    )
    conn.commit()
    next_day = (date.fromisoformat(match["kickoff_utc"][:10]) + timedelta(days=1)).isoformat()
    content = briefing.rebuild(conn, for_date=next_day)
    card = next(c for c in content["yesterday"] if c["match_id"] == match["id"])
    assert "upset" not in card and "upset_note" not in card


def test_refresh_rebuilds_briefing_for_live_match(conn, monkeypatch):
    """A LIVE score change writes to `matches` but trips neither newly_finished nor
    a summary ingest, so the home read model would stay frozen on the pre-match card
    unless refresh.run rebuilds the briefing whenever a match is in play."""
    # isolate the live trigger: skip the model pass and force the "briefing already
    # exists for today" branch so only live_today can drive the rebuild
    conn.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ('latest_sim_run_id', 'x')")
    today = date.today().isoformat()
    match = conn.execute(
        "SELECT * FROM matches WHERE home_team_id IS NOT NULL"
        " AND away_team_id IS NOT NULL ORDER BY kickoff_utc LIMIT 1").fetchone()
    conn.execute(
        "UPDATE matches SET kickoff_utc=?, status='LIVE', home_goals=2, away_goals=1"
        " WHERE id=?", (today + "T18:00:00Z", match["id"]))
    # a stale briefing that still shows the match as a pre-match card
    conn.execute(
        "INSERT OR REPLACE INTO briefings (briefing_date, content_json, generated_at)"
        " VALUES (?,?,?)",
        (today, json.dumps({"date": today, "today": [{"match_id": match["id"],
         "status": "SCHEDULED", "score": None}], "yesterday": [], "standouts": [],
         "injuries": [], "odds_movers": []}), today))
    conn.commit()
    # no network in tests — every fetch yields nothing, so the live row in `matches`
    # is the only thing that can move the briefing
    for fn in ("scoreboard", "summary", "injuries", "plays"):
        monkeypatch.setattr(espn, fn, lambda *a, **k: None)

    refresh.run(conn)

    rebuilt = json.loads(conn.execute(
        "SELECT content_json FROM briefings WHERE briefing_date=?", (today,)
    ).fetchone()["content_json"])
    card = next(c for c in rebuilt["today"] if c["match_id"] == match["id"])
    assert card["status"] == "LIVE"
    assert card["score"] == [2, 1]


def test_refresh_pulls_live_lineups(conn, monkeypatch):
    """refresh.run re-pulls the summary for an in-play match so lineups land — the
    match page leaves the squad fallback — without tripping the FT one-shot marker."""
    conn.executescript(SCHEMA.read_text())  # seed.db omits runtime tables (lineups, events)
    conn.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ('latest_sim_run_id', 'x')")
    today = date.today().isoformat()
    mex = conn.execute("SELECT id FROM teams WHERE fifa_code='MEX'").fetchone()["id"]
    conn.execute("UPDATE teams SET espn_id='202' WHERE id=?", (mex,))
    striker = conn.execute(
        "SELECT id FROM players WHERE team_id=? ORDER BY shirt_number LIMIT 1", (mex,)
    ).fetchone()["id"]
    conn.execute("UPDATE players SET espn_id='AA' WHERE id=?", (striker,))
    match = conn.execute(
        "SELECT id FROM matches WHERE home_team_id IS NOT NULL"
        " AND away_team_id IS NOT NULL ORDER BY kickoff_utc LIMIT 1").fetchone()
    conn.execute(
        "UPDATE matches SET kickoff_utc=?, status='LIVE', espn_event_id='EV1',"
        " home_goals=0, away_goals=0 WHERE id=?", (today + "T18:00:00Z", match["id"]))
    conn.commit()

    roster_payload = {"rosters": [{"team": {"id": "202"}, "formation": "4-3-3",
        "roster": [{"athlete": {"id": "AA", "displayName": "Striker"}, "jersey": "9",
                    "starter": True, "position": {"abbreviation": "F"},
                    "formationPlace": "11", "stats": []}]}]}
    monkeypatch.setattr(espn, "scoreboard", lambda *a, **k: None)
    monkeypatch.setattr(espn, "injuries", lambda *a, **k: None)
    monkeypatch.setattr(espn, "plays", lambda *a, **k: None)
    monkeypatch.setattr(espn, "summary",
                        lambda _c, ev: roster_payload if ev == "EV1" else None)

    report = refresh.run(conn)

    assert report.get("live_summaries") == 1
    assert conn.execute(
        "SELECT 1 FROM lineups WHERE match_id=? AND team_id=?", (match["id"], mex)
    ).fetchone()
    # FT pass must still re-ingest later: no one-shot marker yet
    assert conn.execute(
        "SELECT 1 FROM meta WHERE key='ingested:espn_summary:' || ?", (match["id"],)
    ).fetchone() is None
