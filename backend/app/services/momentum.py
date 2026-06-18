"""In-match win-probability momentum — a transparent score/xG proxy.

This is NOT a trained live model. At each minute we take the score so far, add
the pre-match Poisson expectation for the minutes still to be played, and read
win/draw/loss off the same score matrix the pre-match prediction uses. A red card
dampens the sent-off side's remaining attack. Cumulative xG (third-party ESPN
display values) rides along so the chart can show territory as well as result.
Documented as a proxy on the methodology page — it does not feed any prediction.
"""
from ..model import poisson

GOAL_TYPES = {"goal", "penalty-goal", "own-goal"}
STEP = 5          # sample every 5 minutes of regulation
FULL = 90
RED_TILT = 0.75   # each sending-off scales that side's remaining xG expectation


def _winprob(hg: int, ag: int, rem_lam: float, rem_mu: float):
    """P(home/draw/away) given the current score plus remaining-goals expectation."""
    if rem_lam <= 0 and rem_mu <= 0:  # no time left: decided by the score on the board
        if hg > ag:
            return 1.0, 0.0, 0.0
        if hg < ag:
            return 0.0, 0.0, 1.0
        return 0.0, 1.0, 0.0
    m = poisson.score_matrix(rem_lam, rem_mu)  # P(additional home=i, away=j)
    ph = pd = pa = 0.0
    for i in range(m.shape[0]):
        for j in range(m.shape[1]):
            p = float(m[i, j])
            if hg + i > ag + j:
                ph += p
            elif hg + i < ag + j:
                pa += p
            else:
                pd += p
    return ph, pd, pa


def series(events, shots, home_id, away_id, lam, mu) -> list:
    """Per-minute win-probability + cumulative xG. Empty for unplayed matches."""
    if lam is None or mu is None or home_id is None:
        return []
    if not events and not shots:
        return []

    minutes = list(range(0, FULL + 1, STEP))
    out = []
    for t in minutes:
        hg = ag = reds_h = reds_a = 0
        for e in events:
            em = e["minute"]
            if em is None or em > t:
                continue
            if e["type"] in GOAL_TYPES:
                scored_home = e["team_id"] == home_id
                if e["type"] == "own-goal":  # credited to the opponent
                    scored_home = not scored_home
                hg, ag = (hg + 1, ag) if scored_home else (hg, ag + 1)
            elif e["type"] == "red-card":
                if e["team_id"] == home_id:
                    reds_h += 1
                else:
                    reds_a += 1
        xg_home = sum(
            s["xg"] or 0 for s in shots
            if s["minute"] is not None and s["minute"] <= t and s["team_id"] == home_id
        )
        xg_away = sum(
            s["xg"] or 0 for s in shots
            if s["minute"] is not None and s["minute"] <= t and s["team_id"] == away_id
        )
        frac = max(0.0, (FULL - t) / FULL)
        rem_lam = lam * frac * (RED_TILT ** reds_h)
        rem_mu = mu * frac * (RED_TILT ** reds_a)
        ph, pd, pa = _winprob(hg, ag, rem_lam, rem_mu)
        out.append({
            "minute": t,
            "p_home": round(ph, 3), "p_draw": round(pd, 3), "p_away": round(pa, 3),
            "xg_home": round(float(xg_home), 2), "xg_away": round(float(xg_away), 2),
            "home_goals": hg, "away_goals": ag,
        })
    return out
