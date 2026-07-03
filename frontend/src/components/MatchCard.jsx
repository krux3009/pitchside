import { Link } from "react-router-dom";

import { localKickoff } from "../lib/format";
import { downloadMatchIcs } from "../lib/ics";
import { useLang } from "../lib/i18n";
import ProbBar from "./ProbBar";
import TeamBadge from "./TeamBadge";

export default function MatchCard({ m }) {
  const { t, dateLocale } = useLang();
  const played = m.status !== "SCHEDULED";
  // Card is a <Link>: swallow the click so the icon adds a reminder, not navigates.
  const remind = (e) => {
    e.preventDefault();
    e.stopPropagation();
    downloadMatchIcs(m, t);
  };
  const label = m.group_letter
    ? t("stage.group", { letter: m.group_letter })
    : t("stage." + m.stage);
  return (
    <Link to={`/matches/${m.id}`} className="card" style={styles.card}>
      <div style={styles.meta}>
        <span>{label}</span>
        <span style={styles.right}>
          {m.status === "LIVE" && <span className="live-dot" style={{ marginRight: 6 }} />}
          {m.status === "LIVE" ? t("match.live")
            : m.status === "FT" ? t("match.ft")
            : localKickoff(m.kickoff_utc, dateLocale)}
          {!played && (
            <button onClick={remind} aria-label={t("reminder.aria")} style={styles.bell} className="cal-icon">
              <CalendarIcon />
            </button>
          )}
        </span>
      </div>
      <div style={styles.row}>
        <TeamBadge code={m.home_code} name={m.home_name ?? m.home_slot} />
        <span className="score" style={styles.score}>
          {played ? `${m.home_goals} – ${m.away_goals}` : "v"}
          {played && m.home_pens != null && m.away_pens != null && (
            <span style={styles.pens}>{t("match.pensShort", { h: m.home_pens, a: m.away_pens })}</span>
          )}
        </span>
        <span style={{ textAlign: "right" }}>
          <TeamBadge code={m.away_code} name={m.away_name ?? m.away_slot} />
        </span>
      </div>
      {!played && m.p_home != null && (
        <ProbBar
          pHome={m.p_home} pDraw={m.p_draw} pAway={m.p_away}
          homeCode={m.home_code} awayCode={m.away_code} compact
        />
      )}
    </Link>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
    </svg>
  );
}

const styles = {
  card: { display: "block", padding: 14 },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "var(--text-low)",
    marginBottom: 10,
  },
  right: { display: "inline-flex", alignItems: "center", gap: 8 },
  bell: {
    display: "inline-flex",
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    color: "var(--text-low)",
    lineHeight: 0,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    fontWeight: 600,
    fontSize: 15,
  },
  score: { fontSize: 20, textAlign: "center" },
  pens: { display: "block", fontSize: 11, color: "var(--text-mid)", fontWeight: 500 },
};
