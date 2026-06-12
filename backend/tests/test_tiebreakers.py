"""Constructed group scenarios for the 2026 tie-breaking rules.

Teams are strings for readability. Matches: (home, away, home_goals, away_goals).
"""
from app.model.tiebreakers import fair_play_score, rank_group, rank_thirds, table_stats

T = ["A", "B", "C", "D"]


def round_robin(scores: dict) -> list:
    """scores: {('A','B'): (2,1), ...} -> match list"""
    return [(h, a, s[0], s[1]) for (h, a), s in scores.items()]


def test_1_clean_points_separation():
    # A beats everyone, B beats C and D, C beats D
    results = round_robin({
        ("A", "B"): (1, 0), ("A", "C"): (1, 0), ("A", "D"): (1, 0),
        ("B", "C"): (1, 0), ("B", "D"): (1, 0), ("C", "D"): (1, 0),
    })
    assert rank_group(T, results) == ["A", "B", "C", "D"]


def test_2_tied_points_overall_gd_decides():
    # A and B both 6 pts; A's wins are bigger -> better overall GD
    results = round_robin({
        ("A", "C"): (4, 0), ("A", "D"): (3, 0), ("B", "A"): (1, 0),
        ("B", "C"): (1, 0), ("C", "D"): (0, 0), ("B", "D"): (0, 1),
    })
    # pts: A 6 (won C,D; lost B), B 6 (won A,C; lost D), D 4, C 1
    # GD: A +6, B +1 -> A above B DESPITE losing head-to-head (2026 order!)
    ranking = rank_group(T, results)
    assert ranking[0] == "A"
    assert ranking[1] == "B"


def test_3_gd_and_goals_tied_head_to_head_decides():
    # A and B: same pts, same GD, same GF; B beat A directly
    results = round_robin({
        ("A", "B"): (0, 1),  # B wins h2h
        ("A", "C"): (3, 0), ("A", "D"): (2, 1),
        ("B", "C"): (2, 0), ("B", "D"): (2, 1),
        ("C", "D"): (1, 1),
    })
    # A: pts 6, gf 5, ga 2 (gd +3) | B: pts 9... adjust: give A a win over C and D, B over C and D, both lose/win vs each other
    # recompute: A pts=6 (C,D), B pts=9 (A,C,D) -> not tied. Rebuild scenario:
    results = round_robin({
        ("A", "B"): (1, 2),  # B wins h2h
        ("A", "C"): (3, 0), ("A", "D"): (2, 0),
        ("B", "C"): (1, 0), ("B", "D"): (1, 0),
        ("C", "D"): (1, 1),
    })
    # A: pts 6, gd (1-2)+(3)+(2) = +4, gf 6 | B: pts 9 -> still not tied.
    # Final approach: make both lose once to others.
    results = round_robin({
        ("A", "B"): (0, 1),   # B beats A
        ("C", "A"): (0, 2), ("D", "A"): (1, 2),   # A wins both: pts 6
        ("C", "B"): (1, 0), ("D", "B"): (0, 2),   # B beats D, loses C: pts 6
        ("C", "D"): (0, 1),
    })
    # A: pts 6, gd +2 (=-1+2+1), gf 4 | B: pts 6, gd +2 (+1-1+2), gf 3
    # overall goals scored differs (4 vs 3) -> criterion 3 decides, A first
    stats = table_stats(T, results)
    assert stats["A"]["pts"] == stats["B"]["pts"]
    assert stats["A"]["gd"] == stats["B"]["gd"]
    assert stats["A"]["gf"] != stats["B"]["gf"]
    assert rank_group(T, results).index("A") < rank_group(T, results).index("B")

    # now equalise GF too -> head-to-head must decide, B above A
    results = round_robin({
        ("A", "B"): (0, 1),   # B beats A
        ("C", "A"): (0, 2), ("D", "A"): (1, 2),   # A: pts 6, gd +2, gf 4
        ("C", "B"): (2, 1), ("D", "B"): (0, 2),   # B: pts 6, gd +2... B gd = +1 -1 +2 = +2, gf = 1+1+2 = 4
        ("C", "D"): (0, 1),
    })
    stats = table_stats(T, results)
    assert (stats["A"]["pts"], stats["A"]["gd"], stats["A"]["gf"]) == \
           (stats["B"]["pts"], stats["B"]["gd"], stats["B"]["gf"])
    ranking = rank_group(T, results)
    assert ranking.index("B") < ranking.index("A")  # h2h: B beat A


def test_4_three_way_tie_recursive_head_to_head():
    # A, B, C tied overall; h2h subtable separates A, leaves B-C tied,
    # which must be re-resolved among themselves (B beat C).
    results = round_robin({
        ("A", "B"): (2, 0), ("B", "C"): (2, 0), ("C", "A"): (2, 0),  # cycle, all gd 0 in h2h
        ("A", "D"): (2, 0), ("B", "D"): (2, 0), ("C", "D"): (2, 0),
    })
    # all of A,B,C: pts 6, gd +2, gf 4 overall; h2h all pts 3, gd 0, gf 2 -> truly inseparable
    # fair play decides: give C fewer cards
    fair_play = {"A": -3, "B": -2, "C": 0, "D": 0}
    ranking = rank_group(T, results, fair_play=fair_play)
    assert ranking[:3] == ["C", "B", "A"]

    # the recursive trap: A,B,C tied overall (pts 6, gd +2, gf 4 each);
    # 3-team h2h leaves {A,C} tied above B (h2h gf 2 vs 1); the rule re-applies
    # head-to-head exclusively between A and C -> their direct match (C won)
    results = round_robin({
        ("A", "B"): (1, 0), ("B", "C"): (1, 0), ("C", "A"): (2, 1),
        ("A", "D"): (2, 0), ("B", "D"): (3, 1), ("C", "D"): (2, 0),
    })
    ranking = rank_group(T, results)
    assert ranking == ["C", "A", "B", "D"]


def test_5_fair_play_decides():
    results = round_robin({
        ("A", "B"): (1, 1), ("A", "C"): (1, 1), ("A", "D"): (1, 1),
        ("B", "C"): (1, 1), ("B", "D"): (1, 1), ("C", "D"): (1, 1),
    })
    # everyone identical; one team has yellow+direct red (-5), others worse/better
    fair_play = {"A": -5, "B": -1, "C": 0, "D": -3}
    assert rank_group(T, results, fair_play=fair_play) == ["C", "B", "D", "A"]


def test_6_fifa_ranking_last_resort():
    results = round_robin({
        ("A", "B"): (0, 0), ("A", "C"): (0, 0), ("A", "D"): (0, 0),
        ("B", "C"): (0, 0), ("B", "D"): (0, 0), ("C", "D"): (0, 0),
    })
    fifa_rank = {"A": 30, "B": 4, "C": 11, "D": 25}
    assert rank_group(T, results, fifa_rank=fifa_rank) == ["B", "C", "D", "A"]


def test_7_best_thirds_cut_hinges_on_fair_play():
    thirds = [f"T{i}" for i in range(12)]
    # T9..T11 clearly below the cut; T0..T6 clearly above
    stats = {t: {"pts": 1, "gd": -3, "gf": 1} for t in thirds}
    for i in range(7):
        stats[f"T{i}"] = {"pts": 4 + i, "gd": 0, "gf": 3}
    # T7 and T8 identical on stats, straddling 8th place; fair play decides
    stats["T7"] = stats["T8"] = {"pts": 3, "gd": -1, "gf": 2}
    fair_play = {"T7": -4, "T8": -1}
    fair_play.update({f"T{i}": 0 for i in range(7)})
    ranked = rank_thirds(thirds, stats, fair_play=fair_play)
    assert ranked.index("T8") < ranked.index("T7")
    assert "T8" in ranked[:8] and "T7" not in ranked[:8]


def test_8_fair_play_score_values():
    assert fair_play_score(0, 0, 0, 0) == 0
    assert fair_play_score(3, 0, 0, 0) == -3
    assert fair_play_score(1, 1, 0, 0) == -4
    assert fair_play_score(0, 0, 1, 0) == -4
    assert fair_play_score(0, 0, 0, 1) == -5
    assert fair_play_score(2, 1, 1, 1) == -14
