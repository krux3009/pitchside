"""The Odds API — real bookmaker odds for Gamba Mode. Free tier: 500 credits/mo.

    /sports/{sport}/events            FREE     fixture list (id, teams, kickoff)
    /sports/{sport}/odds              2 cr     bulk h2h+totals, all events, eu region
    /sports/{sport}/events/{id}/odds  1 cr     per-event btts (bulk endpoint can't)

Mirrors espn.py conventions: httpx, fetch_log rows (source 'odds_api'), None on
failure. Inert without ODDS_API_KEY — same pattern as empty FTP creds. Every
response's x-requests-remaining header lands in meta('odds_api:remaining') and
sweep() refuses to spend below ODDS_API_CREDIT_FLOOR, the hard monthly backstop.
"""
import statistics
import time
import unicodedata
from datetime import datetime, timedelta, timezone

import httpx

from ..config import ODDS_API_CREDIT_FLOOR, ODDS_API_KEY, ODDS_BTTS_WINDOW_HOURS

BASE = "https://api.the-odds-api.com/v4"
SPORT = "soccer_fifa_world_cup"
REGIONS = "eu"  # 1x credit multiplier
TIMEOUT = 25.0
KICKOFF_TOLERANCE_H = 3  # provider commence_time vs our kickoff_utc

# Provider names that don't normalize onto our teams.name (both sides pass
# through _norm before lookup).
ALIASES = {
    "korea republic": "south korea",
    "united states": "usa",
    "czechia": "czech republic",
    "turkiye": "turkey",
    "cote d ivoire": "ivory coast",
    "cabo verde": "cape verde",
    "ir iran": "iran",
    "congo dr": "dr congo",
    "democratic republic of the congo": "dr congo",
}


def enabled() -> bool:
    return bool(ODDS_API_KEY)


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _log(conn, endpoint: str, params: str, status: int):
    conn.execute(
        "INSERT INTO fetch_log (fetched_at, source, endpoint, params, status)"
        " VALUES (?,?,?,?,?)",
        (_now(), "odds_api", endpoint, params, status),
    )
    conn.commit()


def _get(conn, path: str, label: str, params: dict | None = None) -> list | dict | None:
    try:
        r = httpx.get(f"{BASE}/{path}",
                      params={"apiKey": ODDS_API_KEY, **(params or {})},
                      timeout=TIMEOUT)
        _log(conn, path, label, r.status_code)
        remaining = r.headers.get("x-requests-remaining")
        if remaining is not None:
            conn.execute(
                "INSERT OR REPLACE INTO meta (key, value)"
                " VALUES ('odds_api:remaining', ?)", (remaining,))
            conn.commit()
        r.raise_for_status()
        return r.json()
    except httpx.HTTPError:
        return None


def remaining_credits(conn) -> float | None:
    row = conn.execute(
        "SELECT value FROM meta WHERE key='odds_api:remaining'"
    ).fetchone()
    try:
        return float(row["value"]) if row else None
    except (TypeError, ValueError):
        return None


def _norm(name: str) -> str:
    """lowercase, strip accents, drop punctuation and 'and' so 'Côte d’Ivoire',
    'Bosnia and Herzegovina' etc. line up across providers. Punctuation becomes
    a token break (not deletion) so curly apostrophes still split words."""
    s = unicodedata.normalize("NFKD", name or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    tokens = [t for t in
              "".join(c if (c.isascii() and c.isalnum()) else " "
                      for c in s.lower()).split()
              if t != "and"]
    key = " ".join(tokens)
    return ALIASES.get(key, key)


def match_fixture(conn, event: dict) -> tuple[int, int] | None:
    """(match_id, swapped) for one provider event, or None. Candidate = an
    upcoming fixture with both teams resolved and kickoff within tolerance;
    names must then match in either orientation (swapped=1 when flipped)."""
    try:
        commence = datetime.fromisoformat(event["commence_time"].replace("Z", "+00:00"))
    except (KeyError, ValueError):
        return None
    lo = (commence - timedelta(hours=KICKOFF_TOLERANCE_H)).strftime("%Y-%m-%dT%H:%M:%SZ")
    hi = (commence + timedelta(hours=KICKOFF_TOLERANCE_H)).strftime("%Y-%m-%dT%H:%M:%SZ")
    candidates = conn.execute(
        """SELECT m.id, th.name AS home_name, ta.name AS away_name
           FROM matches m
           JOIN teams th ON th.id = m.home_team_id
           JOIN teams ta ON ta.id = m.away_team_id
           WHERE m.status = 'SCHEDULED' AND m.kickoff_utc BETWEEN ? AND ?""",
        (lo, hi),
    ).fetchall()
    ev_home, ev_away = _norm(event.get("home_team", "")), _norm(event.get("away_team", ""))
    for c in candidates:
        ours = (_norm(c["home_name"]), _norm(c["away_name"]))
        if (ev_home, ev_away) == ours:
            return c["id"], 0
        if (ev_away, ev_home) == ours:
            return c["id"], 1
    return None


def _consensus(bookmakers: list) -> dict:
    """{(market, outcome_name, line): {median, best, book, n}} across books."""
    prices = {}  # key -> [(price, book_title)]
    for book in bookmakers or []:
        title = book.get("title") or book.get("key", "?")
        for market in book.get("markets", []):
            for o in market.get("outcomes", []):
                if o.get("price") is None:
                    continue
                line = float(o.get("point") or 0)
                key = (market["key"], o["name"], line)
                prices.setdefault(key, []).append((float(o["price"]), title))
    out = {}
    for key, quotes in prices.items():
        best_price, best_book = max(quotes)
        out[key] = {
            "median": round(statistics.median(p for p, _ in quotes), 3),
            "best": best_price, "book": best_book, "n": len(quotes),
        }
    return out


def _selection(market: str, outcome_name: str, event: dict, swapped: int) -> str | None:
    if market == "h2h":
        if outcome_name == "Draw":
            return "draw"
        if outcome_name == event.get("home_team"):
            return "away" if swapped else "home"
        if outcome_name == event.get("away_team"):
            return "home" if swapped else "away"
        return None
    if market == "totals":
        return {"Over": "over", "Under": "under"}.get(outcome_name)
    if market == "btts":
        return {"Yes": "yes", "No": "no"}.get(outcome_name)
    return None


def _ingest(conn, match_id: int, event: dict, swapped: int,
            bookmakers: list, markets: tuple) -> int:
    """Replace match_id's rows for the given markets with fresh consensus rows.
    Totals keeps half-lines only — quarter/whole lines would need push/half-win
    settlement the fake-credit engine deliberately doesn't model."""
    rows = []
    fetched_at = _now()
    for (market, name, line), agg in _consensus(bookmakers).items():
        if market not in markets:
            continue
        if market == "totals" and (line * 2) % 2 != 1:
            continue
        sel = _selection(market, name, event, swapped)
        if sel is None:
            continue
        rows.append((match_id, market, sel, line if market == "totals" else 0,
                     agg["median"], agg["best"], agg["book"], agg["n"], fetched_at))
    if not rows:
        return 0
    conn.executemany(
        "DELETE FROM market_odds WHERE match_id=? AND market=?",
        [(match_id, mk) for mk in markets],
    )
    conn.executemany(
        """INSERT OR REPLACE INTO market_odds
           (match_id, market, selection, line, price_median, price_best,
            book_best, n_books, fetched_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        rows,
    )
    conn.commit()
    return len(rows)


def sweep(conn) -> dict:
    """One full odds pass: free event list -> fixture matching -> bulk
    h2h+totals (2 cr) -> per-event btts near kickoff (1 cr each)."""
    if not enabled():
        return {"skipped": "no api key"}
    remaining = remaining_credits(conn)
    if remaining is not None and remaining < ODDS_API_CREDIT_FLOOR:
        return {"skipped": "credit floor", "remaining": remaining}

    report = {"matched": 0, "bulk": 0, "btts_events": 0, "unmatched": []}

    events = _get(conn, f"sports/{SPORT}/events", "events")
    if events is None:
        return {**report, "error": "events fetch failed"}

    mapping = {}  # odds_event_id -> (match_id, swapped, event)
    for ev in events:
        found = match_fixture(conn, ev)
        if not found:
            report["unmatched"].append(
                f"{ev.get('home_team')} v {ev.get('away_team')}")
            continue
        match_id, swapped = found
        mapping[ev["id"]] = (match_id, swapped, ev)
        conn.execute(
            """INSERT OR REPLACE INTO odds_event_map
               (match_id, odds_event_id, home_name, away_name, swapped, matched_at)
               VALUES (?,?,?,?,?,?)""",
            (match_id, ev["id"], ev.get("home_team"), ev.get("away_team"),
             swapped, _now()),
        )
    conn.commit()
    report["matched"] = len(mapping)
    if not mapping:
        return {**report, "remaining": remaining_credits(conn)}

    bulk = _get(conn, f"sports/{SPORT}/odds", "bulk",
                {"regions": REGIONS, "markets": "h2h,totals",
                 "oddsFormat": "decimal"})
    for ev in bulk or []:
        hit = mapping.get(ev.get("id"))
        if hit:
            match_id, swapped, _ = hit
            report["bulk"] += _ingest(conn, match_id, ev, swapped,
                                      ev.get("bookmakers", []), ("h2h", "totals"))

    # btts: per-event endpoint only, so spend credits just on matches close to
    # kickoff; re-check the floor as the loop spends.
    horizon = (datetime.now(timezone.utc)
               + timedelta(hours=ODDS_BTTS_WINDOW_HOURS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    for eid, (match_id, swapped, ev) in mapping.items():
        kickoff = conn.execute(
            "SELECT kickoff_utc FROM matches WHERE id=?", (match_id,)
        ).fetchone()["kickoff_utc"]
        if not (_now() < kickoff <= horizon):
            continue
        left = remaining_credits(conn)
        if left is not None and left < ODDS_API_CREDIT_FLOOR:
            report["halted"] = "credit floor"
            break
        payload = _get(conn, f"sports/{SPORT}/events/{eid}/odds", f"btts:{match_id}",
                       {"regions": REGIONS, "markets": "btts",
                        "oddsFormat": "decimal"})
        if payload:
            report["btts_events"] += bool(
                _ingest(conn, match_id, ev, swapped,
                        payload.get("bookmakers", []), ("btts",)))
        time.sleep(1.0)

    report["remaining"] = remaining_credits(conn)
    if not report["unmatched"]:
        report.pop("unmatched")
    return report
