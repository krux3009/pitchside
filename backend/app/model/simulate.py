"""Monte Carlo tournament simulation.

Replays the remaining schedule N times from the current state:
  - played matches enter every iteration as facts
  - unplayed group matches: scores sampled from the Elo->Poisson model
    (team ratings frozen at simulation time)
  - groups ranked with the exact 2026 tie-breakers; in simulations the
    fair-play criterion is unknowable and skipped, falling through to
    FIFA ranking (Elo order where FIFA rank is missing)
  - knockouts: 90' sample; if drawn, extra time at lambda/3; then a 50/50
    penalty shootout
Outputs per-team probabilities of reaching each round.
"""
from collections import defaultdict

import numpy as np

from . import bracket, poisson, tiebreakers

ROUNDS = ["p_r32", "p_r16", "p_qf", "p_sf", "p_final", "p_champion"]
STAGE_ROUND = {"R32": "p_r32", "R16": "p_r16", "QF": "p_qf", "SF": "p_sf", "FINAL": "p_final"}


def _load_state(conn) -> dict:
    teams = {t["id"]: t for t in conn.execute("SELECT * FROM teams").fetchall()}
    matches = conn.execute("SELECT * FROM matches ORDER BY id").fetchall()
    # FIFA-rank fallback: order by Elo where the real rank is missing
    by_elo = sorted(teams.values(), key=lambda t: -t["elo"])
    fifa_rank = {
        t["id"]: t["fifa_rank"] if t["fifa_rank"] is not None else 100 + i
        for i, t in enumerate(by_elo)
    }
    return {"teams": teams, "matches": matches, "fifa_rank": fifa_rank}


def _match_lambdas(m: dict, teams: dict, home_id: int, away_id: int) -> tuple[float, float]:
    from ..services.predictions import HOST_COUNTRY  # avoid circular import at module load

    home, away = teams[home_id], teams[away_id]
    home_ind = int(HOST_COUNTRY.get(home["fifa_code"]) == m["venue_country"])
    away_ind = int(HOST_COUNTRY.get(away["fifa_code"]) == m["venue_country"])
    return poisson.lambdas(home["elo"], away["elo"], home_ind, away_ind)


def run(conn, n: int = 10_000, seed: int | None = None) -> dict:
    """Simulate; returns {team_id: {p_win_group, p_r32, ..., p_champion}}."""
    rng = np.random.default_rng(seed)
    state = _load_state(conn)
    teams, matches, fifa_rank = state["teams"], state["matches"], state["fifa_rank"]

    group_matches = [m for m in matches if m["stage"] == "GROUP"]
    ko_matches = [m for m in matches if m["stage"] != "GROUP"]
    group_teams = defaultdict(list)
    for t in teams.values():
        group_teams[t["group_letter"]].append(t["id"])

    # pre-sample all unplayed group matches: (n, 2) score arrays
    pending = [m for m in group_matches if m["status"] != "FT"]
    samples = {}
    for m in pending:
        lam, mu = _match_lambdas(m, teams, m["home_team_id"], m["away_team_id"])
        samples[m["id"]] = np.column_stack(
            [rng.poisson(lam, n), rng.poisson(mu, n)]
        )
    played = [
        (m["home_team_id"], m["away_team_id"], m["home_goals_90"], m["away_goals_90"])
        for m in group_matches if m["status"] == "FT"
    ]
    r32_slots = {
        m["id"]: (m["home_slot"], m["away_slot"]) for m in ko_matches if m["stage"] == "R32"
    }
    later_ko = sorted(
        (m for m in ko_matches if m["stage"] != "R32"), key=lambda m: m["id"]
    )

    counts = defaultdict(lambda: defaultdict(int))

    def play_ko(m, home_id, away_id):
        """Returns (winner, loser). Real results are facts, not samples."""
        if m["status"] == "FT" and m["winner_team_id"] is not None:
            w = m["winner_team_id"]
            return w, (away_id if w == home_id else home_id)
        lam, mu = _match_lambdas(m, teams, home_id, away_id)
        hg, ag = rng.poisson(lam), rng.poisson(mu)
        if hg == ag:  # extra time at a third of the 90' rate
            hg += rng.poisson(lam / 3)
            ag += rng.poisson(mu / 3)
        if hg == ag:  # penalties: coin flip
            return (home_id, away_id) if rng.random() < 0.5 else (away_id, home_id)
        return (home_id, away_id) if hg > ag else (away_id, home_id)

    for i in range(n):
        results = played + [
            (m["home_team_id"], m["away_team_id"], int(samples[m["id"]][i, 0]),
             int(samples[m["id"]][i, 1]))
            for m in pending
        ]
        group_ranks, thirds = {}, []
        all_stats = {}
        for letter, ids in group_teams.items():
            ranked = tiebreakers.rank_group(ids, results, fifa_rank=fifa_rank)
            group_ranks[letter] = ranked
            counts[ranked[0]]["p_win_group"] += 1
            thirds.append((ranked[2], letter))
            all_stats.update(tiebreakers.table_stats(ids, results))

        thirds_ranked = tiebreakers.rank_thirds(
            [t for t, _ in thirds], all_stats, fifa_rank=fifa_rank
        )
        letter_of = dict(thirds)
        thirds_ranked = [(t, letter_of[t]) for t in thirds_ranked]

        r32_pairs = bracket.resolve_r32(group_ranks, thirds_ranked, r32_slots)
        # once real R32 pairings are known they override the simulated ones
        for m in ko_matches:
            if m["stage"] == "R32" and m["home_team_id"] is not None:
                r32_pairs[m["id"]] = (m["home_team_id"], m["away_team_id"])
        winners, losers = {}, {}
        for num, (h, a) in sorted(r32_pairs.items()):
            for tid in (h, a):
                counts[tid]["p_r32"] += 1
            m = next(km for km in ko_matches if km["id"] == num)
            winners[num], losers[num] = play_ko(m, h, a)

        for m in later_ko:
            def feed(slot):
                ref = int(slot[1:])
                return winners[ref] if slot[0] == "W" else losers[ref]

            h, a = feed(m["home_slot"]), feed(m["away_slot"])
            if m["stage"] in STAGE_ROUND:
                for tid in (h, a):
                    counts[tid][STAGE_ROUND[m["stage"]]] += 1
            w, l = play_ko(m, h, a)
            winners[m["id"]], losers[m["id"]] = w, l
            if m["stage"] == "FINAL":
                counts[w]["p_champion"] += 1

    return {
        tid: {k: counts[tid][k] / n for k in ["p_win_group", *ROUNDS]}
        for tid in teams
    }
