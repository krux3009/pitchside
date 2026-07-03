import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Disclaimer from "../components/Disclaimer";
import { ColdStartLoader, ErrorState } from "../components/Loaders";
import MatchCard from "../components/MatchCard";
import ProbBar from "../components/ProbBar";
import TeamBadge from "../components/TeamBadge";
import { getPublishedAt } from "../lib/api";
import { localDateHeading, localDayKey, localKickoff, localTime, pct } from "../lib/format";
import { useLang } from "../lib/i18n";
import { teamColor } from "../lib/teamColors";
import { useApi } from "../lib/useApi";

export default function Home() {
  const { t, tTeam, tInjuryStatus, dateLocale } = useLang();
  // The briefing buckets its days in server (UTC) time; the hero and the
  // today/yesterday sections regroup from the full match list in the
  // VIEWER'S day instead, so the headings agree with the kickoff times shown.
  // The briefing still supplies the editorial extras (standouts, injuries,
  // upset notes, odds movers). Both poll so a live match flips on its own.
  const briefing = useApi("/api/briefing/today", { pollMs: 60_000 });
  const matches = useApi("/api/matches", { pollMs: 60_000 });
  const sim = useApi("/api/sim/championship");

  // freshness beacon: when the CDN was last republished (production only)
  const [updatedAt, setUpdatedAt] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => getPublishedAt().then((iso) => alive && setUpdatedAt(iso));
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (briefing.loading || matches.loading) return <ColdStartLoader />;
  if (briefing.error || matches.error)
    return <ErrorState error={briefing.error || matches.error} />;
  const b = briefing.data;

  // sentences are composed client-side so they localize; `upset_note` / `line`
  // are the pre-i18n briefing shape, kept until the next refresh regenerates it
  const upsetLine = (m) =>
    m.upset
      ? t("home.upset", { team: tTeam(m.upset.winner_code, m.upset.winner),
                          pct: pct(m.upset.p_winner) })
      : m.upset_note;

  // "Oyarzabal 23' 55'" lines for one side; own goals credit the other side's
  // scoreline, so they appear under the benefiting team with an (OG) tag
  const scorerLines = (goals, sideId) => {
    const byPlayer = new Map();
    for (const g of goals ?? []) {
      const benefits = g.type === "own-goal" ? g.team_id !== sideId : g.team_id === sideId;
      if (!benefits) continue;
      const when = g.clock || (g.minute != null ? `${g.minute}'` : "");
      const tag = g.type === "own-goal" ? ` (${t("event.own-goal")})`
        : g.type === "penalty-goal" ? ` (${t("event.penalty-goal")})` : "";
      const key = g.player_name ?? "?";
      if (!byPlayer.has(key)) byPlayer.set(key, []);
      byPlayer.get(key).push(when + tag);
    }
    return [...byPlayer].map(([name, times]) => `${name} ${times.join(" ")}`);
  };

  // regroup in the viewer's calendar: today's slate + yesterday's results
  const all = matches.data ?? [];
  const todayKey = localDayKey(new Date().toISOString());
  const yesterdayKey = localDayKey(new Date(Date.now() - 86400e3).toISOString());
  const todays = all
    .filter((m) => localDayKey(m.kickoff_utc) === todayKey)
    .sort((x, y) => x.kickoff_utc.localeCompare(y.kickoff_utc));
  const yesterdays = all
    .filter((m) => m.status === "FT" && localDayKey(m.kickoff_utc) === yesterdayKey)
    .sort((x, y) => y.kickoff_utc.localeCompare(x.kickoff_utc));
  // the briefing's upset annotations, joined back onto the regrouped rows
  const upsetBy = {};
  for (const c of [...(b.yesterday ?? []), ...(b.today ?? [])])
    if (c.upset || c.upset_note) upsetBy[c.match_id] = c;

  // matchday hero: the single most relevant match — live beats upcoming beats done
  const hero =
    todays.find((m) => m.status === "LIVE") ??
    todays.find((m) => m.status === "SCHEDULED") ??
    [...todays].reverse().find((m) => m.status === "FT") ??
    null;
  const rest = todays.filter((m) => m !== hero);

  return (
    <>
      <h1 className="page-title">{t("home.title")}</h1>
      <p style={{ color: "var(--text-low)", marginTop: -8 }}>
        {localDateHeading(todayKey, dateLocale)} · {t("home.autogen")}
        {updatedAt && <> · {t("home.updated", { time: localTime(updatedAt, dateLocale) })}</>}
      </p>

      {hero && <HeroMatch m={hero} />}

      {yesterdays.length > 0 && (
        <>
          <h2 className="section-title">{t("home.yesterday")}</h2>
          <div className="card">
            {yesterdays.map((m) => (
              <div key={m.id} style={styles.resultRow}>
                <Link to={`/matches/${m.id}`} style={styles.resultLine}>
                  <span style={styles.resultHome}>
                    <TeamBadge code={m.home_code} name={m.home_name} />
                  </span>
                  <span className="score" style={styles.resultScore}>
                    {m.home_goals} – {m.away_goals}
                    {m.home_pens != null && m.away_pens != null && (
                      <span style={styles.resultPens}>
                        {t("match.pensShort", { h: m.home_pens, a: m.away_pens })}
                      </span>
                    )}
                  </span>
                  <span>
                    <TeamBadge code={m.away_code} name={m.away_name} />
                  </span>
                </Link>
                {(m.goals ?? []).length > 0 && (
                  <div style={styles.scorers}>
                    <span style={{ textAlign: "right" }}>
                      {scorerLines(m.goals, m.home_id).map((l) => <div key={l}>{l}</div>)}
                    </span>
                    <span style={styles.scorersBall} aria-hidden="true">⚽</span>
                    <span>
                      {scorerLines(m.goals, m.away_id).map((l) => <div key={l}>{l}</div>)}
                    </span>
                  </div>
                )}
                {upsetBy[m.id] && (
                  <div style={styles.upset}>{upsetLine(upsetBy[m.id])}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">{t("home.today")}</h2>
      {todays.length === 0 && (
        <p style={{ color: "var(--text-mid)" }}>{t("home.noMatches")}</p>
      )}
      <div style={styles.todayGrid}>
        {rest.map((m) => (
          <MatchCard key={m.id} m={m} />
        ))}
      </div>

      {(b.injuries ?? []).length > 0 && (
        <>
          <h2 className="section-title">{t("home.injuries")}</h2>
          <div className="card">
            {b.injuries.map((inj, i) => (
              <div key={i} style={styles.injuryRow}>
                <strong>{inj.player_name}</strong> ({tTeam(inj.team_code, inj.team)}) — {inj.reason}{" "}
                <span style={{ color: "var(--text-low)" }}>{tInjuryStatus(inj.status)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">{t("home.whoWins")}</h2>
      <div className="card">
        {sim.loading && <p style={{ color: "var(--text-mid)" }}>{t("home.crunching")}</p>}
        {sim.data?.run && (
          <>
            <p style={{ color: "var(--text-low)", fontSize: 12, marginTop: 0 }}>
              {t("home.simNote", { n: Number(sim.data.run.n_iterations).toLocaleString() })}
              <Link to="/methodology" style={{ color: "var(--gold)" }}>{t("match.how")}</Link>
            </p>
            {sim.data.teams.slice(0, 12).map((tm) => (
              <div key={tm.team_id} className="odds-row">
                <span style={styles.oddsTeam}>
                  <TeamBadge code={tm.fifa_code} name={tm.name} />
                </span>
                <div style={styles.oddsTrack}>
                  <div
                    style={{
                      width: `${Math.max(tm.p_champion * 100 * 2.5, 1)}%`,
                      background: teamColor(tm.fifa_code),
                      boxShadow: `0 0 10px color-mix(in srgb, ${teamColor(tm.fifa_code)} 50%, transparent)`,
                      height: 10,
                      borderRadius: 5,
                    }}
                  />
                </div>
                <span className="mono-num" style={styles.oddsPct}>{pct(tm.p_champion)}</span>
              </div>
            ))}
          </>
        )}
        <Disclaimer />
      </div>

      {(b.odds_movers ?? []).length > 0 && (
        <>
          <h2 className="section-title">{t("home.oddsMovers")}</h2>
          <div className="card" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {b.odds_movers.map((mv, i) => (
              <span key={i} style={{ fontSize: 14 }}>
                <span style={{ color: mv.delta > 0 ? "var(--live)" : "var(--danger)", fontSize: 11 }}>
                  {mv.delta > 0 ? "▲" : "▼"}
                </span>{" "}
                <strong>{tTeam(mv.code, mv.team)}</strong>{" "}
                <span className="mono-num" style={{ color: mv.delta > 0 ? "var(--live)" : "var(--danger)" }}>
                  {mv.delta > 0 ? "+" : ""}{(mv.delta * 100).toFixed(1)}pp
                </span>{" "}
                <span style={{ color: "var(--text-low)" }}>{t("home.champTail", { pct: pct(mv.p_champion) })}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// Broadcast scoreboard hero — floodlit card for the day's headline match.
function HeroMatch({ m }) {
  const { t, dateLocale } = useLang();
  const live = m.status === "LIVE";
  const played = m.status !== "SCHEDULED";
  const minsToKo = Math.max(0, Math.round((new Date(m.kickoff_utc) - Date.now()) / 60000));
  const stage = m.group_letter
    ? t("stage.group", { letter: m.group_letter })
    : t("stage." + m.stage);
  return (
    <Link to={`/matches/${m.id}`}
          className={`card hero-card${live ? " card--live" : ""}`}>
      <p style={styles.heroMeta}>
        {stage} · {m.venue} ·{" "}
        {live ? <span><span className="live-dot" /> {t("match.live")}</span>
          : m.status === "FT" ? t("match.fullTime")
          : localKickoff(m.kickoff_utc, dateLocale)}
      </p>
      <div style={styles.heroRow}>
        <span style={styles.heroTeam}>
          <TeamBadge code={m.home_code} name={m.home_name ?? m.home_slot} size={30} />
        </span>
        <span className="score" style={styles.heroScore}>
          {played ? `${m.home_goals ?? 0} – ${m.away_goals ?? 0}` : "vs"}
        </span>
        <span style={{ ...styles.heroTeam, justifyContent: "flex-end" }}>
          <TeamBadge code={m.away_code} name={m.away_name ?? m.away_slot} size={30} />
        </span>
      </div>
      {played && m.home_pens != null && m.away_pens != null && (
        <p style={styles.heroPens}>{t("match.pens", { h: m.home_pens, a: m.away_pens })}</p>
      )}
      {!played && (
        <p style={styles.heroCountdown}>
          {t("hero.countdown", { h: Math.floor(minsToKo / 60), m: minsToKo % 60 })}
        </p>
      )}
      {!played && m.p_home != null && (
        <div style={{ marginTop: 12 }}>
          <ProbBar pHome={m.p_home} pDraw={m.p_draw} pAway={m.p_away}
                   homeCode={m.home_code} awayCode={m.away_code} />
        </div>
      )}
    </Link>
  );
}

const styles = {
  resultRow: { padding: "8px 0", borderBottom: "1px solid var(--line)" },
  resultLine: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 12,
    fontWeight: 600,
  },
  resultHome: { display: "flex", justifyContent: "flex-end", textAlign: "right" },
  resultScore: { fontSize: 18, lineHeight: 1.1, textAlign: "center", minWidth: 44 },
  resultPens: { display: "block", fontSize: 11, color: "var(--text-mid)", fontWeight: 500 },
  upset: {
    color: "var(--gold)", fontSize: 13, marginTop: 4,
    borderLeft: "3px solid var(--gold)", paddingLeft: 8,
  },
  scorers: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "start",
    gap: 12,
    marginTop: 4,
    fontSize: 12,
    color: "var(--text-mid)",
  },
  scorersBall: { fontSize: 10, opacity: 0.6, minWidth: 44, textAlign: "center" },
  injuryRow: {
    fontSize: 14, padding: "4px 0 4px 8px", margin: "2px 0",
    borderLeft: "3px solid var(--danger)",
  },
  todayGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 },
  oddsTeam: { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  oddsTrack: { background: "var(--bg-elevated)", borderRadius: 5 },
  oddsPct: { textAlign: "right", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-score)" },
  heroMeta: { color: "var(--text-mid)", fontSize: 13, margin: 0, textAlign: "center", position: "relative" },
  heroRow: {
    display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
    gap: 12, marginTop: 14, position: "relative",
  },
  heroTeam: { display: "flex", fontWeight: 700, fontSize: 18, minWidth: 0 },
  heroScore: { fontSize: 46, fontWeight: 700, lineHeight: 1 },
  heroPens: { color: "var(--gold)", fontSize: 14, fontWeight: 600, margin: "6px 0 0", textAlign: "center", position: "relative" },
  heroCountdown: {
    color: "var(--gold)", fontSize: 13, fontWeight: 600, letterSpacing: 1,
    textTransform: "uppercase", margin: "8px 0 0", textAlign: "center", position: "relative",
  },
};
