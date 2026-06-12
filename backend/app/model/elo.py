"""World Football Elo rating (eloratings.net formula).

R_new = R_old + K * G * (W - W_e)
W_e   = 1 / (10 ** (-dr / 400) + 1)

K by match importance (World Cup finals = 60). G rewards goal margin.
Home advantage: +100 added to the home side's rating inside dr only —
at this World Cup that means USA/Mexico/Canada playing in their own country.
"""

K_WORLD_CUP = 60
K_CONTINENTAL = 50
K_QUALIFIER = 40
K_OTHER = 30
K_FRIENDLY = 20

HOME_BONUS = 100


def expected(dr: float) -> float:
    """Expected score for the side whose rating advantage is dr."""
    return 1.0 / (10.0 ** (-dr / 400.0) + 1.0)


def g_factor(goal_diff: int) -> float:
    """Goal-difference multiplier: 1 (draw or 1-goal win), 1.5 (2), (11+N)/8 (N>=3)."""
    n = abs(goal_diff)
    if n <= 1:
        return 1.0
    if n == 2:
        return 1.5
    return (11 + n) / 8


def update(
    r_home: float,
    r_away: float,
    home_goals: int,
    away_goals: int,
    k: float = K_WORLD_CUP,
    home_bonus: float = 0.0,
) -> tuple[float, float]:
    """Return (new_home, new_away) after a match. Use 90-minute scores.

    home_bonus: pass HOME_BONUS when the home side genuinely plays at home
    (hosts in their own country), 0.0 for neutral venues.
    """
    if home_goals > away_goals:
        w = 1.0
    elif home_goals < away_goals:
        w = 0.0
    else:
        w = 0.5
    w_e = expected(r_home + home_bonus - r_away)
    delta = k * g_factor(home_goals - away_goals) * (w - w_e)
    return r_home + delta, r_away - delta
