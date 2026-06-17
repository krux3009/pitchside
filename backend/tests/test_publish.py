import json
import shutil
from pathlib import Path

import pytest

from app import config, db

SEED = Path(__file__).resolve().parent.parent / "app" / "data" / "seed.db"


@pytest.fixture()
def seeded(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    shutil.copy(SEED, path)
    monkeypatch.setattr(config, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    return path


def test_snapshot_tree_and_bytes(seeded):
    from app import publish
    from app.routes import matches, players

    files = publish.snapshot("2026-06-17T03:30:00+00:00")

    # six fixed endpoints + CORS rule + freshness beacon
    for name in ("matches.json", "players.json", "standings.json",
                 "briefing-today.json", "sim-championship.json",
                 "methodology-params.json", ".htaccess", "status.json"):
        assert name in files

    # one detail file per entity
    ms, ps = matches.list_matches(), players.list_players()
    assert sum(k.startswith("matches/") for k in files) == len(ms)
    assert sum(k.startswith("players/") for k in files) == len(ps)

    # byte-identical to build_static.py's serialization — this is what lets the
    # incremental upload skip unchanged files (same bytes -> same sha1).
    expect = json.dumps(ms, ensure_ascii=False, separators=(",", ":")).encode()
    assert files["matches.json"] == expect

    beacon = json.loads(files["status.json"])
    assert beacon["published_at"] == "2026-06-17T03:30:00+00:00"
    assert beacon["matches"] == len(ms)


def test_publish_inert_without_ftp_creds(seeded, monkeypatch):
    from app import publish

    # publish binds the cred values at import; blank them so run() short-circuits
    # instead of attempting a real FTP connection during the test.
    monkeypatch.setattr(publish, "HOSTINGER_FTP_HOST", "")
    monkeypatch.setattr(publish, "HOSTINGER_FTP_USER", "")
    monkeypatch.setattr(publish, "HOSTINGER_FTP_PASSWORD", "")

    assert publish.run("2026-06-17T03:30:00+00:00") == {"skipped": "no FTP creds"}
