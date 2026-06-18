import Disclaimer from "./Disclaimer";
import { useLang } from "../lib/i18n";
import { teamColor } from "../lib/teamColors";

const W = 320;
const H = 140;

// ESPN-style win-probability band: the home team's chance fills from the bottom,
// the away team's from the top, and the gap between them is the draw probability.
export default function Momentum({ points, homeCode, awayCode, homeName, awayName }) {
  const { t } = useLang();
  if (!points || points.length < 2) return null;

  const x = (i) => (i / (points.length - 1)) * W;
  const homeLine = points.map((p, i) => `${x(i)},${H * (1 - p.p_home)}`);
  const awayLine = points.map((p, i) => `${x(i)},${H * p.p_away}`);

  // close each line into a filled area against its own edge of the chart
  const homeArea = `0,${H} ${homeLine.join(" ")} ${W},${H}`;
  const awayArea = `0,0 ${awayLine.join(" ")} ${W},0`;

  // a marker each time the scoreline changes (sampled, so to the nearest 5')
  const goals = [];
  for (let i = 1; i < points.length; i++) {
    const p = points[i], prev = points[i - 1];
    if (p.home_goals !== prev.home_goals || p.away_goals !== prev.away_goals)
      goals.push({ x: x(i), label: `${p.home_goals}-${p.away_goals}` });
  }

  const hc = teamColor(homeCode);
  const ac = teamColor(awayCode);
  return (
    <>
      <h2 className="section-title">{t("momentum.title")}</h2>
      <div className="card">
        <div style={styles.legend}>
          <span><span style={{ ...styles.dot, background: hc }} /> {homeName}</span>
          <span style={{ color: "var(--text-low)" }}>{t("momentum.higher")}</span>
          <span>{awayName} <span style={{ ...styles.dot, background: ac }} /></span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
             style={{ display: "block", borderRadius: 4 }}>
          <polygon points={homeArea} fill={hc} fillOpacity="0.8" />
          <polygon points={awayArea} fill={ac} fillOpacity="0.8" />
          <line x1="0" y1={H / 2} x2={W} y2={H / 2}
                stroke="var(--text-low)" strokeWidth="0.5" strokeDasharray="3 3" />
          {goals.map((g, i) => (
            <g key={i}>
              <line x1={g.x} y1="0" x2={g.x} y2={H} stroke="#fff" strokeWidth="1" strokeOpacity="0.6" />
              <circle cx={g.x} cy="8" r="3" fill="#fff" />
            </g>
          ))}
        </svg>
        <div style={styles.axis}>
          <span>0'</span><span>45'</span><span>90'</span>
        </div>
        <p style={{ color: "var(--text-low)", fontSize: 12, margin: "8px 0 0" }}>
          {goals.length > 0 && <>⚽ {goals.map((g) => g.label).join(" · ")} · </>}
          {t("momentum.note")}
        </p>
        <Disclaimer />
      </div>
    </>
  );
}

const styles = {
  legend: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 13, fontWeight: 600, marginBottom: 8,
  },
  dot: { display: "inline-block", width: 10, height: 10, borderRadius: 3, verticalAlign: "middle" },
  axis: {
    display: "flex", justifyContent: "space-between",
    color: "var(--text-low)", fontSize: 11, marginTop: 4,
  },
};
