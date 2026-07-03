"""The live-window signal that drives the in-app fast-refresh loop."""
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app import db
from app.fetch import refresh

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"


@pytest.fixture()
def conn(tmp_path):
    path = tmp_path / "test.db"
    shutil.copy(SEED, path)
    c = db.connect(path)
    # a clean slate: no live matches, every kickoff far from now
    c.execute("UPDATE matches SET status='FT' WHERE status='LIVE'")
    c.commit()
    yield c
    c.close()


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def test_window_closed_when_nothing_is_on(conn):
    assert refresh.live_window_open(conn) is False


def test_window_open_while_a_match_is_live(conn):
    conn.execute("UPDATE matches SET status='LIVE' WHERE id=1")
    conn.commit()
    assert refresh.live_window_open(conn) is True


def test_window_opens_just_before_kickoff_and_closes_after_grace(conn):
    soon = _iso(datetime.now(timezone.utc) + timedelta(minutes=3))
    conn.execute(
        "UPDATE matches SET status='SCHEDULED', kickoff_utc=? WHERE id=1", (soon,)
    )
    conn.commit()
    assert refresh.live_window_open(conn) is True

    # a fixture stuck SCHEDULED long past kickoff is the stale-day pass's
    # problem, not the fast loop's
    long_ago = _iso(datetime.now(timezone.utc) - timedelta(hours=2))
    conn.execute("UPDATE matches SET kickoff_utc=? WHERE id=1", (long_ago,))
    conn.commit()
    assert refresh.live_window_open(conn) is False
