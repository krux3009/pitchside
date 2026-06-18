import { Link, useParams } from "react-router-dom";

import Disclaimer from "../components/Disclaimer";
import { ColdStartLoader, ErrorState } from "../components/Loaders";
import MatchTimeline from "../components/MatchTimeline";
import Momentum from "../components/Momentum";
import Pitch from "../components/Pitch";
import ProbBar from "../components/ProbBar";
import ShotMap from "../components/ShotMap";
import StatCompareRow from "../components/StatCompareRow";
import TeamBadge from "../components/TeamBadge";
import { useFactBar } from "../lib/factBar";
import { localKickoff } from "../lib/format";
import { useLang } from "../lib/i18n";
import { useApi } from "../lib/useApi";

const STAT_ROWS = [
  ["possession", "%"],
  ["shots", ""],
  ["shots_on_target", ""],
  ["corners", ""],
  ["fouls", ""],
  ["offsides", ""],
  ["passes", ""],
  ["pass_accuracy", "%"],
  ["yellows", ""],
  ["reds", ""],
];

const POSITION_GROUPS = ["GK", "DF", "MF", "FW"];

export default function MatchDetail() {
  const { t, dateLocale } = useLang();
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
          {m.group_letter ? t("stage.group", { letter: m.group_letter }) : t("stage." + m.stage)} · {m.venue} ·{" "}
          {m.status === "LIVE" ? <span><span className="live-dot" /> {t("match.live")}</span>
            : m.status === "FT" ? t("match.fullTime") : localKickoff(m.kickoff_utc, dateLocale)}
        </p>
        <div className="score-row">
          <span className="score-team"><TeamBadge code={m.home_code} name={m.home_name ?? m.home_slot} size={30} /></span>
          <span className="score big-score">
            {played ? `${m.home_goals} – ${m.away_goals}` : "vs"}
          </span>
          <span className="score-team"><TeamBadge code={m.away_code} name={m.away_name ?? m.away_slot} size={30} /></span>
        </div>
      </div>

      {m.prediction && !played && (
        <>
          <h2 className="section-title">{t("match.prediction")}</h2>
          <div className="card">
            <ProbBar
              pHome={m.prediction.p_home} pDraw={m.prediction.p_draw} pAway={m.prediction.p_away}
              homeCode={m.home_code} awayCode={m.away_code}
            />
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginBottom: 0 }}>
              {t("match.likelyScore")} <strong>{m.prediction.likely_score}</strong> · Elo{" "}
              <span className="mono-num">{Math.round(m.prediction.home_elo)}</span> v{" "}
              <span className="mono-num">{Math.round(m.prediction.away_elo)}</span> ·{" "}
              <Link to="/methodology" style={{ color: "var(--gold)" }}>{t("match.how")}</Link>
            </p>
            <Disclaimer />
          </div>
        </>
      )}

      {m.events?.length > 0 && (
        <MatchTimeline events={m.events} homeId={m.home_id} awayId={m.away_id} />
      )}

      {m.momentum?.length > 0 && (
        <Momentum
          points={m.momentum}
          homeCode={m.home_code} awayCode={m.away_code}
          homeName={m.home_name} awayName={m.away_name}
        />
      )}

      {m.shots?.length > 0 && (
        <ShotMap
          shots={m.shots} homeId={m.home_id} awayId={m.away_id}
          homeCode={m.home_code} awayCode={m.away_code}
        />
      )}

      {homeStats && awayStats && (
        <>
          <h2 className="section-title">{t("match.teamStats")}</h2>
          <div className="card">
            {STAT_ROWS.map(([key, suffix]) =>
              homeStats[key] != null || awayStats[key] != null ? (
                <StatCompareRow
                  key={key} label={t("stat." + key)} suffix={suffix}
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
          <h2 className="section-title">{t("match.lineups")}</h2>
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
                  <Pitch starters={lu.starters} formation={lu.formation} code={code} />
                  {lu.bench.length > 0 && (
                    <>
                      <p style={{ color: "var(--text-low)", fontSize: 12, margin: "10px 0 4px" }}>{t("match.bench")}</p>
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

      {!m.lineups?.length && m.squads && (
        <>
          <h2 className="section-title">{t("match.squads")}</h2>
          {!played && (
            <p style={{ color: "var(--text-low)", fontSize: 13, marginTop: -4 }}>
              {t("match.squadNote")}
            </p>
          )}
          <div style={styles.lineups}>
            {["home", "away"].map((side) => {
              const code = side === "home" ? m.home_code : m.away_code;
              const name = side === "home" ? m.home_name : m.away_name;
              return (
                <div key={side} className="card">
                  <p style={{ marginTop: 0, fontWeight: 700 }}>
                    <TeamBadge code={code} name={name} />
                  </p>
                  {POSITION_GROUPS.map((pos) => {
                    const group = m.squads[side].filter((p) => p.position === pos);
                    if (!group.length) return null;
                    return (
                      <div key={pos}>
                        <p style={styles.posLabel}>{t("pos." + pos)}</p>
                        {group.map((p) => (
                          <PlayerLine
                            key={p.id}
                            p={{ player_id: p.id, name: p.name,
                                 number: p.shirt_number, pos: p.position }}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function PlayerLine({ p, dim = false }) {
  const { showPlayer, clear } = useFactBar();
  return (
    <Link
      to={`/players/${p.player_id}`}
      onMouseEnter={() => showPlayer(p.player_id, p.name)}
      onMouseLeave={clear}
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
  posLabel: {
    color: "var(--text-low)",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    margin: "10px 0 4px",
  },
  lineups: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 },
};
