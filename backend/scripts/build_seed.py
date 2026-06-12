"""Build app/data/seed.db from free sources.

Inputs (downloaded fresh, falling back to scripts/cache/):
  - openfootball worldcup.json   -> 104 fixtures + any played results
  - openfootball groups.json     -> 48 teams in groups A..L
  - openfootball stadiums.json   -> ground -> country (drives host Elo bonus)
  - eloratings.net World.tsv     -> current Elo per team
  - eloratings.net en.teams.tsv  -> elo 2-letter code <-> names/aliases

Run:  .venv/bin/python scripts/build_seed.py
"""
import json
import re
import sqlite3
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CACHE = SCRIPT_DIR / "cache"
DATA = SCRIPT_DIR.parent / "app" / "data"
SCHEMA = SCRIPT_DIR.parent / "app" / "schema.sql"

SOURCES = {
    "of_worldcup.json": "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
    "of_groups.json": "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.groups.json",
    "of_stadiums.json": "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.stadiums.json",
    "elo_world.tsv": "https://www.eloratings.net/World.tsv",
    "elo_names.tsv": "https://www.eloratings.net/en.teams.tsv",
}

# FIFA trigram per openfootball team name (all 48 qualified teams).
FIFA_CODES = {
    "Mexico": "MEX", "South Africa": "RSA", "South Korea": "KOR", "Czech Republic": "CZE",
    "Canada": "CAN", "Bosnia & Herzegovina": "BIH", "Qatar": "QAT", "Switzerland": "SUI",
    "Brazil": "BRA", "Morocco": "MAR", "Haiti": "HAI", "Scotland": "SCO",
    "USA": "USA", "Paraguay": "PAR", "Australia": "AUS", "Turkey": "TUR",
    "Germany": "GER", "Curaçao": "CUW", "Ivory Coast": "CIV", "Ecuador": "ECU",
    "Netherlands": "NED", "Japan": "JPN", "Sweden": "SWE", "Tunisia": "TUN",
    "Belgium": "BEL", "Egypt": "EGY", "Iran": "IRN", "New Zealand": "NZL",
    "Spain": "ESP", "Cape Verde": "CPV", "Saudi Arabia": "KSA", "Uruguay": "URU",
    "France": "FRA", "Senegal": "SEN", "Iraq": "IRQ", "Norway": "NOR",
    "Argentina": "ARG", "Algeria": "ALG", "Austria": "AUT", "Jordan": "JOR",
    "Portugal": "POR", "DR Congo": "COD", "Uzbekistan": "UZB", "Colombia": "COL",
    "England": "ENG", "Croatia": "CRO", "Ghana": "GHA", "Panama": "PAN",
}

# openfootball name -> eloratings name, where aliases don't already cover it.
ELO_NAME_OVERRIDES = {
    "USA": "United States",
    "Czech Republic": "Czechia",
    "Bosnia & Herzegovina": "Bosnia and Herzegovina",
}

HOSTS = {"USA", "Mexico", "Canada"}
HOST_COUNTRY = {"USA": "us", "Mexico": "mx", "Canada": "ca"}

STAGES = {
    "Round of 32": "R32", "Round of 16": "R16", "Quarter-final": "QF",
    "Semi-final": "SF", "Match for third place": "THIRD", "Final": "FINAL",
}


def fetch(name: str) -> Path:
    path = CACHE / name
    try:
        urllib.request.urlretrieve(SOURCES[name], path)
        print(f"downloaded {name}")
    except Exception as e:  # offline / transient: fall back to cache
        if not path.exists():
            sys.exit(f"FATAL: cannot download {name} and no cache: {e}")
        print(f"using cached {name} ({e})")
    return path


def load_elo_codes(names_tsv: Path) -> dict:
    """Any name/alias (lowercased) -> elo 2-letter code."""
    lookup = {}
    for line in names_tsv.read_text().splitlines():
        fields = line.split("\t")
        if len(fields) < 2 or fields[0].endswith("_loc"):
            continue
        for alias in fields[1:]:
            lookup[alias.strip().lower()] = fields[0]
    return lookup


def load_elo_ratings(world_tsv: Path) -> dict:
    """elo code -> current rating. World.tsv: rank, rank, code, rating, ..."""
    ratings = {}
    for line in world_tsv.read_text().splitlines():
        fields = line.split("\t")
        if len(fields) > 3 and fields[2].isalpha():
            ratings[fields[2]] = float(fields[3])
    return ratings


def kickoff_to_utc(date_str: str, time_str: str) -> str:
    """'2026-06-11' + '13:00 UTC-6' -> '2026-06-11T19:00:00Z'"""
    m = re.match(r"(\d+):(\d+) UTC([+-]\d+)", time_str)
    hh, mm, offset = int(m.group(1)), int(m.group(2)), int(m.group(3))
    local = datetime.fromisoformat(date_str).replace(
        hour=hh, minute=mm, tzinfo=timezone(timedelta(hours=offset))
    )
    return local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    CACHE.mkdir(exist_ok=True)
    worldcup = json.loads(fetch("of_worldcup.json").read_text())
    groups = json.loads(fetch("of_groups.json").read_text())
    stadiums = json.loads(fetch("of_stadiums.json").read_text())["stadiums"]
    elo_codes = load_elo_codes(fetch("elo_names.tsv"))
    elo_ratings = load_elo_ratings(fetch("elo_world.tsv"))

    city_country = {s["city"]: s["cc"] for s in stadiums}

    # --- teams ---------------------------------------------------------------
    teams = []  # (id, name, fifa_code, elo_code, group, elo, is_host)
    team_id_by_name = {}
    for group in groups["groups"]:
        letter = group["name"][-1]
        for name in group["teams"]:
            elo_name = ELO_NAME_OVERRIDES.get(name, name)
            code = elo_codes.get(elo_name.lower())
            if code is None or code not in elo_ratings:
                sys.exit(f"FATAL: no Elo rating resolved for {name!r} (code={code})")
            tid = len(teams) + 1
            team_id_by_name[name] = tid
            teams.append((tid, name, FIFA_CODES[name], code, letter,
                          elo_ratings[code], int(name in HOSTS)))

    # --- matches -------------------------------------------------------------
    matches = []
    group_seq = 0
    for m in worldcup["matches"]:
        rnd = m["round"]
        if rnd.startswith("Matchday"):
            stage, group_letter = "GROUP", m["group"][-1]
            group_seq += 1
            num = group_seq          # group games: chronological file order 1..72
        else:
            stage, group_letter = STAGES[rnd], None
            num = m["num"]           # knockouts: official FIFA numbers 73..104
        ground = m["ground"]
        venue_country = city_country.get(ground)
        if venue_country is None:
            sys.exit(f"FATAL: ground {ground!r} not in stadiums file")
        home_id = team_id_by_name.get(m["team1"])   # None for 'W101' placeholders
        away_id = team_id_by_name.get(m["team2"])
        score = m.get("score", {}).get("ft")
        played = score is not None
        winner = None
        if played and score[0] != score[1]:
            winner = home_id if score[0] > score[1] else away_id
        matches.append((
            num, stage, group_letter, kickoff_to_utc(m["date"], m["time"]),
            ground, venue_country, home_id, away_id,
            "FT" if played else "SCHEDULED",
            score[0] if played else None, score[1] if played else None,
            score[0] if played else None, score[1] if played else None,  # *_90: group games have no ET
            winner,
        ))
    assert len(matches) == 104, f"expected 104 matches, got {len(matches)}"
    assert group_seq == 72, f"expected 72 group matches, got {group_seq}"

    # --- write ---------------------------------------------------------------
    DATA.mkdir(exist_ok=True)
    seed_path = DATA / "seed.db"
    seed_path.unlink(missing_ok=True)
    conn = sqlite3.connect(seed_path)
    conn.executescript(SCHEMA.read_text())
    conn.executemany(
        "INSERT INTO teams (id, name, fifa_code, elo_code, group_letter, elo, is_host)"
        " VALUES (?,?,?,?,?,?,?)", teams)
    conn.executemany(
        "INSERT INTO matches (id, stage, group_letter, kickoff_utc, venue, venue_country,"
        " home_team_id, away_team_id, status, home_goals, away_goals,"
        " home_goals_90, away_goals_90, winner_team_id)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", matches)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn.executemany("INSERT INTO meta (key, value) VALUES (?,?)", [
        ("seed_built_at", now),
        # World.tsv was snapshotted mid-update on matchday 1: it includes the
        # MEX-RSA result but possibly not KOR-CZE (~±15 Elo uncertainty, see
        # methodology). Our own Elo replay therefore starts at matchday 2.
        ("elo_seed_note", "eloratings.net World.tsv snapshot " + now),
        ("elo_replay_from_match", "3"),
    ])
    conn.commit()

    n_played = sum(1 for m in matches if m[8] == "FT")
    print(f"seed.db: {len(teams)} teams, {len(matches)} matches ({n_played} played)")
    top = sorted(teams, key=lambda t: -t[5])[:5]
    print("top Elo:", ", ".join(f"{t[1]} {t[5]:.0f}" for t in top))
    conn.close()


if __name__ == "__main__":
    main()
