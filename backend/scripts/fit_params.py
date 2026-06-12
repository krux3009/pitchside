"""Fit the Elo->goals bridge (b0, b1, b_home) and Dixon-Coles rho.

Offline only (scipy/pandas). Pipeline:
  1. Replay World Football Elo over the full martj42 international results
     history (everyone starts at 1500, K by tournament importance), recording
     each side's pre-match rating.
  2. Select + weight training matches (see select_training_matches).
  3. Maximum-likelihood fit of the Poisson bridge, then rho on its residual
     low-score structure.
  4. Write app/data/params.json with fit metadata for the methodology page.

Run:  .venv/bin/python scripts/fit_params.py
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import minimize

SCRIPT_DIR = Path(__file__).resolve().parent
CACHE = SCRIPT_DIR / "cache"
PARAMS_OUT = SCRIPT_DIR.parent / "app" / "data" / "params.json"
RESULTS_URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"

sys.path.insert(0, str(SCRIPT_DIR.parent))
from app.model.elo import HOME_BONUS, update  # noqa: E402


def k_for(tournament: str) -> float:
    t = tournament.lower()
    if t == "fifa world cup":
        return 60
    if "qualification" in t:
        return 40
    if t == "friendly":
        return 20
    if any(name in t for name in (
        "uefa euro", "copa américa", "african cup", "africa cup",
        "afc asian cup", "gold cup", "confederations cup", "oceania nations cup",
    )):
        return 50
    return 30


def replay_elo(df: pd.DataFrame) -> pd.DataFrame:
    """Add pre-match Elo columns by replaying the whole history in date order."""
    ratings: dict[str, float] = {}
    elo_home, elo_away = [], []
    for row in df.itertuples():
        rh = ratings.get(row.home_team, 1500.0)
        ra = ratings.get(row.away_team, 1500.0)
        elo_home.append(rh)
        elo_away.append(ra)
        bonus = 0.0 if row.neutral else HOME_BONUS
        nh, na = update(rh, ra, row.home_score, row.away_score,
                        k=k_for(row.tournament), home_bonus=bonus)
        ratings[row.home_team] = nh
        ratings[row.away_team] = na
    df = df.copy()
    df["elo_home"] = elo_home
    df["elo_away"] = elo_away
    return df


def select_training_matches(df: pd.DataFrame) -> pd.DataFrame:
    """Choose which matches train the bridge, and how much each counts.

    Returns df with a 'weight' column. Policy decisions (era cutoff, whether
    friendlies count, recency half-life) live in constants at module top —
    see fit metadata in params.json for what was used.
    """
    # Policy chosen by Li Xuan: competitive matches only — friendlies are
    # noisy (weakened lineups), and 2015+ keeps the modern era. The slower
    # 3-year half-life compensates for the smaller sample.
    cutoff = "2015-01-01"
    include_friendlies = False
    half_life_years = 3.0

    out = df[df["date"] >= cutoff].copy()
    if not include_friendlies:
        out = out[out["tournament"].str.lower() != "friendly"]
    age_years = (out["date"].max() - out["date"]).dt.days / 365.25
    out["weight"] = 0.5 ** (age_years / half_life_years)
    out.attrs["policy"] = {
        "cutoff": cutoff,
        "include_friendlies": include_friendlies,
        "half_life_years": half_life_years,
    }
    return out


def fit_bridge(df: pd.DataFrame) -> dict:
    """Weighted Poisson MLE of b0, b1, b_home.

    Each match contributes two observations:
      home goals ~ Poisson(exp(b0 + b1*diff + b_home*home_ind))
      away goals ~ Poisson(exp(b0 - b1*diff))
    """
    diff = (df["elo_home"] - df["elo_away"]).to_numpy()
    home_ind = (~df["neutral"].to_numpy()).astype(float)
    w = df["weight"].to_numpy()

    x = np.concatenate([diff, -diff])
    h = np.concatenate([home_ind, np.zeros_like(home_ind)])
    goals = np.concatenate([df["home_score"].to_numpy(), df["away_score"].to_numpy()])
    weights = np.concatenate([w, w])

    def nll(theta):
        b0, b1, b_home = theta
        log_lam = b0 + b1 * x + b_home * h
        return -np.sum(weights * (goals * log_lam - np.exp(log_lam)))

    res = minimize(nll, x0=[0.1, 0.001, 0.25], method="Nelder-Mead",
                   options={"xatol": 1e-8, "fatol": 1e-6, "maxiter": 5000})
    assert res.success, res.message
    b0, b1, b_home = res.x
    return {"b0": float(b0), "b1": float(b1), "b_home": float(b_home)}


def fit_rho(df: pd.DataFrame, bridge: dict) -> float:
    """MLE of the Dixon-Coles low-score parameter given the fitted bridge."""
    diff = (df["elo_home"] - df["elo_away"]).to_numpy()
    home_ind = (~df["neutral"].to_numpy()).astype(float)
    lam = np.exp(bridge["b0"] + bridge["b1"] * diff + bridge["b_home"] * home_ind)
    mu = np.exp(bridge["b0"] - bridge["b1"] * diff)
    hg = df["home_score"].to_numpy()
    ag = df["away_score"].to_numpy()
    w = df["weight"].to_numpy()

    def tau(rho):
        t = np.ones_like(lam)
        t = np.where((hg == 0) & (ag == 0), 1 - lam * mu * rho, t)
        t = np.where((hg == 0) & (ag == 1), 1 + lam * rho, t)
        t = np.where((hg == 1) & (ag == 0), 1 + mu * rho, t)
        t = np.where((hg == 1) & (ag == 1), 1 - rho, t)
        return t

    def nll(rho_arr):
        t = tau(rho_arr[0])
        if (t <= 0).any():
            return np.inf
        return -np.sum(w * np.log(t))  # Poisson terms are constant in rho

    res = minimize(nll, x0=[-0.05], method="Nelder-Mead",
                   options={"xatol": 1e-8, "fatol": 1e-8})
    return float(res.x[0])


def main():
    CACHE.mkdir(exist_ok=True)
    csv_path = CACHE / "martj42_results.csv"
    try:
        urllib.request.urlretrieve(RESULTS_URL, csv_path)
        print("downloaded results.csv")
    except Exception as e:
        if not csv_path.exists():
            sys.exit(f"FATAL: no results.csv: {e}")
        print(f"using cached results.csv ({e})")

    df = pd.read_csv(csv_path, parse_dates=["date"])
    df = df.dropna(subset=["home_score", "away_score"])
    df["home_score"] = df["home_score"].astype(int)
    df["away_score"] = df["away_score"].astype(int)
    df = df.sort_values("date").reset_index(drop=True)
    print(f"{len(df)} completed matches through {df['date'].max().date()}")

    df = replay_elo(df)
    train = select_training_matches(df)
    print(f"training on {len(train)} matches "
          f"(effective n = {train['weight'].sum():.0f}) policy={train.attrs['policy']}")

    bridge = fit_bridge(train)
    rho = fit_rho(train, bridge)
    params = {
        **bridge,
        "rho": rho,
        "fit_meta": {
            "fitted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "n_matches": int(len(train)),
            "effective_n": float(round(train["weight"].sum(), 1)),
            "data_through": str(df["date"].max().date()),
            **train.attrs["policy"],
        },
    }
    PARAMS_OUT.write_text(json.dumps(params, indent=2))
    print(json.dumps(params, indent=2))

    # sanity: equal teams, neutral -> lambda each side; 200-Elo favourite
    lam_eq = np.exp(params["b0"])
    lam_fav = np.exp(params["b0"] + params["b1"] * 200)
    mu_dog = np.exp(params["b0"] - params["b1"] * 200)
    print(f"sanity: equal-teams lambda={lam_eq:.2f} each "
          f"(total {2*lam_eq:.2f}); +200 Elo -> {lam_fav:.2f} vs {mu_dog:.2f}")


if __name__ == "__main__":
    main()
