"""Elo maintenance + match predictions.

Called by the refresh orchestrator after results are ingested:
    replay_unapplied_results(conn)   # roll team Elo forward
    recompute_predictions(conn)      # refresh every unplayed fixture
"""
import json
from datetime import datetime, timezone

from ..model import bracket, elo, poisson, tiebreakers

MODEL_VERSION = "elo-poisson-dc-1"

# Host fifa_code -> stadium country code used in matches.venue_country
HOST_COUNTRY = {"USA": "us", "MEX": "mx", "CAN": "ca"}


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _home_flags(match: dict, home: dict, away: dict) -> tuple[int, int]:
    """(home_ind, away_ind): which side, if either, plays in its own country."""
    vc = match["venue_country"]
    home_ind = int(HOST_COUNTRY.get(home["fifa_code"]) == vc)
    away_ind = int(HOST_COUNTRY.get(away["fifa_code"]) == vc)
    return home_ind, away_ind


def replay_unapplied_results(conn) -> int:
    """Apply Elo updates for FT matches not yet in elo_history, in match order.

    Starts at meta.elo_replay_from_match: the seed Elo snapshot already
    reflects earlier results (see build_seed.py).
    """
    start = int(conn.execute(
        "SELECT value FROM meta WHERE key='elo_replay_from_match'"
    ).fetchone()["value"])
    rows = conn.execute(
        """SELECT m.* FROM matches m
           WHERE m.status='FT' AND m.id >= ?
             AND m.home_goals_90 IS NOT NULL AND m.away_goals_90 IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM elo_history h
                             WHERE h.match_id = m.id AND h.team_id = m.home_team_id)
           ORDER BY m.id""",
        (start,),
    ).fetchall()
    applied = 0
    for m in rows:
        home = conn.execute("SELECT * FROM teams WHERE id=?", (m["home_team_id"],)).fetchone()
        away = conn.execute("SELECT * FROM teams WHERE id=?", (m["away_team_id"],)).fetchone()
        home_ind, away_ind = _home_flags(m, home, away)
        # update() adds the bonus to the home side of dr; a negative bonus
        # therefore awards it to the away side (away-listed host at home).
        bonus = elo.HOME_BONUS * (home_ind - away_ind)
        new_home, new_away = elo.update(
            home["elo"], away["elo"], m["home_goals_90"], m["away_goals_90"],
            k=elo.K_WORLD_CUP, home_bonus=bonus,
        )
        now = _now()
        conn.execute("UPDATE teams SET elo=? WHERE id=?", (new_home, home["id"]))
        conn.execute("UPDATE teams SET elo=? WHERE id=?", (new_away, away["id"]))
        conn.executemany(
            "INSERT OR REPLACE INTO elo_history (team_id, match_id, elo_after, recorded_at)"
            " VALUES (?,?,?,?)",
            [(home["id"], m["id"], new_home, now), (away["id"], m["id"], new_away, now)],
        )
        applied += 1
    conn.commit()
    return applied


def resolve_knockout(conn) -> int:
    """Persist resolved knockout teams into matches.home_team_id/away_team_id
    once their feeders are decided. Idempotent — only NULL slots are written, so
    re-running is a no-op. Returns the number of fixtures newly resolved.

    R32 fills once the whole group stage is FT (deterministic bracket from the
    final tables); R16+ fill from their W<n>/L<n> feeds as each match reaches FT.
    Fair play is skipped, so ties fall through to the Elo-based FIFA-rank
    fallback — the same documented approximation simulate.run uses.
    """
    matches = conn.execute("SELECT * FROM matches ORDER BY id").fetchall()
    teams = conn.execute("SELECT * FROM teams").fetchall()
    by_id = {m["id"]: m for m in matches}

    # FIFA-rank fallback by Elo, mirroring simulate._load_state.
    by_elo = sorted(teams, key=lambda t: -t["elo"])
    fifa_rank = {
        t["id"]: t["fifa_rank"] if t["fifa_rank"] is not None else 100 + i
        for i, t in enumerate(by_elo)
    }

    pairs = {}  # match_id -> (home_id, away_id) to write, NULL rows only

    # R32 from the final group tables (only once every group match is FT).
    group = [m for m in matches if m["stage"] == "GROUP"]
    if group and all(m["status"] == "FT" for m in group):
        results = [(m["home_team_id"], m["away_team_id"],
                    m["home_goals_90"], m["away_goals_90"]) for m in group]
        group_teams = {}
        for t in teams:
            group_teams.setdefault(t["group_letter"], []).append(t["id"])
        group_ranks, thirds, all_stats = {}, [], {}
        for letter, ids in group_teams.items():
            ranked = tiebreakers.rank_group(ids, results, fifa_rank=fifa_rank)
            group_ranks[letter] = ranked
            thirds.append((ranked[2], letter))
            all_stats.update(tiebreakers.table_stats(ids, results))
        letter_of = dict(thirds)
        thirds_ranked = [
            (t, letter_of[t]) for t in tiebreakers.rank_thirds(
                [t for t, _ in thirds], all_stats, fifa_rank=fifa_rank)
        ]
        r32_slots = {m["id"]: (m["home_slot"], m["away_slot"])
                     for m in matches if m["stage"] == "R32"}
        for num, (h, a) in bracket.resolve_r32(
                group_ranks, thirds_ranked, r32_slots).items():
            if by_id[num]["home_team_id"] is None:
                pairs[num] = (h, a)

    # R16+ feeds: W<n>/L<n>, resolvable once match n is FT.
    winners, losers = {}, {}
    for m in matches:
        if m["stage"] != "GROUP" and m["status"] == "FT" and m["winner_team_id"]:
            w = m["winner_team_id"]
            winners[m["id"]] = w
            losers[m["id"]] = (m["away_team_id"] if w == m["home_team_id"]
                               else m["home_team_id"])

    def feed(slot):
        table = winners if slot[0] == "W" else losers
        return table.get(int(slot[1:]))

    for m in matches:
        if m["stage"] in ("GROUP", "R32") or m["home_team_id"] is not None:
            continue
        h, a = feed(m["home_slot"]), feed(m["away_slot"])
        if h is not None and a is not None:
            pairs[m["id"]] = (h, a)

    for mid, (h, a) in pairs.items():
        conn.execute(
            "UPDATE matches SET home_team_id=?, away_team_id=? WHERE id=?", (h, a, mid)
        )
    conn.commit()
    return len(pairs)


def recompute_predictions(conn) -> int:
    """Refresh predictions for every unplayed match with both teams known."""
    rows = conn.execute(
        """SELECT * FROM matches
           WHERE status != 'FT' AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL
           ORDER BY id"""
    ).fetchall()
    for m in rows:
        home = conn.execute("SELECT * FROM teams WHERE id=?", (m["home_team_id"],)).fetchone()
        away = conn.execute("SELECT * FROM teams WHERE id=?", (m["away_team_id"],)).fetchone()
        home_ind, away_ind = _home_flags(m, home, away)
        lam, mu = poisson.lambdas(home["elo"], away["elo"], home_ind, away_ind)
        matrix = poisson.score_matrix(lam, mu)
        p_home, p_draw, p_away = poisson.wdl(matrix)
        conn.execute(
            """INSERT OR REPLACE INTO predictions
               (match_id, model_version, home_elo, away_elo, lambda_home, mu_away,
                p_home, p_draw, p_away, likely_score, score_matrix_json, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (m["id"], MODEL_VERSION, home["elo"], away["elo"], lam, mu,
             p_home, p_draw, p_away, poisson.most_likely(matrix),
             json.dumps([[round(x, 6) for x in row] for row in matrix.tolist()]), _now()),
        )
    conn.commit()
    return len(rows)
