"""Elo -> expected goals -> score probabilities.

Bridge (parameters fitted offline by scripts/fit_params.py):
    lambda_home = exp(b0 + b1 * elo_diff + b_home * home_ind)
    mu_away     = exp(b0 - b1 * elo_diff)

Score matrix: independent Poissons with the Dixon-Coles tau correction on
the four low-score cells (0,0), (0,1), (1,0), (1,1), then renormalised.

References: Maher (1982); Dixon & Coles (1997).
"""
import json
import math
from functools import lru_cache
from pathlib import Path

import numpy as np

PARAMS_PATH = Path(__file__).resolve().parent.parent / "data" / "params.json"

MAX_GOALS = 10  # matrix covers 0..10 goals per side


@lru_cache(maxsize=1)
def load_params() -> dict:
    return json.loads(PARAMS_PATH.read_text())


def lambdas(
    elo_home: float,
    elo_away: float,
    home_ind: int = 0,
    away_ind: int = 0,
    params: dict | None = None,
) -> tuple[float, float]:
    """Expected goals (lambda_home, mu_away).

    home_ind/away_ind: 1 when that side genuinely plays at home. At WC 2026
    every venue is in a host country, so the *away-listed* team can be the one
    at home (e.g. USA as team2 in Dallas) — hence two flags, never both 1.
    """
    p = params or load_params()
    diff = elo_home - elo_away
    lam = math.exp(p["b0"] + p["b1"] * diff + p["b_home"] * home_ind)
    mu = math.exp(p["b0"] - p["b1"] * diff + p["b_home"] * away_ind)
    return lam, mu


def score_matrix(
    lam: float, mu: float, rho: float | None = None, max_goals: int = MAX_GOALS
) -> np.ndarray:
    """P(home=i, away=j) for i,j in 0..max_goals, Dixon-Coles corrected."""
    if rho is None:
        rho = load_params()["rho"]
    # A zero rate makes np.log(lam) == -inf and 0*-inf == nan, poisoning every cell
    # (callers like momentum can pass a remaining rate that floors to 0). Clamp to a
    # tiny positive so the side collapses onto 0 goals instead of NaN.
    lam = max(lam, 1e-12)
    mu = max(mu, 1e-12)
    goals = np.arange(max_goals + 1)
    # Poisson pmf vectors via cumulative products (no scipy at runtime)
    log_fact = np.cumsum(np.log(np.maximum(goals, 1)))
    p_home = np.exp(goals * np.log(lam) - lam - log_fact)
    p_away = np.exp(goals * np.log(mu) - mu - log_fact)
    m = np.outer(p_home, p_away)

    m[0, 0] *= 1 - lam * mu * rho
    m[0, 1] *= 1 + lam * rho
    m[1, 0] *= 1 + mu * rho
    m[1, 1] *= 1 - rho

    return m / m.sum()


def wdl(m: np.ndarray) -> tuple[float, float, float]:
    """(p_home_win, p_draw, p_away_win) from a score matrix."""
    home = np.tril(m, -1).sum()  # i > j lives below the diagonal
    draw = np.trace(m)
    away = np.triu(m, 1).sum()
    return float(home), float(draw), float(away)


def most_likely(m: np.ndarray) -> str:
    i, j = np.unravel_index(np.argmax(m), m.shape)
    return f"{i}-{j}"
