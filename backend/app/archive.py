"""Results archive: survives Render's ephemeral disk.

dump(conn)    -> JSON-able dict of everything ingested since the seed
restore(conn) -> re-applies the committed archive after a cold boot

The GitHub Actions nightly job curls /api/internal/archive and commits the
output to app/data/results_archive.json; the next deploy bakes it in.
"""
import json

from .config import DATA_DIR

ARCHIVE_PATH = DATA_DIR / "results_archive.json"

# tables fully reconstructable from the archive (seed covers the rest).
# market_odds/odds_event_map must be here: closing odds are NOT re-fetchable
# after kickoff on the free tier (historical odds = paid).
TABLES = ["players", "match_team_stats", "player_match_stats", "lineups",
          "match_events", "match_shots", "injuries", "market_odds",
          "odds_event_map"]

MATCH_FIELDS = [
    "id", "status", "home_goals", "away_goals", "home_goals_90", "away_goals_90",
    "home_pens", "away_pens", "winner_team_id", "home_team_id", "away_team_id",
    "espn_event_id", "af_fixture_id",
]


def dump(conn) -> dict:
    out = {"matches": [
        {k: m[k] for k in MATCH_FIELDS}
        for m in conn.execute("SELECT * FROM matches WHERE status != 'SCHEDULED'")
    ]}
    for table in TABLES:
        out[table] = conn.execute(f"SELECT * FROM {table}").fetchall()
    out["meta"] = conn.execute(
        "SELECT * FROM meta WHERE key LIKE 'ingested:%'"
    ).fetchall()
    out["team_ids"] = conn.execute(
        "SELECT id, af_id, espn_id FROM teams WHERE af_id IS NOT NULL OR espn_id IS NOT NULL"
    ).fetchall()
    return out


def restore(conn) -> int:
    """Apply the committed archive if present. Returns number of matches restored."""
    if not ARCHIVE_PATH.exists():
        return 0
    data = json.loads(ARCHIVE_PATH.read_text())
    for m in data.get("matches", []):
        sets = ", ".join(f"{k}=?" for k in MATCH_FIELDS if k != "id")
        conn.execute(
            f"UPDATE matches SET {sets} WHERE id=?",
            [m[k] for k in MATCH_FIELDS if k != "id"] + [m["id"]],
        )
    for table in TABLES:
        for row in data.get(table, []):
            cols = ", ".join(row)
            marks = ", ".join("?" for _ in row)
            if table == "players":
                # The archive owns runtime-learned facts (espn_id, photo_url)
                # and late squad additions; the seed owns everything else —
                # a blind REPLACE would wipe seed-baked ids/photos whenever
                # the committed archive predates the seed.
                conn.execute(
                    f"INSERT OR IGNORE INTO players ({cols}) VALUES ({marks})",
                    list(row.values()),
                )
                conn.execute(
                    "UPDATE players SET espn_id=COALESCE(espn_id, ?),"
                    " photo_url=COALESCE(photo_url, ?) WHERE id=?",
                    (row.get("espn_id"), row.get("photo_url"), row["id"]),
                )
                continue
            conn.execute(
                f"INSERT OR REPLACE INTO {table} ({cols}) VALUES ({marks})",
                list(row.values()),
            )
    for row in data.get("meta", []):
        conn.execute("INSERT OR REPLACE INTO meta (key, value) VALUES (?,?)",
                     (row["key"], row["value"]))
    for row in data.get("team_ids", []):
        conn.execute("UPDATE teams SET af_id=?, espn_id=? WHERE id=?",
                     (row["af_id"], row["espn_id"], row["id"]))
    conn.commit()
    return len(data.get("matches", []))
