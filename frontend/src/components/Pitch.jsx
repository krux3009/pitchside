import { Link } from "react-router-dom";

import { useFactBar } from "../lib/factBar";
import { teamColor } from "../lib/teamColors";

// --- placement ----------------------------------------------------------
// The formation string ("4-4-2") gives the authoritative count per line; the
// `pos` code (G, CD-L, LB, CM-R, LF, ...) tells us which line a player sits in
// and how far left/right. ESPN's numeric `grid` is NOT back-to-front ordered,
// so we ignore it and key everything off `pos`.

// Depth from own goal (0 = keeper) -> halfway. The fractional nudges split the
// two midfield bands of a 4-line formation (e.g. 4-2-3-1) sensibly.
function depthKey(pos) {
  const p = (pos || "").toUpperCase();
  if (p === "G" || p.startsWith("GK")) return 0;
  if (/^(C?F|S?T|[LR]?W|[LR]F)/.test(p)) return 3;        // forwards
  if (p.includes("M")) {                                  // midfield bands
    if (/^C?DM/.test(p)) return 1.8;                      // holding
    if (/^C?AM/.test(p)) return 2.4;                      // attacking
    if (/^[LR]M/.test(p)) return 2.3;                     // wide
    return 2.0;                                           // central
  }
  return 1; // everything else is a defender (CD-L, LB, RB, CB, ...)
}

// Integer line band, used only for the fallback when the formation string and
// the starter count disagree.
const band = (pos) => Math.min(3, Math.floor(depthKey(pos)));

// Left/right lean within a line: wide players (prefix L/R) sit outside the
// inside pair (suffix -L/-R), centred players in the middle.
function hLean(pos) {
  const p = (pos || "").toUpperCase();
  const mag = /^[LR]/.test(p) ? 2 : /-[LR]$/.test(p) ? 1 : 0;
  const sign = /(^L|-L$)/.test(p) ? -1 : /(^R|-R$)/.test(p) ? 1 : 0;
  return sign * mag;
}

// -> [{...player, x, y}] with x,y in 0..100 (own goal at the bottom).
function placeStarters(formation, starters) {
  const ranked = [...starters].sort((a, b) => depthKey(a.pos) - depthKey(b.pos));
  const counts = [1, ...String(formation || "").split("-").map((n) => parseInt(n, 10))]
    .filter((c) => c > 0);
  const sum = counts.reduce((a, c) => a + c, 0);

  let lines;
  if (counts.length >= 2 && sum === ranked.length) {
    lines = [];
    let i = 0;
    for (const c of counts) { lines.push(ranked.slice(i, i + c)); i += c; }
  } else {
    // formation unusable: bucket into GK/DF/MF/FW so all 11 still place
    lines = [[], [], [], []];
    for (const p of ranked) lines[band(p.pos)].push(p);
    lines = lines.filter((l) => l.length);
  }

  const L = lines.length;
  const placed = [];
  lines.forEach((row, li) => {
    const y = L > 1 ? 90 - (li / (L - 1)) * 78 : 50; // keeper baseline -> halfway
    [...row]
      .sort((a, b) => hLean(a.pos) - hLean(b.pos))
      .forEach((p, xi) => placed.push({ ...p, x: ((xi + 1) / (row.length + 1)) * 100, y }));
  });
  return placed;
}

function shortName(name) {
  const parts = (name || "").trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : parts[0] || "";
}

// black text on light shirts, white on dark — keeps the number legible
function readable(hex) {
  const c = (hex || "").replace("#", "");
  if (c.length < 6) return "#fff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#0b1020" : "#fff";
}

// --- component ----------------------------------------------------------
export default function Pitch({ starters = [], formation, code }) {
  const placed = placeStarters(formation, starters);
  const fill = teamColor(code);
  const text = readable(fill);

  return (
    <div style={styles.wrap}>
      <svg viewBox="0 0 100 125" preserveAspectRatio="none" style={styles.lines}>
        <rect x="1" y="1" width="98" height="123" rx="2" />
        <line x1="0" y1="20" x2="100" y2="20" />            {/* halfway (attack up) */}
        <circle cx="50" cy="20" r="9" />
        <rect x="22" y="103" width="56" height="21" />       {/* own penalty box */}
        <rect x="38" y="116" width="24" height="8" />        {/* own six-yard box */}
      </svg>
      {placed.map((p) => (
        <PlayerNode key={p.player_id} p={p} fill={fill} text={text} />
      ))}
    </div>
  );
}

function PlayerNode({ p, fill, text }) {
  const { showPlayer, clear } = useFactBar();
  return (
    <Link
      to={`/players/${p.player_id}`}
      onMouseEnter={() => showPlayer(p.player_id, p.name)}
      onMouseLeave={clear}
      style={{ ...styles.node, left: `${p.x}%`, top: `${p.y}%` }}
    >
      <span style={{ ...styles.disc, background: fill, color: text }} className="mono-num">
        {p.number}
      </span>
      <span style={styles.name}>{shortName(p.name)}</span>
    </Link>
  );
}

const styles = {
  wrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "4 / 5",
    borderRadius: 10,
    overflow: "hidden",
    // mown-grass stripes (vertical pitch, so the stripes run horizontally)
    background: "repeating-linear-gradient(0deg, var(--grass) 0 12.5%, var(--grass-dim) 12.5% 25%)",
  },
  lines: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    stroke: "var(--pitch-line)",
    strokeWidth: 0.6,
    fill: "none",
  },
  node: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    width: 64,
    textDecoration: "none",
  },
  disc: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: "50%",
    fontSize: 13,
    fontWeight: 700,
    border: "2px solid rgba(255,255,255,0.85)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
  },
  name: {
    fontSize: 11,
    fontWeight: 600,
    color: "#fff",
    textShadow: "0 1px 2px rgba(0,0,0,0.9)",
    textAlign: "center",
    lineHeight: 1.1,
    maxWidth: 64,
  },
};
