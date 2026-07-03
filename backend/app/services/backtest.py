"""Self-grading: score frozen pre-match predictions against final results.

recompute_predictions() never touches FT matches, so each match's last stored
prediction is the pre-kickoff one — scoring it after the fact is honest.

Brier (multiclass): mean over matches of sum((p_k - o_k)^2), range 0..2.
Baselines: uniform (1/3 each) scores 0.667; lower is better.
"""
import json
import math
from datetime import datetime, timezone


def run(conn) -> dict | None:
    rows = conn.execute(
        """SELECT p.p_home, p.p_draw, p.p_away, m.home_goals_90, m.away_goals_90
           FROM predictions p JOIN matches m ON m.id = p.match_id
           WHERE m.status = 'FT'
             AND m.home_goals_90 IS NOT NULL AND m.away_goals_90 IS NOT NULL"""
    ).fetchall()
    if not rows:
        return None

    brier = logloss = brier_uniform = 0.0
    for r in rows:
        if r["home_goals_90"] > r["away_goals_90"]:
            outcome = (1, 0, 0)
        elif r["home_goals_90"] == r["away_goals_90"]:
            outcome = (0, 1, 0)
        else:
            outcome = (0, 0, 1)
        probs = (r["p_home"], r["p_draw"], r["p_away"])
        brier += sum((p - o) ** 2 for p, o in zip(probs, outcome))
        brier_uniform += sum((1 / 3 - o) ** 2 for o in outcome)
        p_true = max(sum(p * o for p, o in zip(probs, outcome)), 1e-12)
        logloss += -math.log(p_true)

    n = len(rows)
    score = {
        "n_matches": n,
        "brier": round(brier / n, 4),
        "brier_uniform_baseline": round(brier_uniform / n, 4),
        "log_loss": round(logloss / n, 4),
        "log_loss_uniform_baseline": round(math.log(3), 4),
        "scored_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    conn.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES ('backtest_score', ?)",
        (json.dumps(score),),
    )
    conn.commit()
    return score
