import { Link } from "react-router-dom";

import Disclaimer from "../components/Disclaimer";
import { ColdStartLoader, ErrorState } from "../components/Loaders";
import MatchCard from "../components/MatchCard";
import TeamBadge from "../components/TeamBadge";
import { localDateHeading, localTime, pct } from "../lib/format";
import { teamColor } from "../lib/teamColors";
import { useApi } from "../lib/useApi";

export default function Home() {
  const briefing = useApi("/api/briefing/today");
  const sim = useApi("/api/sim/championship");

  if (briefing.loading) return <ColdStartLoader />;
  if (briefing.error) return <ErrorState error={briefing.error} />;
  const b = briefing.data;

  return (
    <>
      <h1 style={styles.h1}>Matchday Briefing</h1>
      <p style={{ color: "var(--text-low)", marginTop: -8 }}>
        {localDateHeading(b.date)} · auto-generated from match data
      </p>

      {b.yesterday.length > 0 && (
        <>
          <h2 className="section-title">Yesterday</h2>
          <div className="card">
            {b.yesterday.map((m) => (
              <div key={m.match_id} style={styles.resultRow}>
                <Link to={`/matches/${m.match_id}`} style={{ fontWeight: 600 }}>
                  <TeamBadge code={m.home_code} name={m.home} />{" "}
                  <span className="score">{m.score[0]} – {m.score[1]}</span>{" "}
                  <TeamBadge code={m.away_code} name={m.away} />
                </Link>
                {m.upset_note && <div style={styles.upset}>⚡ {m.upset_note}</div>}
              </div>
            ))}
            {b.standouts.length > 0 && (
              <div style={styles.standouts}>
                {b.standouts.map((s, i) => (
                  <span key={i} style={styles.standout}>
                    ⭐ {s.player} ({s.team}) — {s.line}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <h2 className="section-title">Today</h2>
      {b.today.length === 0 && (
        <p style={{ color: "var(--text-mid)" }}>No matches today.</p>
      )}
      <div style={styles.todayGrid}>
        {b.today.map((m) => (
          <MatchCard
            key={m.match_id}
            m={{
              id: m.match_id, stage: m.stage, group_letter: m.group,
              kickoff_utc: m.kickoff_utc, status: m.status,
              home_name: m.home, home_code: m.home_code,
              away_name: m.away, away_code: m.away_code,
              home_goals: m.score?.[0], away_goals: m.score?.[1],
              p_home: m.p_home, p_draw: m.p_draw, p_away: m.p_away,
            }}
          />
        ))}
      </div>

      {b.injuries.length > 0 && (
        <>
          <h2 className="section-title">Availability Watch</h2>
          <div className="card">
            {b.injuries.map((inj, i) => (
              <div key={i} style={{ fontSize: 14, padding: "4px 0" }}>
                🚑 <strong>{inj.player_name}</strong> ({inj.team}) — {inj.reason}{" "}
                <span style={{ color: "var(--text-low)" }}>{inj.status}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Who wins the World Cup?</h2>
      <div className="card">
        {sim.loading && <p style={{ color: "var(--text-mid)" }}>Crunching simulations…</p>}
        {sim.data?.teams && (
          <>
            <p style={{ color: "var(--text-low)", fontSize: 12, marginTop: 0 }}>
              {Number(sim.data.run.n_iterations).toLocaleString()} Monte Carlo simulations
              of the remaining tournament ·{" "}
              <Link to="/methodology" style={{ color: "var(--gold)" }}>how this works</Link>
            </p>
            {sim.data.teams.slice(0, 12).map((t) => (
              <div key={t.team_id} style={styles.oddsRow}>
                <span style={styles.oddsTeam}>
                  <TeamBadge code={t.fifa_code} name={t.name} />
                </span>
                <div style={styles.oddsTrack}>
                  <div
                    style={{
                      width: `${Math.max(t.p_champion * 100 * 2.5, 1)}%`,
                      background: teamColor(t.fifa_code),
                      boxShadow: `0 0 10px color-mix(in srgb, ${teamColor(t.fifa_code)} 50%, transparent)`,
                      height: 10,
                      borderRadius: 5,
                    }}
                  />
                </div>
                <span className="mono-num" style={styles.oddsPct}>{pct(t.p_champion)}</span>
              </div>
            ))}
          </>
        )}
        <Disclaimer />
      </div>

      {b.odds_movers.length > 0 && (
        <>
          <h2 className="section-title">Odds Movers</h2>
          <div className="card" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {b.odds_movers.map((mv, i) => (
              <span key={i} style={{ fontSize: 14 }}>
                {mv.delta > 0 ? "📈" : "📉"} <strong>{mv.team}</strong>{" "}
                <span className="mono-num" style={{ color: mv.delta > 0 ? "var(--live)" : "var(--danger)" }}>
                  {mv.delta > 0 ? "+" : ""}{(mv.delta * 100).toFixed(1)}pp
                </span>{" "}
                <span style={{ color: "var(--text-low)" }}>→ {pct(mv.p_champion)} champion</span>
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );
}

const styles = {
  h1: { fontFamily: "var(--font-display)", fontSize: 28, margin: "28px 0 8px" },
  resultRow: { padding: "8px 0", borderBottom: "1px solid var(--line)" },
  upset: { color: "var(--gold)", fontSize: 13, marginTop: 4 },
  standouts: { display: "flex", flexDirection: "column", gap: 4, paddingTop: 10, fontSize: 13, color: "var(--text-mid)" },
  standout: {},
  todayGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 },
  oddsRow: { display: "grid", gridTemplateColumns: "180px 1fr 52px", alignItems: "center", gap: 10, padding: "5px 0" },
  oddsTeam: { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  oddsTrack: { background: "var(--bg-elevated)", borderRadius: 5 },
  oddsPct: { textAlign: "right", fontWeight: 700, fontSize: 14 },
};
