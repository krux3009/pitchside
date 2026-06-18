"""Briefing content is structured data — sentences are composed client-side
so they can localize. No baked English strings may leak back in."""
import shutil
from datetime import date, timedelta
from pathlib import Path

import pytest

from app import db
from app.services import briefing

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"


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
