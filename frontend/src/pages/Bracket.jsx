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

// 'W101' -> 101; group/loser slots have no winner-feed.
const feedId = (slot) => (slot && slot[0] === "W" ? Number(slot.slice(1)) : null);

// Walk the W<n> feed graph from a subtree root, collecting matches per stage in
// top->bottom (in-order) order so each round lines up with its two feeders.
// NOTE: id order does NOT split into halves cleanly (match 76 is right-half
// while 77 is left-half), so the tree must be built from the feeds.
function collectSubtree(byId, rootId, acc = {}) {
  const m = byId[rootId];
  if (!m) return acc;
  if (feedId(m.home.slot)) collectSubtree(byId, feedId(m.home.slot), acc);
  if (feedId(m.away.slot)) collectSubtree(byId, feedId(m.away.slot), acc);
  (acc[m.stage] ||= []).push(m);
  return acc;
}

const LEFT_ORDER = ["R32", "R16", "QF", "SF"];

function Half({ order, rounds, side, odds, t }) {
  return (
    <div className={`bkt-side bkt-${side}`}>
      {order.map((stage) => {
        const matches = rounds[stage] ?? [];
        if (!matches.length) return null;
        return (
          <div key={stage} className="bkt-round">
            <div className="bkt-colhead">{t(`stage.${stage}`)}</div>
            <div className="bkt-col">
              {matches.map((m) => (
                <div key={m.id} className="bkt-match">
                  <Node m={m} odds={odds} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Bracket() {
  const { t } = useLang();
  const { data, loading, error } = useApi("/api/bracket", { pollMs: 60_000 });

  if (loading) return <ColdStartLoader />;
  if (error) return <ErrorState error={error} />;

  const odds = data.odds ?? {};
  const all = data.rounds.flatMap((r) => r.matches);
  const byId = Object.fromEntries(all.map((m) => [m.id, m]));
  const final = all.find((m) => m.stage === "FINAL");
  const third = all.find((m) => m.stage === "THIRD");

  const left = final ? collectSubtree(byId, feedId(final.home.slot)) : {};
  const right = final ? collectSubtree(byId, feedId(final.away.slot)) : {};
  const champ = final?.winner_team_id
    ? [final.home, final.away].find((s) => s.team_id === final.winner_team_id)
    : null;

  return (
    <>
      <h1 className="page-title">{t("bracket.title")}</h1>
      <p style={{ color: "var(--text-low)", marginTop: -8 }}>
        {data.n_iterations
          ? t("bracket.lead", { n: Number(data.n_iterations).toLocaleString() })
          : t("bracket.leadNoSim")}{" "}
        <Link to="/methodology" style={{ color: "var(--gold)" }}>{t("match.how")}</Link>
      </p>

      <div className="bkt-scroll">
        <div className="bkt">
          <Half order={LEFT_ORDER} rounds={left} side="left" odds={odds} t={t} />

          <div className="bkt-center">
            <div className="bkt-colhead">{t("stage.FINAL")}</div>
            <div className="bkt-center-mid">
              {final && <Node m={final} odds={odds} />}
            </div>
            <div className="bkt-champ">
              <div className="bkt-champ-label">{t("bracket.champion")}</div>
              {champ ? (
                <TeamBadge code={champ.code} name={champ.name} size={20} />
              ) : (
                <div className="bkt-champ-trophy" aria-hidden="true">🏆</div>
              )}
            </div>
          </div>

          <Half order={[...LEFT_ORDER].reverse()} rounds={right} side="right" odds={odds} t={t} />
        </div>
      </div>

      {third && (
        <div style={{ marginTop: 22, maxWidth: 340 }}>
          <div className="bkt-colhead" style={{ textAlign: "left", marginBottom: 6 }}>
            {t("bracket.third")}
          </div>
          <Node m={third} odds={odds} />
        </div>
      )}

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
