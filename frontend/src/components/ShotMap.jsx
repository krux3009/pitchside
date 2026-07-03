import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useFactBar } from "../lib/factBar";
import { useLang } from "../lib/i18n";
import { teamColor } from "../lib/teamColors";

const RESULTS = ["goal", "saved", "off-target", "blocked"];

// marker radius (px) grows with √xG so big chances read bigger
const radius = (xg) => 9 + 11 * Math.sqrt(Math.max(0, xg || 0));

export default function ShotMap({ shots = [], homeId, awayId, homeCode, awayCode }) {
  const { t } = useLang();
  const [active, setActive] = useState(() => new Set(RESULTS)); // result chips on
  const [player, setPlayer] = useState("all");
  const [selSeq, setSelSeq] = useState(null);
  // timeline scrub position in match minutes; null = full map (no scrub yet)
  const [scrubMin, setScrubMin] = useState(null);

  // distinct shooters for the player dropdown
  const players = useMemo(() => {
    const seen = new Map();
    for (const s of shots) if (s.player_id && !seen.has(s.player_id)) seen.set(s.player_id, s.player_name);
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [shots]);

  if (!shots.length) return null;

  const colorFor = (s) => teamColor(s.team_id === homeId ? homeCode : awayCode);
  // chips + player scope the set; the scrubber then reveals it up to a minute.
  // Shots with no clock stay visible at any scrub position.
  const filtered = shots.filter(
    (s) => active.has(s.result) && (player === "all" || String(s.player_id) === player)
  );
  const visible = filtered.filter(
    (s) => scrubMin == null || s.minute == null || s.minute <= scrubMin
  );
  const selected = shots.find((s) => s.seq === selSeq) || null;

  const minutes = [...new Set(
    filtered.filter((s) => s.minute != null).map((s) => s.minute)
  )].sort((a, b) => a - b);
  const maxMin = Math.max(90, ...(minutes.length ? minutes : [0]));

  // releasing the handle snaps to the nearest shot and selects it, so the
  // scrubber doubles as a shot-stepper
  const snap = () => {
    if (scrubMin == null || !minutes.length) return;
    const nearest = minutes.reduce(
      (best, m) => (Math.abs(m - scrubMin) < Math.abs(best - scrubMin) ? m : best)
    );
    setScrubMin(nearest);
    const shot = filtered.find((s) => s.minute === nearest);
    if (shot) setSelSeq(shot.seq);
  };

  const step = (dir) => {
    if (!minutes.length) return;
    const cur = scrubMin ?? Infinity;
    const target = dir > 0
      ? (minutes.find((m) => m > cur) ?? minutes[minutes.length - 1])
      : ([...minutes].reverse().find((m) => m < cur) ?? minutes[0]);
    setScrubMin(target);
    const shot = filtered.find((s) => s.minute === target);
    if (shot) setSelSeq(shot.seq);
  };

  const toggle = (r) => {
    const next = new Set(active);
    next.has(r) ? next.delete(r) : next.add(r);
    setActive(next.size ? next : new Set(RESULTS)); // never blank out entirely
  };

  return (
    <>
      <h2 className="section-title">{t("shotmap.title")}</h2>
      <div className="card">
        {/* filters */}
        <div style={styles.filters}>
          <div style={styles.chips}>
            {RESULTS.map((r) => (
              <button
                key={r}
                onClick={() => toggle(r)}
                style={{ ...styles.chip, opacity: active.has(r) ? 1 : 0.35 }}
              >
                <Glyph result={r} color="var(--text-hi)" size={16} />
                {t("shot.result." + r)}
              </button>
            ))}
          </div>
          {players.length > 1 && (
            <select value={player} onChange={(e) => setPlayer(e.target.value)}
                    className="shot-select" style={styles.select}>
              <option value="all">{t("shotmap.allPlayers")}</option>
              {players.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* pitch */}
        <div style={styles.pitch}>
          <svg viewBox="0 0 100 64" preserveAspectRatio="none" style={styles.lines}>
            <rect x="0.5" y="0.5" width="99" height="63" />
            <line x1="50" y1="0" x2="50" y2="64" />
            <circle cx="50" cy="32" r="8" />
            <rect x="0.5" y="18" width="16" height="28" />
            <rect x="83.5" y="18" width="16" height="28" />
            <rect x="0.5" y="26" width="6" height="12" />
            <rect x="93.5" y="26" width="6" height="12" />
          </svg>
          {visible
            .slice()
            .sort((a, b) => (a.result === "goal") - (b.result === "goal")) // goals on top
            .map((s) => {
              const home = s.team_id === homeId;
              const x = home ? s.field_x : 100 - s.field_x;
              const y = home ? s.field_y : 100 - s.field_y;
              return (
                <Marker
                  key={s.seq} s={s} x={x} y={y} color={colorFor(s)}
                  selected={s.seq === selSeq} onClick={() => setSelSeq(s.seq)}
                />
              );
            })}
        </div>

        {/* timeline scrubber: drag through match minutes to replay the shots */}
        <div style={styles.scrubRow}>
          <button aria-label={t("shotmap.prevShot")} onClick={() => step(-1)} style={styles.stepBtn}>‹</button>
          <input
            type="range"
            className="scrub"
            min="0"
            max={maxMin}
            value={scrubMin ?? maxMin}
            onChange={(e) => setScrubMin(Number(e.target.value))}
            onPointerUp={snap}
            aria-label={t("shotmap.scrub")}
            aria-valuetext={`${scrubMin ?? maxMin}'`}
          />
          <button aria-label={t("shotmap.nextShot")} onClick={() => step(1)} style={styles.stepBtn}>›</button>
          <span style={styles.scrubReadout}>
            {t("shotmap.upTo", { min: scrubMin ?? maxMin, shown: visible.length, total: filtered.length })}
          </span>
        </div>

        <p style={styles.hint}>
          {selected ? "" : t("shotmap.tapHint")} <span style={{ float: "right" }}>{t("shotmap.xgSource")}</span>
        </p>

        {selected && <ShotDetail s={selected} color={colorFor(selected)} t={t} />}
      </div>
    </>
  );
}

// result glyph as inline svg (24x24 viewBox), scaled to `size`
function Glyph({ result, color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: "visible", flexShrink: 0 }}>
      {result === "goal" && (
        <>
          <circle cx="12" cy="12" r="11" fill={color} />
          <circle cx="12" cy="12" r="4" fill="#fff" />
        </>
      )}
      {result === "saved" && <circle cx="12" cy="12" r="10" fill={color} stroke="#fff" strokeWidth="2.5" />}
      {result === "off-target" && <circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth="3" />}
      {result === "blocked" && (
        <>
          <circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth="3" />
          <line x1="5" y1="19" x2="19" y2="5" stroke={color} strokeWidth="3" />
        </>
      )}
    </svg>
  );
}

function Marker({ s, x, y, color, selected, onClick }) {
  const size = radius(s.xg) * 2;
  return (
    <button
      onClick={onClick}
      title={`${s.player_name} ${s.minute ?? ""}'`}
      style={{
        ...styles.marker, left: `${x}%`, top: `${y}%`, width: size, height: size,
        zIndex: selected ? 5 : s.result === "goal" ? 3 : 2,
        filter: selected ? "drop-shadow(0 0 0 2px #fff)" : "none",
        outline: selected ? "2px solid #fff" : "none", borderRadius: "50%",
      }}
    >
      <Glyph result={s.result} color={color} size={size} />
    </button>
  );
}

function ShotDetail({ s, color, t }) {
  const { showPlayer, clear } = useFactBar();
  const stats = [
    ["shot.xg", s.xg != null ? s.xg.toFixed(2) : "—"],
    ["shot.xgot", s.xgot != null ? s.xgot.toFixed(2) : "—"],
    ["shot.distance", s.distance != null ? t("shot.metres", { n: s.distance }) : "—"],
    ["shot.bodyPart", s.body_part || "—"],
    ["shot.situation", s.situation || "—"],
    ["shot.goalZone", s.goal_zone || "—"],
  ];
  return (
    <div style={styles.detail}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={styles.detailHead}>
          <Glyph result={s.result} color={color} size={20} />
          {s.player_id ? (
            <Link
              to={`/players/${s.player_id}`}
              onMouseEnter={() => showPlayer(s.player_id, s.player_name)}
              onMouseLeave={clear}
              style={{ fontWeight: 700, color: "var(--text-hi)", textDecoration: "none" }}
            >
              {s.player_name}
            </Link>
          ) : (
            <span style={{ fontWeight: 700 }}>{s.player_name}</span>
          )}
          <span style={{ color: "var(--text-low)" }}>
            {t("shot.result." + s.result)} · {s.clock || (s.minute != null ? `${s.minute}'` : "")}
          </span>
        </div>
        <div style={styles.statGrid}>
          {stats.map(([k, v]) => (
            <div key={k}>
              <div style={styles.statVal}>{v}</div>
              <div style={styles.statLbl}>{t(k)}</div>
            </div>
          ))}
        </div>
      </div>
      <NetDiagram s={s} color={color} />
    </div>
  );
}

// mini goal-mouth view: where in (or around) the net the shot went.
function NetDiagram({ s, color }) {
  if (s.goal_y == null || s.goal_z == null) return null;
  // posts drawn at x=30/70, crossbar y=12, ground y=52 in a 100x60 box; goal_y
  // 50=centre, spread so wide misses fall outside the posts; goal_z 0=ground.
  const dotX = Math.max(5, Math.min(95, 50 + (s.goal_y - 50) * 3));
  const dotY = 52 - (Math.max(0, Math.min(100, s.goal_z)) / 100) * 40;
  return (
    <svg viewBox="0 0 100 60" style={styles.net}>
      <defs>
        <pattern id="netmesh" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M5 0 L0 0 0 5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="30" y="12" width="40" height="40" fill="url(#netmesh)" />
      <path d="M30 52 L30 12 L70 12 L70 52" fill="none" stroke="var(--text-mid)" strokeWidth="2" />
      <line x1="6" y1="52" x2="94" y2="52" stroke="var(--text-low)" strokeWidth="1" />
      <circle cx={dotX} cy={dotY} r="3.5" fill={color} stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

const styles = {
  filters: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 },
  chips: { display: "flex", flexWrap: "wrap", gap: 6 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px",
    borderRadius: 999, border: "1px solid var(--line)",
    background: "transparent", color: "var(--text-hi)", fontSize: 13, cursor: "pointer",
  },
  select: {
    marginLeft: "auto", padding: "6px 10px", borderRadius: 8, fontSize: 13,
    background: "var(--bg-elevated)", color: "var(--text-hi)",
    border: "1px solid var(--line)",
  },
  pitch: {
    position: "relative", width: "100%", aspectRatio: "105 / 64", borderRadius: 10,
    overflow: "hidden", background: "var(--pitch-stripes)",
  },
  lines: { position: "absolute", inset: 0, width: "100%", height: "100%",
    stroke: "var(--pitch-line)", strokeWidth: 0.4, fill: "none" },
  marker: {
    position: "absolute", transform: "translate(-50%, -50%)", padding: 0, border: "none",
    background: "none", cursor: "pointer", lineHeight: 0,
  },
  hint: { fontSize: 11, color: "var(--text-low)", margin: "8px 2px 0", overflow: "hidden" },
  scrubRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 },
  stepBtn: {
    flexShrink: 0, width: 44, height: 44, fontSize: 20, lineHeight: 1,
    color: "var(--text-mid)", background: "var(--bg-elevated)",
    border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", cursor: "pointer",
  },
  scrubReadout: {
    flexShrink: 0, minWidth: 96, textAlign: "right", fontSize: 12, fontWeight: 600,
    color: "var(--text-mid)", fontVariantNumeric: "tabular-nums",
  },
  detail: {
    display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12, paddingTop: 12,
    borderTop: "1px solid var(--line)",
  },
  detailHead: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 10 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 12px" },
  statVal: { fontSize: 16, fontWeight: 700, color: "var(--text-hi)" },
  statLbl: { fontSize: 11, color: "var(--text-low)", textTransform: "uppercase", letterSpacing: 0.5 },
  net: { width: "min(150px, 40%)", aspectRatio: "100 / 60", alignSelf: "center", flexShrink: 0 },
};
