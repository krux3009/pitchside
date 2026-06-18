"""ESPN roster -> canonical squad-player reconciliation."""
import shutil
from pathlib import Path

import pytest

from app import db
from app.fetch.ingest import (
    _canonical_event_type,
    _normalize_name,
    _resolve_player,
    _shot_result,
    espn_events,
    espn_scoreboard,
    espn_shots,
)

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

    # marker written (drives refresh.run's one-shot backfill; archived via ingested:%)
    assert conn.execute(
        "SELECT 1 FROM meta WHERE key='ingested:events:v2:1'"
    ).fetchone()


def _play(pid, ptype, team_espn, athlete_espn, clock="20'", fx=85.0, fy=50.0, **extra):
    p = {
        "id": str(pid),
        "type": {"text": ptype},
        "team": {"$ref": f"http://x/seasons/2026/teams/{team_espn}?lang=en"},
        "participants": [{"athlete": {"$ref": f"http://x/seasons/2026/athletes/{athlete_espn}?lang=en"}}],
        "clock": {"displayValue": clock},
        "period": {"number": 1},
        "text": "Striker (Mexico) attempts a shot.",
        "contactType": {"text": "Right Foot"}, "shotInfo": {"text": "Regular Play"},
        "targetZone": {"text": "Low Left"},
        "expectedGoals": 0.2, "expectedGoalsOnTarget": 0.3,
        "goalPositionY": 48.0, "goalPositionZ": 10.0,
    }
    if fx is not None:
        p["fieldPositionX"], p["fieldPositionY"] = fx, fy
    p.update(extra)
    return p


def test_espn_shots_parses_filters_and_resolves(events_db):
    conn, mex, scorer, _ = events_db
    # real ESPN athlete refs are numeric (/athletes/45843); the fixture's 'AA'
    # placeholder wouldn't match the $ref id regex, so give the scorer a number.
    conn.execute("UPDATE players SET espn_id='45843' WHERE id=?", (scorer,))
    plays = [
        _play(1, "Goal", "202", "45843", fx=90.0, fy=50.0),
        _play(2, "Shot On Target", "202", "45843"),
        _play(3, "Shot Off Target", "202", "45843"),
        _play(4, "Shot Blocked", "202", "45843"),
        _play(5, "Save", "202", "45843"),                 # keeper-side dup -> dropped
        _play(6, "Assists Shot", "202", "45843"),          # assist marker -> dropped
        _play(7, "Goal", "202", "45843", shootout=True),   # shootout -> dropped
        _play(8, "Shot Off Target", "202", "45843", fx=None),  # no location -> dropped
    ]
    n = espn_shots(conn, 1, plays)
    assert n == 4

    rows = conn.execute("SELECT * FROM match_shots WHERE match_id=1 ORDER BY seq").fetchall()
    assert [r["result"] for r in rows] == ["goal", "saved", "off-target", "blocked"]
    goal = rows[0]
    assert goal["team_id"] == mex and goal["player_id"] == scorer
    assert goal["xg"] == 0.2 and goal["body_part"] == "Right Foot"
    # distance: shooter at x=90,y=50 -> (10% of 105m) = 10.5m to goal centre
    assert goal["distance"] == 10.5

    # marker set (one-shot backfill guard) + idempotent
    assert conn.execute("SELECT 1 FROM meta WHERE key='ingested:shots:v2:1'").fetchone()
    assert espn_shots(conn, 1, plays) == 4
    assert conn.execute("SELECT COUNT(*) AS n FROM match_shots WHERE match_id=1").fetchone()["n"] == 4


def test_goal_subtypes_classified_as_goals():
    """ESPN suffixes the technique onto the goal type ('goal---header'); these
    must fold back to a plain goal, while non-goal keyEvents are dropped."""
    def ev(slug, text="", scoring=False):
        return {"type": {"type": slug, "text": text}, "scoringPlay": scoring}

    assert _canonical_event_type(ev("goal", "Goal")) == "goal"
    assert _canonical_event_type(ev("goal---header", "Goal - Header", True)) == "goal"
    assert _canonical_event_type(ev("goal---volley", "Goal - Volley", True)) == "goal"
    assert _canonical_event_type(ev("own-goal", "Own Goal", True)) == "own-goal"
    assert _canonical_event_type(ev("penalty-goal", "Penalty - Scored", True)) == "penalty-goal"
    # scoringPlay alone carries a goal even when the slug is unexpected
    assert _canonical_event_type({"type": {}, "scoringPlay": True}) == "goal"
    # noise + non-goal highlights
    assert _canonical_event_type(ev("kickoff", "Kickoff")) is None
    assert _canonical_event_type(ev("yellow-card", "Yellow Card")) == "yellow-card"
    assert _canonical_event_type(ev("substitution", "Substitution")) == "substitution"


def test_shootout_conversions_dropped_from_timeline():
    """Shootout attempts carry scoringPlay metadata; counting them as timeline
    penalty-goals would inflate the match tally, so drop them like the shot
    importer drops p.get('shootout')."""
    made = {"type": {"type": "penalty-goal", "text": "Penalty - Scored"},
            "scoringPlay": True, "shootout": True}
    missed = {"type": {"type": "penalty-miss", "text": "Penalty - Missed"},
              "shootout": True}
    assert _canonical_event_type(made) is None
    assert _canonical_event_type(missed) is None


def test_shot_result_goal_variants_but_not_goal_kick():
    assert _shot_result("Goal") == "goal"
    assert _shot_result("Goal - Header") == "goal"
    assert _shot_result("Goal - Volley") == "goal"
    assert _shot_result("Goal - Penalty") == "goal"
    assert _shot_result("Goal Kick") is None          # restart, not a goal
    assert _shot_result("Shot On Target") == "saved"
    assert _shot_result("Shot Off Target") == "off-target"
    assert _shot_result("Shot Blocked") == "blocked"
    assert _shot_result("Foul") is None
    assert _shot_result(None) is None


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


# --- scoreboard winner resolution ---------------------------------------

def _competitor(home_away, team, score, winner=False):
    return {
        "homeAway": home_away,
        "score": str(score),
        "winner": winner,
        # a bogus espn id forces the fifa_code/name fallback in _team_by_espn
        "team": {"id": f"espn-{team['id']}", "abbreviation": team["fifa_code"],
                 "displayName": team["name"]},
    }


def _scoreboard(match, home, away, state, hs, as_, home_win=False, away_win=False):
    return {"events": [{
        "id": "EVT1",
        "date": match["kickoff_utc"],
        "competitions": [{
            "competitors": [
                _competitor("home", home, hs, home_win),
                _competitor("away", away, as_, away_win),
            ],
            "status": {"type": {"state": state}},
        }],
    }]}


@pytest.fixture()
def scoreboard_match(conn):
    """A seed match plus its two team rows, ready for a scoreboard update."""
    match = conn.execute(
        """SELECT * FROM matches
           WHERE home_team_id IS NOT NULL AND away_team_id IS NOT NULL LIMIT 1"""
    ).fetchone()
    home = conn.execute("SELECT * FROM teams WHERE id=?", (match["home_team_id"],)).fetchone()
    away = conn.execute("SELECT * FROM teams WHERE id=?", (match["away_team_id"],)).fetchone()
    return conn, match, home, away


def test_scoreboard_penalty_knockout_winner_from_flag(scoreboard_match):
    """A knockout level after 120' and decided on penalties carries equal scores,
    so winner can't come from the score — ESPN flags the advancing competitor,
    and that flag must populate winner_team_id instead of leaving it NULL."""
    conn, match, home, away = scoreboard_match
    espn_scoreboard(conn, _scoreboard(match, home, away, "post", 1, 1, away_win=True))
    row = conn.execute(
        "SELECT status, winner_team_id FROM matches WHERE id=?", (match["id"],)
    ).fetchone()
    assert row["status"] == "FT"
    assert row["winner_team_id"] == away["id"]   # not None despite the 1-1 draw


def test_scoreboard_decisive_score_still_wins_without_flag(scoreboard_match):
    """Group games don't carry the winner flag; the score decides as before."""
    conn, match, home, away = scoreboard_match
    espn_scoreboard(conn, _scoreboard(match, home, away, "post", 2, 0))
    row = conn.execute(
        "SELECT winner_team_id FROM matches WHERE id=?", (match["id"],)
    ).fetchone()
    assert row["winner_team_id"] == home["id"]
