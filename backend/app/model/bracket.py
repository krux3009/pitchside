"""Knockout slot resolution.

Slot grammar (stored on matches.home_slot/away_slot, sourced from openfootball,
which mirrors the official FIFA bracket):
    '1A'          group A winner
    '2B'          group B runner-up
    '3A/B/C/D/F'  a third-placed team from one of those groups
    'W73' / 'L101'  winner / loser of that match number

Third-place allocation: FIFA publishes a fixed table covering all 495
combinations of which 8 (of 12) thirds qualify. We reproduce it with a
deterministic backtracking assignment — slots in match order, better-ranked
thirds first — which always finds a valid assignment but may differ from
FIFA's exact slotting in some combinations (disclosed on the methodology page).
"""


def allocate_thirds(qualified: list[tuple], slots: dict) -> dict | None:
    """qualified: [(team_id, group_letter)] best-8 thirds in rank order.
    slots: {match_number: allowed_group_letters (set)}.
    Returns {match_number: team_id} or None if no valid assignment exists.
    """
    match_numbers = sorted(slots)

    def backtrack(i: int, used: set, assignment: dict):
        if i == len(match_numbers):
            return assignment
        num = match_numbers[i]
        for team_id, letter in qualified:
            if team_id not in used and letter in slots[num]:
                result = backtrack(i + 1, used | {team_id}, {**assignment, num: team_id})
                if result is not None:
                    return result
        return None

    return backtrack(0, set(), {})


def parse_third_slot(slot: str) -> set | None:
    """'3A/B/C/D/F' -> {'A','B','C','D','F'}; None if not a third-place slot."""
    if slot.startswith("3") and "/" in slot:
        return set(slot[1:].split("/"))
    return None


def resolve_r32(group_ranks: dict, thirds_ranked: list[tuple], r32_slots: dict) -> dict:
    """Fill the 16 R32 fixtures.

    group_ranks: {'A': [1st, 2nd, 3rd, 4th], ...} (team ids)
    thirds_ranked: [(team_id, group_letter)] all 12 thirds, best first
    r32_slots: {match_number: (home_slot, away_slot)}
    Returns {match_number: (home_team_id, away_team_id)}.
    """
    qualified = thirds_ranked[:8]
    third_slots = {
        num: groups
        for num, (h, a) in r32_slots.items()
        for groups in [parse_third_slot(a) or parse_third_slot(h)]
        if groups is not None
    }
    third_assignment = allocate_thirds(qualified, third_slots)
    assert third_assignment is not None, "no valid third-place assignment"

    def resolve(slot: str, num: int):
        groups = parse_third_slot(slot)
        if groups is not None:
            return third_assignment[num]
        pos, letter = int(slot[0]), slot[1]
        return group_ranks[letter][pos - 1]

    return {
        num: (resolve(h, num), resolve(a, num))
        for num, (h, a) in r32_slots.items()
    }
