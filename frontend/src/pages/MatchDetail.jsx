import { Link, useParams } from "react-router-dom";

import Disclaimer from "../components/Disclaimer";
import { ColdStartLoader, ErrorState } from "../components/Loaders";
import ProbBar from "../components/ProbBar";
import StatCompareRow from "../components/StatCompareRow";
import TeamBadge from "../components/TeamBadge";
import { localKickoff, STAGE_LABEL } from "../lib/format";
import { useApi } from "../lib/useApi";

const STAT_ROWS = [
  ["possession", "Possession", "%"],
  ["shots", "Shots", ""],
  ["shots_on_target", "On target", ""],
  ["corners", "Corners", ""],
  ["fouls", "Fouls", ""],
  ["offsides", "Offsides", ""],
  ["passes", "Passes", ""],
  ["pass_accuracy", "Pass accuracy", "%"],
  ["yellows", "Yellow cards", ""],
  ["reds", "Red cards", ""],
];

export default function MatchDetail() {
  const { id } = useParams();
  const { data: m, loading, error } = useApi(`/api/matches/${id}`);

  if (loading) return <ColdStartLoader />;
  if (error) return <ErrorState error={error} />;

  const played = m.status !== "SCHEDULED";
  const statsBy = Object.fromEntries((m.team_stats ?? []).map((s) => [s.team_id, s]));
  const homeStats = statsBy[m.home_id];
  const awayStats = statsBy[m.away_id];
  const lineupBy = Object.fromEntries((m.lineups ?? []).map((l) => [l.team_id, l]));

  return (
    <>
      <div className="card" style={{ marginTop: 24, textAlign: "center", padding: 24 }}>
        <p style={{ color: "var(--text-low)", fontSize: 13, margin: 0 }}>
          {m.group_letter ? `Group ${m.group_letter}` : STAGE_LABEL[m.stage]} · {m.venue} ·{" "}
          {m.status === "LIVE" ? <span><span className="live-dot" /> LIVE</span>
            : m.status === "FT" ? "Full time" : localKickoff(m.kickoff_utc)}
        </p>
        <div style={styles.scoreRow}>
          <span style={styles.team}><TeamBadge code={m.home_code} name={m.home_name ?? m.home_slot} size={30} /></span>
          <span className="score" style={styles.bigScore}>
            {played ? `${m.home_goals} – ${m.away_goals}` : "vs"}
          </span>
          <span style={styles.team}><TeamBadge code={m.away_code} name={m.away_name ?? m.away_slot} size={30} /></span>
        </div>
      </div>

      {m.prediction && !played && (
        <>
          <h2 className="section-title">Model Prediction</h2>
          <div className="card">
            <ProbBar
              pHome={m.prediction.p_home} pDraw={m.prediction.p_draw} pAway={m.prediction.p_away}
              homeCode={m.home_code} awayCode={m.away_code}
            />
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginBottom: 0 }}>
              Most likely score: <strong>{m.prediction.likely_score}</strong> · Elo{" "}
              <span className="mono-num">{Math.round(m.prediction.home_elo)}</span> v{" "}
              <span className="mono-num">{Math.round(m.prediction.away_elo)}</span> ·{" "}
              <Link to="/methodology" style={{ color: "var(--gold)" }}>how this works</Link>
            </p>
            <Disclaimer />
          </div>
        </>
      )}

      {homeStats && awayStats && (
        <>
          <h2 className="section-title">Team Statistics</h2>
          <div className="card">
            {STAT_ROWS.map(([key, label, suffix]) =>
              homeStats[key] != null || awayStats[key] != null ? (
                <StatCompareRow
                  key={key} label={label} suffix={suffix}
                  home={homeStats[key]} away={awayStats[key]}
                  homeCode={m.home_code} awayCode={m.away_code}
                />
              ) : null
            )}
          </div>
        </>
      )}

      {m.lineups?.length > 0 && (
        <>
          <h2 className="section-title">Lineups</h2>
          <div style={styles.lineups}>
            {[m.home_id, m.away_id].map((tid) => {
              const lu = lineupBy[tid];
              if (!lu) return null;
              const code = tid === m.home_id ? m.home_code : m.away_code;
              const name = tid === m.home_id ? m.home_name : m.away_name;
              return (
                <div key={tid} className="card">
                  <p style={{ marginTop: 0, fontWeight: 700 }}>
                    <TeamBadge code={code} name={name} />{" "}
                    {lu.formation && <span style={{ color: "var(--text-low)" }}>({lu.formation})</span>}
                  </p>
                  {lu.starters.map((p) => (
                    <PlayerLine key={p.player_id} p={p} />
                  ))}
                  {lu.bench.length > 0 && (
                    <>
                      <p style={{ color: "var(--text-low)", fontSize: 12, margin: "10px 0 4px" }}>BENCH</p>
                      {lu.bench.map((p) => (
                        <PlayerLine key={p.player_id} p={p} dim />
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!played && !m.lineups?.length && (
        <p style={{ color: "var(--text-low)", fontSize: 13 }}>
          Lineups appear ~30 minutes before kickoff.
        </p>
      )}
    </>
  );
}

function PlayerLine({ p, dim = false }) {
  return (
    <Link
      to={`/players/${p.player_id}`}
      style={{
        display: "flex", gap: 8, padding: "3px 0", fontSize: 14,
        color: dim ? "var(--text-low)" : "var(--text-hi)",
      }}
    >
      <span className="mono-num" style={{ width: 22, color: "var(--text-low)" }}>{p.number}</span>
      <span>{p.name}</span>
      <span style={{ color: "var(--text-low)" }}>{p.pos}</span>
    </Link>
  );
}

const styles = {
  scoreRow: {
    display: "grid", gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center", gap: 12, marginTop: 14,
  },
  team: { fontWeight: 700, fontSize: 17 },
  bigScore: { fontSize: 40 },
  lineups: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 },
};
