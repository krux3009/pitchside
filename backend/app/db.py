"""SQLite helpers. The database is a rebuildable cache (see schema.sql header)."""
import shutil
import sqlite3
from pathlib import Path

from .config import BASE_DIR, DB_PATH, SEED_DB_PATH


def _dict_factory(cursor: sqlite3.Cursor, row: tuple) -> dict:
    return {col[0]: row[i] for i, col in enumerate(cursor.description)}


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    # default resolved at call time so tests can repoint DB_PATH
    conn = sqlite3.connect(db_path or DB_PATH)
    conn.row_factory = _dict_factory
    conn.execute("PRAGMA foreign_keys = ON")
    # the boot catch-up thread and a cron refresh can overlap briefly; wait for
    # the writer instead of raising "database is locked"
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def bootstrap(db_path: Path | None = None) -> sqlite3.Connection:
    """Create the runtime DB from the committed seed if absent, then apply schema."""
    db_path = db_path or DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if not db_path.exists() and SEED_DB_PATH.exists():
        shutil.copy(SEED_DB_PATH, db_path)
    conn = connect(db_path)
    schema = (BASE_DIR / "schema.sql").read_text()
    conn.executescript(schema)
    conn.commit()

    from . import archive  # late import: archive needs config, not vice versa

    archive.restore(conn)
    return conn
