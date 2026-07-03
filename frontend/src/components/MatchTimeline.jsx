import { Link } from "react-router-dom";

import { useFactBar } from "../lib/factBar";
import { useLang } from "../lib/i18n";

const EMOJI = {
  goal: "⚽",
  "own-goal": "⚽",
  "penalty-goal": "⚽",
  substitution: "🔄",
};

// Bookings render as a small CSS card rather than an emoji — crisper, and it
// reads as an actual yellow/red card at this size.
function CardGlyph({ color }) {
  return (
    <span
      style={{
        display: "inline-block", width: 9, height: 12, borderRadius: 2,
        background: color, boxShadow: "0 1px 2px rgba(0,0,0,0.45)", verticalAlign: "-1px",
      }}
    />
  );
}

function EventIcon({ type }) {
  if (type === "yellow-card") return <CardGlyph color="var(--card-yellow)" />;
  if (type === "red-card") return <CardGlyph color="var(--card-red)" />;
  return <span>{EMOJI[type] ?? "•"}</span>;
}

// A player name that links to the player page when we resolved a canonical id.
function PlayerName({ id, name, bold }) {
  const { showPlayer, clear } = useFactBar();
  if (!name) return null;
  const style = { fontWeight: bold ? 700 : 400, color: "inherit" };
  if (!id) return <span style={style}>{name}</span>;
  return (
    <Link
      to={`/players/${id}`}
      onMouseEnter={() => showPlayer(id, name)}
      onMouseLeave={clear}
      style={{ ...style, textDecoration: "none" }}
    >
      {name}
    </Link>
  );
}

function EventCell({ ev, align, t }) {
  const isGoal = ev.type === "goal" || ev.type === "own-goal" || ev.type === "penalty-goal";
  const isSub = ev.type === "substitution";
  return (
    <div style={{ fontSize: 14, lineHeight: 1.3 }}>
      {/* flex with a single gap keeps the icon-to-name spacing identical on both sides */}
      <div style={{
        display: "flex", gap: 6, alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
      }}>
        <EventIcon type={ev.type} />
        <span>
          <PlayerName id={ev.player_id} name={ev.player_name} bold />
          {ev.type === "own-goal" && (
            <span style={{ color: "var(--text-low)", fontSize: 12 }}> ({t("event.own-goal")})</span>
          )}
          {ev.type === "penalty-goal" && (
            <span style={{ color: "var(--text-low)", fontSize: 12 }}> ({t("event.penalty-goal")})</span>
          )}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-low)", textAlign: align }}>
        {isGoal && ev.assist_name && t("event.assist", { name: ev.assist_name })}
        {isSub && ev.assist_name && (
          <>
            <span style={{ color: "var(--card-red)" }}>↓ </span>
            <PlayerName id={ev.assist_id} name={ev.assist_name} />
          </>
        )}
      </div>
    </div>
  );
}

// Match phase from the board clock's first number: stoppage ("45'+2'") keeps
// its half; "105'" reads as extra time.
function phaseOf(ev) {
  const m = /^(\d+)/.exec(ev.clock || "");
  const n = m ? Number(m[1]) : ev.minute ?? 0;
  return n <= 45 ? 1 : n <= 90 ? 2 : 3;
}

function Divider({ label }) {
  return (
    <div style={styles.divider} role="separator">
      <span style={styles.dividerLine} />
      <span style={styles.dividerLabel}>{label}</span>
      <span style={styles.dividerLine} />
    </div>
  );
}

export default function MatchTimeline({ events = [], homeId, awayId }) {
  const { t } = useLang();
  if (!events.length) return null;

  return (
    <>
      <h2 className="section-title">{t("match.timeline")}</h2>
      <div className="card" style={{ padding: "16px 8px" }}>
        {events.map((ev, i) => {
          const home = ev.team_id === homeId;
          const away = ev.team_id === awayId;
          const prev = i > 0 ? phaseOf(events[i - 1]) : 1;
          const cur = phaseOf(ev);
          return (
            <div key={ev.seq}>
              {prev === 1 && cur >= 2 && <Divider label={t("event.ht")} />}
              {prev === 2 && cur === 3 && <Divider label={t("event.et")} />}
              <div style={styles.row}>
                <div style={styles.side}>{home && <EventCell ev={ev} align="right" t={t} />}</div>
                <div style={styles.clock}>{ev.clock || (ev.minute != null ? `${ev.minute}'` : "")}</div>
                <div style={styles.side}>{away && <EventCell ev={ev} align="left" t={t} />}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const styles = {
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 48px 1fr",
    alignItems: "center",
    gap: 8,
    padding: "8px 0",
    borderBottom: "1px solid var(--line)",
  },
  side: { minWidth: 0 },
  divider: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0" },
  dividerLine: { flex: 1, height: 1, background: "var(--line-strong)" },
  dividerLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "var(--text-low)",
  },
  clock: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--gold)",
    fontVariantNumeric: "tabular-nums",
  },
};
