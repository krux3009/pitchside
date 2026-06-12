"""Derived player metrics: tournament totals + team-goal share + form trend."""


def index(conn, team_id: int | None = None) -> list:
    """Every participating player; tournament stats zeroed until they play."""
    where, args = "", []
    if team_id:
        where, args = "WHERE p.team_id = ?", [team_id]
    rows = conn.execute(
        f"""SELECT p.id AS player_id, p.team_id, p.name, p.position,
                  p.shirt_number, p.date_of_birth, p.photo_url,
                  t.name AS team_name, t.fifa_code AS team_code,
                  COALESCE(pt.apps, 0) AS apps,
                  COALESCE(pt.minutes, 0) AS minutes,
                  COALESCE(pt.goals, 0) AS goals,
                  COALESCE(pt.assists, 0) AS assists,
                  COALESCE(pt.yellows, 0) AS yellows,
                  COALESCE(pt.reds, 0) AS reds,
                  pt.goals_per_90,
                  (SELECT SUM(goals) FROM player_match_stats s WHERE s.team_id = p.team_id)
                    AS team_goals
           FROM players p
           JOIN teams t ON t.id = p.team_id
           LEFT JOIN player_totals pt ON pt.player_id = p.id
           {where}
           ORDER BY COALESCE(pt.goals, 0) DESC, COALESCE(pt.assists, 0) DESC,
                    COALESCE(pt.minutes, 0) DESC, t.name, p.shirt_number""",
        args,
    ).fetchall()
    for r in rows:
        r["team_goal_share"] = (
            round(r["goals"] / r["team_goals"], 3) if r["team_goals"] else 0.0
        )
    return rows


POSITION_ORDER = {"GK": 0, "DF": 1, "MF": 2, "FW": 3}


def squad(conn, team_id: int) -> list:
    """Full seeded roster for one team, GK -> DF -> MF -> FW, number ascending."""
    rows = conn.execute(
        "SELECT id, name, position, shirt_number, date_of_birth FROM players"
        " WHERE team_id = ? ORDER BY shirt_number",
        (team_id,),
    ).fetchall()
    return sorted(rows, key=lambda r: (POSITION_ORDER.get(r["position"], 4),
                                       r["shirt_number"] or 99))


def detail(conn, player_id: int) -> dict | None:
    player = conn.execute(
        """SELECT p.*, t.name AS team_name, t.fifa_code AS team_code
           FROM players p JOIN teams t ON t.id = p.team_id WHERE p.id=?""",
        (player_id,),
    ).fetchone()
    if not player:
        return None
    totals = conn.execute(
        "SELECT * FROM player_totals WHERE player_id=?", (player_id,)
    ).fetchone()
    log = conn.execute(
        """SELECT s.*, m.kickoff_utc, m.stage,
                  th.fifa_code AS home_code, ta.fifa_code AS away_code,
                  m.home_goals, m.away_goals
           FROM player_match_stats s
           JOIN matches m ON m.id = s.match_id
           JOIN teams th ON th.id = m.home_team_id
           JOIN teams ta ON ta.id = m.away_team_id
           WHERE s.player_id=? ORDER BY m.kickoff_utc""",
        (player_id,),
    ).fetchall()
    team_goals = conn.execute(
        "SELECT SUM(goals) AS g FROM player_match_stats WHERE team_id=?",
        (player["team_id"],),
    ).fetchone()["g"]
    goals = totals["goals"] if totals else 0
    return {
        **player,
        "totals": dict(totals) if totals else None,
        "team_goal_share": round(goals / team_goals, 3) if team_goals else 0.0,
        "form": [ (r["goals"] or 0) + (r["assists"] or 0) for r in log[-5:] ],
        "match_log": log,
    }
