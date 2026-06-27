"""Fill players.photo_url in seed.db from API-Football squad photos.

One-off local job: 2 requests per team (team search + squad), ~96 total —
inside the 100/day free budget but above the refresh loop's soft cap, which
is raised here only because this ledger is local and single-purpose.

Matching is jersey-first (both sides carry official World Cup squad numbers)
with a surname sanity check; mismatches are reported, never guessed.

Run:  .venv/bin/python scripts/fetch_photos.py [--db PATH]
"""
import argparse
import sys
import time
import unicodedata
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app import db                      # noqa: E402
from app.fetch import api_football      # noqa: E402

# our team name -> API-Football search term, where they disagree
SEARCH_ALIASES = {
    "Bosnia & Herzegovina": "Bosnia",
    "Curaçao": "Curacao",
    "Czech Republic": "Czech",
    "DR Congo": "Congo DR",
}


def _normalize(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name or "")
    return "".join(c for c in decomposed if not unicodedata.combining(c)).casefold().strip()


def _surname_overlap(af_name: str, our_name: str) -> bool:
    """'C. Acevedo' vs 'Carlos Acevedo': every non-initial token must appear."""
    af_tokens = {t for t in _normalize(af_name).replace(".", " ").split() if len(t) > 2}
    our_tokens = set(_normalize(our_name).split())
    return bool(af_tokens) and af_tokens <= our_tokens


def _get(conn, endpoint: str, params: dict):
    """Budgeted request, throttled under the free plan's 10-req/min limit
    (429s don't consume the daily quota but they do waste a run)."""
    time.sleep(6.5)
    return api_football.get(conn, endpoint, params)


def find_national_team(conn, name: str) -> int | None:
    search = SEARCH_ALIASES.get(name, name)
    result = _get(conn, "teams", {"search": search})
    for entry in result or []:
        if entry["team"].get("national"):
            return entry["team"]["id"]
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=str(BACKEND / "app" / "data" / "seed.db"))
    args = parser.parse_args()
    conn = db.connect(Path(args.db))

    # local one-off ledger: the 80-cap exists to protect the always-on refresh
    # loop from ledger wipes. This ledger also logs 429 rejections, which the
    # real daily quota does not count (verify spend with the free /status
    # endpoint before running) — so the cap here is loose by design.
    api_football.API_FOOTBALL_DAILY_SOFT_CAP = 150

    teams = conn.execute("SELECT id, name, af_id FROM teams ORDER BY id").fetchall()
    photos = jersey_only = unmatched = 0
    for team in teams:
        done = conn.execute(
            "SELECT COUNT(*) AS n FROM players WHERE team_id=? AND photo_url IS NOT NULL",
            (team["id"],)).fetchone()["n"]
        if done >= 20:        # resume: this squad already photographed
            continue
        af_id = team["af_id"] or find_national_team(conn, team["name"])
        if not af_id:
            print(f"  NO AF TEAM: {team['name']}")
            continue
        conn.execute("UPDATE teams SET af_id=? WHERE id=?", (af_id, team["id"]))
        result = _get(conn, "players/squads", {"team": af_id})
        squad = (result or [{}])[0].get("players", [])
        if not squad:
            print(f"  NO SQUAD: {team['name']} (af {af_id})")
            continue
        ours = conn.execute(
            "SELECT id, name, shirt_number FROM players WHERE team_id=?",
            (team["id"],)).fetchall()
        by_number = {p["shirt_number"]: p for p in ours}
        for entry in squad:
            photo = entry.get("photo")
            if not photo:
                continue
            row = by_number.get(entry.get("number"))
            if row and _surname_overlap(entry.get("name", ""), row["name"]):
                photos += 1
            elif row:
                jersey_only += 1     # accept, but count: number is official
                print(f"  name mismatch (kept): {team['name']} #{entry.get('number')}"
                      f" AF '{entry.get('name')}' vs ours '{row['name']}'")
            else:
                unmatched += 1
                continue
            conn.execute("UPDATE players SET photo_url=? WHERE id=?",
                         (photo, row["id"]))
        conn.commit()
        print(f"{team['name']}: {len(squad)} squad entries processed")

    total = conn.execute(
        "SELECT COUNT(*) AS n FROM players WHERE photo_url IS NOT NULL").fetchone()["n"]
    print(f"done: {photos} surname-verified + {jersey_only} jersey-only photos,"
          f" {unmatched} squad entries unmatched · {total}/1245 players have a photo"
          f" · {api_football.requests_today(conn)} requests today")
    conn.close()


if __name__ == "__main__":
    main()
