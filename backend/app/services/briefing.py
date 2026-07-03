"""Rule-based daily briefing composer. Deterministic templates, no LLM —
"auto-generated from match data" stays an honest claim.
"""
import json
from datetime import date, datetime, timedelta, timezone


def _team(conn, team_id):
    return conn.execute("SELECT * FROM teams WHERE id=?", (team_id,)).fetchone()


def _match_card(conn, m, prediction=True):
    home, away = _team(conn, m["home_team_id"]), _team(conn, m["away_team_id"])
    card = {
        "match_id": m["id"],
        "home": home["name"], "home_code": home["fifa_code"],
        "away": away["name"], "away_code": away["fifa_code"],
        "kickoff_utc": m["kickoff_utc"], "stage": m["stage"],
        "group": m["group_letter"], "venue": m["venue"],
        "status": m["status"],
        "score": [m["home_goals"], m["away_goals"]] if m["status"] != "SCHEDULED" else None,
    }
    if m["home_pens"] is not None and m["away_pens"] is not None:
        card["pens"] = [m["home_pens"], m["away_pens"]]
    if prediction:
        p = conn.execute("SELECT * FROM predictions WHERE match_id=?", (m["id"],)).fetchone()
        if p:
            card["p_home"], card["p_draw"], card["p_away"] = p["p_home"], p["p_draw"], p["p_away"]
            card["likely_score"] = p["likely_score"]
    return card


def _yesterday_results(conn, day: str) -> list:
    # most recent kickoff first, so the latest result leads the recap
    rows = conn.execute(
        "SELECT * FROM matches WHERE status='FT' AND date(kickoff_utc)=? ORDER BY kickoff_utc DESC",
        (day,),
    ).fetchall()
    out = []
    for m in rows:
        card = _match_card(conn, m)
        p = conn.execute("SELECT * FROM predictions WHERE match_id=?", (m["id"],)).fetchone()
        if p and m["winner_team_id"]:
            p_winner = p["p_home"] if m["winner_team_id"] == m["home_team_id"] else p["p_away"]
            if p_winner < 0.25:
                # structured, not a baked sentence — the frontend composes the
                # line in the visitor's language
                winner = _team(conn, m["winner_team_id"])
                card["upset"] = {
                    "winner": winner["name"],
                    "winner_code": winner["fifa_code"],
                    "p_winner": round(p_winner, 4),
                }
        out.append(card)
    return out


def _standouts(conn, day: str) -> list:
    rows = conn.execute(
        """SELECT p.name, t.name AS team, t.fifa_code AS team_code,
                  s.goals, s.assists
           FROM player_match_stats s
           JOIN players p ON p.id = s.player_id
           JOIN teams t ON t.id = s.team_id
           JOIN matches m ON m.id = s.match_id
           WHERE date(m.kickoff_utc)=? AND (s.goals + s.assists) >= 1
           ORDER BY (s.goals + s.assists) DESC, s.goals DESC LIMIT 5""",
        (day,),
    ).fetchall()
    return [{"player": r["name"], "team": r["team"], "team_code": r["team_code"],
             "goals": r["goals"], "assists": r["assists"]} for r in rows]


def _odds_movers(conn) -> list:
    runs = conn.execute(
        "SELECT DISTINCT run_id FROM sim_results ORDER BY run_id DESC LIMIT 2"
    ).fetchall()
    if len(runs) < 2:
        return []
    latest, previous = runs[0]["run_id"], runs[1]["run_id"]
    rows = conn.execute(
        """SELECT t.name, t.fifa_code AS code,
               a.p_champion - b.p_champion AS delta, a.p_champion
           FROM sim_results a JOIN sim_results b
             ON a.team_id = b.team_id AND a.run_id=? AND b.run_id=?
           JOIN teams t ON t.id = a.team_id
           ORDER BY ABS(delta) DESC LIMIT 3""",
        (latest, previous),
    ).fetchall()
    return [
        {"team": r["name"], "code": r["code"], "delta": round(r["delta"], 4),
         "p_champion": round(r["p_champion"], 4)}
        for r in rows if abs(r["delta"]) >= 0.005
    ]


def _injury_flags(conn) -> list:
    rows = conn.execute(
        """SELECT i.player_name, i.reason, i.status, t.name AS team,
                  t.fifa_code AS team_code
           FROM injuries i
           JOIN teams t ON t.id = i.team_id
           WHERE datetime(i.reported_at) >= datetime('now', '-1 day')
           ORDER BY i.reported_at DESC LIMIT 6"""
    ).fetchall()
    return rows


def rebuild(conn, for_date: str | None = None) -> dict:
    today = for_date or date.today().isoformat()
    yesterday = (date.fromisoformat(today) - timedelta(days=1)).isoformat()
    todays = conn.execute(
        "SELECT * FROM matches WHERE date(kickoff_utc)=? ORDER BY kickoff_utc", (today,)
    ).fetchall()
    content = {
        "date": today,
        "yesterday": _yesterday_results(conn, yesterday),
        "standouts": _standouts(conn, yesterday),
        "today": [_match_card(conn, m) for m in todays
                  if m["home_team_id"] and m["away_team_id"]],
        "injuries": _injury_flags(conn),
        "odds_movers": _odds_movers(conn),
    }
    conn.execute(
        "INSERT OR REPLACE INTO briefings (briefing_date, content_json, generated_at)"
        " VALUES (?,?,?)",
        (today, json.dumps(content),
         datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")),
    )
    conn.commit()
    return content
