"""Elo maintenance + match predictions.

Called by the refresh orchestrator after results are ingested:
    replay_unapplied_results(conn)   # roll team Elo forward
    recompute_predictions(conn)      # refresh every unplayed fixture
"""
import json
from datetime import datetime, timezone

from ..model import elo, poisson

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
