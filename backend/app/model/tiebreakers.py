"""2026 World Cup group ranking and best-thirds ranking.

⚠ FIFA changed the order for 2026: overall goal difference comes BEFORE
head-to-head (pre-2026 tournaments did head-to-head first — don't copy old code).

Group ranking order:
  1. points  2. overall GD  3. overall goals scored
  4-6. points/GD/goals in matches among the still-tied teams (re-applied
       recursively to any subset that remains tied)
  7. fair-play score (yellow -1, indirect red -3, direct red -4,
     yellow + direct red -5; higher i.e. less negative is better)
  8. FIFA ranking (lower is better; replaced drawing of lots for 2026)

Best-8-thirds (across the 12 groups):
  points -> GD -> goals -> fair play -> FIFA ranking

Pure functions over plain data so the simulator can call them millions of
times and the test suite can construct scenarios directly.

Match tuple: (home_id, away_id, home_goals, away_goals) — 90-minute scores.
"""
from itertools import groupby


def table_stats(team_ids: list, results: list) -> dict:
    """Points/GD/GF per team over the given results."""
    stats = {t: {"pts": 0, "gd": 0, "gf": 0} for t in team_ids}
    for home, away, hg, ag in results:
        if home not in stats or away not in stats:
            continue
        stats[home]["gd"] += hg - ag
        stats[away]["gd"] += ag - hg
        stats[home]["gf"] += hg
        stats[away]["gf"] += ag
        if hg > ag:
            stats[home]["pts"] += 3
        elif hg < ag:
            stats[away]["pts"] += 3
        else:
            stats[home]["pts"] += 1
            stats[away]["pts"] += 1
    return stats


def _resolve_tied(tied: list, results: list, fair_play: dict, fifa_rank: dict) -> list:
    """Order a set of teams tied on overall pts/GD/GF (criteria 4-8)."""
    if len(tied) == 1:
        return tied
    h2h = table_stats(tied, results)  # restricted automatically by table_stats
    key = lambda t: (-h2h[t]["pts"], -h2h[t]["gd"], -h2h[t]["gf"])
    ordered = sorted(tied, key=key)
    # split into clusters still tied on the head-to-head criteria
    clusters = [list(g) for _, g in groupby(ordered, key=key)]

    out = []
    for c in clusters:
        if len(c) == len(tied):
            # head-to-head separated nothing: fall through to fair play / ranking
            out.extend(sorted(
                c, key=lambda t: (-fair_play.get(t, 0), fifa_rank.get(t, 999))))
        elif len(c) > 1:
            # FIFA: re-apply head-to-head exclusively among the remaining subset
            out.extend(_resolve_tied(c, results, fair_play, fifa_rank))
        else:
            out.extend(c)
    return out


def rank_group(
    team_ids: list, results: list, fair_play: dict | None = None,
    fifa_rank: dict | None = None,
) -> list:
    """Return team ids ranked 1st..4th under the 2026 rules."""
    fair_play = fair_play or {}
    fifa_rank = fifa_rank or {}
    stats = table_stats(team_ids, results)
    key = lambda t: (-stats[t]["pts"], -stats[t]["gd"], -stats[t]["gf"])
    ordered = sorted(team_ids, key=key)

    ranked = []
    for _, g in groupby(ordered, key=key):
        ranked.extend(_resolve_tied(list(g), results, fair_play, fifa_rank))
    return ranked


def rank_thirds(
    thirds: list, stats: dict, fair_play: dict | None = None,
    fifa_rank: dict | None = None,
) -> list:
    """Rank the 12 third-placed teams; the top 8 advance.

    stats: team_id -> {'pts','gd','gf'} from each team's own group.
    """
    fair_play = fair_play or {}
    fifa_rank = fifa_rank or {}
    return sorted(thirds, key=lambda t: (
        -stats[t]["pts"], -stats[t]["gd"], -stats[t]["gf"],
        -fair_play.get(t, 0), fifa_rank.get(t, 999),
    ))


def fair_play_score(yellows: int, indirect_reds: int, direct_reds: int,
                    yellow_plus_direct: int) -> int:
    """FIFA team-conduct points (all non-positive)."""
    return -(yellows * 1 + indirect_reds * 3 + direct_reds * 4 + yellow_plus_direct * 5)
