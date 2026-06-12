"""SQLite helpers. The database is a rebuildable cache (see schema.sql header)."""
import shutil
import sqlite3
from pathlib import Path

from .config import BASE_DIR, DB_PATH, SEED_DB_PATH


def _dict_factory(cursor: sqlite3.Cursor, row: tuple) -> dict:
    return {col[0]: row[i] for i, col in enumerate(cursor.description)}


def connect(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = _dict_factory
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def bootstrap(db_path: Path = DB_PATH) -> sqlite3.Connection:
    """Create the runtime DB from the committed seed if absent, then apply schema."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if not db_path.exists() and SEED_DB_PATH.exists():
        shutil.copy(SEED_DB_PATH, db_path)
    conn = connect(db_path)
    schema = (BASE_DIR / "schema.sql").read_text()
    conn.executescript(schema)
    conn.commit()
    return conn
