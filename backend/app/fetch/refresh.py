"""The refresh orchestrator — single idempotent entry point, called by the
GitHub Actions cron via /api/internal/refresh.

Order of operations:
  1. ESPN scoreboards (free) for yesterday + today -> scores & status
  2. summaries for any FT match not yet ingested -> stats, lineups, players
  3. if anything changed: Elo replay -> predictions -> Monte Carlo -> briefing
"""
from datetime import date, datetime, timedelta, timezone

from ..model import simulate
from ..services import backtest, briefing, predictions
from . import espn, ingest


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _store_sim(conn, probs: dict, n: int) -> str:
    run_id = _now()
    conn.executemany(
        """INSERT OR REPLACE INTO sim_results
           (run_id, run_at, n_iterations, team_id, p_win_group,
            p_r32, p_r16, p_qf, p_sf, p_final, p_champion)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        [(run_id, run_id, n, tid, p["p_win_group"], p["p_r32"], p["p_r16"],
          p["p_qf"], p["p_sf"], p["p_final"], p["p_champion"])
         for tid, p in probs.items()],
    )
    conn.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES ('latest_sim_run_id', ?)",
        (run_id,),
    )
    conn.commit()
    return run_id


def run(conn, sim_iterations: int = 10_000) -> dict:
    report = {"scoreboards": 0, "summaries": 0, "newly_finished": [],
              "elo_applied": 0, "predictions": 0, "sim_run": None}

    today = date.today()
    newly_finished = []
    for d in (today - timedelta(days=1), today):
        payload = espn.scoreboard(conn, d.strftime("%Y%m%d"))
        if payload:
            report["scoreboards"] += 1
            newly_finished += ingest.espn_scoreboard(conn, payload)
    report["newly_finished"] = newly_finished

    # summaries for FT matches we haven't ingested yet (covers restarts too)
    pending = conn.execute(
        """SELECT m.id, m.espn_event_id FROM matches m
           WHERE m.status='FT' AND m.espn_event_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM meta
                             WHERE key = 'ingested:espn_summary:' || m.id)"""
    ).fetchall()
    for m in pending:
        payload = espn.summary(conn, m["espn_event_id"])
        if payload:
            ingest.espn_summary(conn, m["id"], payload)
            report["summaries"] += 1

    # live matches: re-pull the summary every cycle for lineups (else the match
    # page is stuck on the squad fallback once a game kicks off), plus live team/
    # player stats and the running event timeline. mark_done=False keeps the FT
    # pass's authoritative one-shot ingest intact. Deliberately NOT counted toward
    # needs_model_pass — a live match is not a result; Elo/predictions must not
    # replay on it. The briefing still refreshes via live_today below.
    live = conn.execute(
        "SELECT id, espn_event_id FROM matches"
        " WHERE status='LIVE' AND espn_event_id IS NOT NULL"
    ).fetchall()
    for m in live:
        payload = espn.summary(conn, m["espn_event_id"])
        if payload:
            ingest.espn_summary(conn, m["id"], payload, mark_done=False)
            report["live_summaries"] = report.get("live_summaries", 0) + 1

    # one-shot events backfill: FT matches that lack a current-version timeline.
    # Re-fetch each summary once to (re)populate events; ingest.espn_events writes
    # the 'ingested:events:v2' marker, so the set drains over a single cron cycle and
    # never re-fetches again. The v2 bump re-ingests matches stored by the earlier
    # parser that dropped technique-suffixed goals ('Goal - Header', etc.).
    backfill = conn.execute(
        """SELECT m.id, m.espn_event_id FROM matches m
           WHERE m.status='FT' AND m.espn_event_id IS NOT NULL
             AND EXISTS (SELECT 1 FROM meta
                         WHERE key = 'ingested:espn_summary:' || m.id)
             AND NOT EXISTS (SELECT 1 FROM meta
                             WHERE key = 'ingested:events:v2:' || m.id)"""
    ).fetchall()
    for m in backfill:
        payload = espn.summary(conn, m["espn_event_id"])
        if payload:
            ingest.espn_events(conn, m["id"], payload)
            report["events_backfilled"] = report.get("events_backfilled", 0) + 1

    # shot map: FT matches that lack a current-version shot set. Heavier than the
    # other passes (~5 core-feed pages each), so cap per cycle — the backlog drains
    # over a few crons; new matches (<=2/day) clear at once. The 'ingested:shots:v2'
    # marker (set by espn_shots) makes it one-shot; the v2 bump re-ingests matches
    # whose goals the earlier exact-match parser dropped.
    shots_pending = conn.execute(
        """SELECT m.id, m.espn_event_id FROM matches m
           WHERE m.status='FT' AND m.espn_event_id IS NOT NULL
             AND EXISTS (SELECT 1 FROM meta
                         WHERE key = 'ingested:espn_summary:' || m.id)
             AND NOT EXISTS (SELECT 1 FROM meta
                             WHERE key = 'ingested:shots:v2:' || m.id)
           LIMIT 5"""
    ).fetchall()
    for m in shots_pending:
        plays = espn.plays(conn, m["espn_event_id"])
        if plays:
            ingest.espn_shots(conn, m["id"], plays)
            report["shots_backfilled"] = report.get("shots_backfilled", 0) + 1

    # injuries: cheap, quota-free, but slow-moving — refresh twice a day
    last = conn.execute(
        "SELECT value FROM meta WHERE key='last_fetch:injuries'"
    ).fetchone()
    if not last or last["value"] < (
        datetime.now(timezone.utc) - timedelta(hours=12)
    ).strftime("%Y-%m-%dT%H:%M:%SZ"):
        payload = espn.injuries(conn)
        if payload is not None:
            report["injuries"] = ingest.espn_injuries(conn, payload)
            conn.execute(
                "INSERT OR REPLACE INTO meta (key, value) VALUES ('last_fetch:injuries', ?)",
                (_now(),),
            )
            conn.commit()

    # Fill knockout team ids whenever feeders are decided (group stage complete,
    # or a knockout reached FT). Cheap + idempotent, so run every cycle: the group
    # stage may have finished in an earlier cycle that had no new result THIS one,
    # leaving an unresolved R32 backlog the model pass must still pick up. Folded
    # into needs_model_pass so a fresh resolution triggers predictions + sim.
    report["knockout_resolved"] = predictions.resolve_knockout(conn)

    needs_model_pass = bool(
        newly_finished or report["summaries"] or report["knockout_resolved"]
    )
    no_sim_yet = conn.execute(
        "SELECT 1 FROM meta WHERE key='latest_sim_run_id'"
    ).fetchone() is None

    if needs_model_pass or no_sim_yet:
        report["elo_applied"] = predictions.replay_unapplied_results(conn)
        report["predictions"] = predictions.recompute_predictions(conn)
        probs = simulate.run(conn, n=sim_iterations)
        report["sim_run"] = _store_sim(conn, probs, sim_iterations)
        backtest.run(conn)

    # briefing regenerates daily, after any new result, and on every cycle while a
    # match is in play — a LIVE score change doesn't trip needs_model_pass (no FT,
    # no summary), so without this the home read model stays frozen at the pre-match
    # card until the first final. Rebuild is read-only SQL, cheap in the cron loop.
    live_today = conn.execute(
        "SELECT 1 FROM matches WHERE status='LIVE' AND date(kickoff_utc)=?",
        (today.isoformat(),),
    ).fetchone()
    existing = conn.execute(
        "SELECT 1 FROM briefings WHERE briefing_date=?", (today.isoformat(),)
    ).fetchone()
    if needs_model_pass or live_today or not existing:
        briefing.rebuild(conn, today.isoformat())
        report["briefing"] = today.isoformat()

    conn.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES ('last_refresh', ?)", (_now(),)
    )
    conn.commit()
    return report
