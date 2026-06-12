import { Link } from "react-router-dom";

import { localKickoff } from "../lib/format";
import { useLang } from "../lib/i18n";
import ProbBar from "./ProbBar";
import TeamBadge from "./TeamBadge";

export default function MatchCard({ m }) {
  const { t, dateLocale } = useLang();
  const played = m.status !== "SCHEDULED";
  const label = m.group_letter
    ? t("stage.group", { letter: m.group_letter })
    : t("stage." + m.stage);
  return (
    <Link to={`/matches/${m.id}`} className="card" style={styles.card}>
      <div style={styles.meta}>
        <span>{label}</span>
        <span>
          {m.status === "LIVE" && <span className="live-dot" style={{ marginRight: 6 }} />}
          {m.status === "LIVE" ? t("match.live")
            : m.status === "FT" ? t("match.ft")
            : localKickoff(m.kickoff_utc, dateLocale)}
        </span>
      </div>
      <div style={styles.row}>
        <TeamBadge code={m.home_code} name={m.home_name ?? m.home_slot} />
        <span className="score" style={styles.score}>
          {played ? `${m.home_goals} – ${m.away_goals}` : "v"}
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

const styles = {
  card: { display: "block", padding: 14 },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "var(--text-low)",
    marginBottom: 10,
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
  score: { fontSize: 20 },
};
