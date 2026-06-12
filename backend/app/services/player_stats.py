"""Derived player metrics: tournament totals + team-goal share + form trend."""


def index(conn, team_id: int | None = None) -> list:
    where, args = "", []
    if team_id:
        where, args = "WHERE pt.team_id = ?", [team_id]
    rows = conn.execute(
        f"""SELECT pt.*, p.name, p.position, p.shirt_number, p.photo_url,
                  t.name AS team_name, t.fifa_code AS team_code,
                  (SELECT SUM(goals) FROM player_match_stats s WHERE s.team_id = pt.team_id)
                    AS team_goals
           FROM player_totals pt
           JOIN players p ON p.id = pt.player_id
           JOIN teams t ON t.id = pt.team_id
           {where}
           ORDER BY pt.goals DESC, pt.assists DESC, pt.minutes DESC""",
        args,
    ).fetchall()
    for r in rows:
        r["team_goal_share"] = (
            round(r["goals"] / r["team_goals"], 3) if r["team_goals"] else 0.0
        )
    return rows


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
