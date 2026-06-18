import { Link } from "react-router-dom";

import Disclaimer from "../components/Disclaimer";
import { ColdStartLoader, ErrorState } from "../components/Loaders";
import TeamBadge from "../components/TeamBadge";
import { pct } from "../lib/format";
import { useLang } from "../lib/i18n";
import { teamColor } from "../lib/teamColors";
import { useApi } from "../lib/useApi";

// Compact label for a knockout slot that hasn't resolved to a team yet.
// '3A/B/C/D/F' -> "3rd"; '1A'/'2B'/'W73'/'L101' read fine as-is.
function slotLabel(slot) {
  if (!slot) return "TBD";
  if (slot[0] === "3" && slot.includes("/")) return "3rd";
  return slot;
}

function Side({ side, score, isWinner, champ }) {
  const { tTeam } = useLang();
  const resolved = side.team_id != null;
  return (
    <div style={{ ...styles.side, opacity: isWinner === false ? 0.55 : 1 }}>
      <span style={styles.sideTeam}>
        {resolved ? (
          <>
            <TeamBadge code={side.code} name={side.name} size={16} />
            {champ != null && <span style={styles.champ}>{pct(champ)}</span>}
          </>
        ) : (
          <span style={styles.slot}>{slotLabel(side.slot)}</span>
        )}
      </span>
      <span
        className="mono-num"
        style={{ ...styles.score, fontWeight: isWinner ? 800 : 600 }}
      >
        {score ?? ""}
      </span>
      {isWinner && (
        <span
          style={{ ...styles.winBar, background: teamColor(side.code) }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function Node({ m, odds }) {
  const decided = m.home_goals != null && m.away_goals != null;
  const winId = m.winner_team_id;
  const pens =
    m.home_pens != null && m.away_pens != null
      ? ` (${m.home_pens}-${m.away_pens} pens)`
      : "";
  return (
    <Link to={`/matches/${m.id}`} className="card" style={styles.node}>
      <Side
        side={m.home}
        score={decided ? m.home_goals : null}
        isWinner={winId == null ? null : winId === m.home.team_id}
        champ={odds[m.home.team_id]?.p_champion}
      />
      <Side
        side={m.away}
        score={decided ? m.away_goals : null}
        isWinner={winId == null ? null : winId === m.away.team_id}
        champ={odds[m.away.team_id]?.p_champion}
      />
      {pens && <span style={styles.pens}>{pens.trim()}</span>}
    </Link>
  );
}

export default function Bracket() {
  const { t } = useLang();
  const { data, loading, error } = useApi("/api/bracket", { pollMs: 60_000 });

  if (loading) return <ColdStartLoader />;
  if (error) return <ErrorState error={error} />;

  const odds = data.odds ?? {};
  return (
    <>
      <h1 className="page-title">{t("bracket.title")}</h1>
      <p style={{ color: "var(--text-low)", marginTop: -8 }}>
        {data.n_iterations
          ? t("bracket.lead", { n: Number(data.n_iterations).toLocaleString() })
          : t("bracket.leadNoSim")}{" "}
        <Link to="/methodology" style={{ color: "var(--gold)" }}>{t("match.how")}</Link>
      </p>

      <div style={styles.scroller}>
        {data.rounds.map((round) => (
          <div key={round.stage} style={styles.column}>
            <h2 style={styles.roundTitle}>{t(`stage.${round.stage}`)}</h2>
            {round.matches.map((m) => (
              <Node key={m.id} m={m} odds={odds} />
            ))}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p style={{ color: "var(--text-low)", fontSize: 12, margin: 0 }}>
          {t("bracket.caveat")}
        </p>
        <Disclaimer />
      </div>
    </>
  );
}

const styles = {
  scroller: {
    display: "flex",
    gap: 14,
    overflowX: "auto",
    paddingBottom: 12,
    WebkitOverflowScrolling: "touch",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 196,
    flex: "0 0 auto",
  },
  roundTitle: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--text-mid)",
    margin: "4px 0 2px",
    position: "sticky",
    top: 0,
  },
  node: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 12px",
    overflow: "hidden",
  },
  side: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 14,
  },
  sideTeam: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  champ: { color: "var(--text-low)", fontSize: 11 },
  slot: { color: "var(--text-low)", fontStyle: "italic" },
  score: { minWidth: 14, textAlign: "right" },
  winBar: {
    position: "absolute",
    left: -12,
    top: -2,
    bottom: -2,
    width: 3,
    borderRadius: 2,
  },
  pens: { color: "var(--text-low)", fontSize: 11, alignSelf: "flex-end" },
};
