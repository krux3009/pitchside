"""Bulk-fetch pre-tournament career stats into seed.db.

One-off local job (ESPN is quota-free but this is ~10k requests — never run it
on Render or inside the matchday refresh). Re-runs resume: players already
marked in meta are skipped unless --fresh.

Run:  .venv/bin/python scripts/fetch_careers.py [--db PATH] [--workers 8] [--limit N]
"""
import argparse
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app import db                # noqa: E402
from app.fetch import careers     # noqa: E402


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=str(BACKEND / "app" / "data" / "seed.db"))
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--limit", type=int, help="only fetch the first N players (testing)")
    parser.add_argument("--fresh", action="store_true", help="refetch players already done")
    args = parser.parse_args()

    conn = db.connect(Path(args.db))
    conn.executescript((BACKEND / "app" / "schema.sql").read_text())

    print("discovering ESPN ids from squad rosters ...")
    teams, mapped = careers.discover_espn_ids(conn)
    with_id = conn.execute(
        "SELECT COUNT(*) AS n FROM players WHERE espn_id IS NOT NULL").fetchone()["n"]
    total = conn.execute("SELECT COUNT(*) AS n FROM players").fetchone()["n"]
    print(f"teams matched {teams}/48 · players newly mapped {mapped}"
          f" · {with_id}/{total} have an espn_id")

    done = set()
    if not args.fresh:
        done = {int(r["key"].split(":")[1]) for r in conn.execute(
            "SELECT key FROM meta WHERE key LIKE 'career_fetched:%'")}
    national = {t["id"]: t["espn_id"]
                for t in conn.execute("SELECT id, espn_id FROM teams")}
    todo = [p for p in conn.execute(
        "SELECT id, team_id, espn_id, name FROM players WHERE espn_id IS NOT NULL")
        if p["id"] not in done]
    if args.limit:
        todo = todo[:args.limit]
    print(f"{len(todo)} players to fetch")

    n_rows = n_requests = failures = 0
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(careers.fetch_career, p["espn_id"]): p for p in todo}
        for i, future in enumerate(as_completed(futures), 1):
            player = futures[future]
            try:
                rows, team_names, requests = future.result()
            except Exception as e:
                failures += 1
                print(f"  FAIL {player['name']} ({player['espn_id']}): {e}")
                continue
            n_requests += requests
            n_rows += careers.store_career(
                conn, player["id"], national.get(player["team_id"]), rows, team_names)
            now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            conn.execute("INSERT OR REPLACE INTO meta (key, value) VALUES (?,?)",
                         (f"career_fetched:{player['id']}", now))
            conn.commit()
            if i % 50 == 0 or i == len(todo):
                rate = i / (time.time() - started)
                print(f"  {i}/{len(todo)} players · {n_rows} rows"
                      f" · {n_requests} requests · {rate:.1f} players/s")

    seasons = conn.execute("SELECT COUNT(*) AS n FROM player_career").fetchone()["n"]
    covered = conn.execute(
        "SELECT COUNT(DISTINCT player_id) AS n FROM player_career").fetchone()["n"]
    print(f"done: {seasons} season rows across {covered} players"
          f" · {failures} failures (re-run to retry)")
    conn.close()


if __name__ == "__main__":
    main()
