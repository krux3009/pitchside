import Disclaimer from "./Disclaimer";
import ProbBar from "./ProbBar";
import { useLang } from "../lib/i18n";
import { teamColor } from "../lib/teamColors";

const W = 320;
const H = 140;

// A single line tracing the home team's win probability over the match (0–100%),
// against a 50% "even" reference. Draw and away odds aren't on the line — they're
// in the readout bar above, which shows all three outcomes at the latest minute.
export default function Momentum({ points, homeCode, awayCode }) {
  const { t, tTeam } = useLang();
  if (!points || points.length < 2) return null;

  const x = (i) => (i / (points.length - 1)) * W;
  const line = points.map((p, i) => `${x(i)},${H * (1 - p.p_home)}`);
  const lineStr = line.join(" ");
  const fillArea = `${lineStr} ${W},${H} 0,${H}`; // close the line down to the baseline

  // a marker each time the scoreline changes (sampled, so to the nearest 5')
  const goals = [];
  for (let i = 1; i < points.length; i++) {
    const p = points[i], prev = points[i - 1];
    if (p.home_goals !== prev.home_goals || p.away_goals !== prev.away_goals)
      goals.push({ x: x(i), label: `${p.home_goals}-${p.away_goals}` });
  }

  const hc = teamColor(homeCode);
  const last = points[points.length - 1];
  return (
    <>
      <h2 className="section-title">{t("momentum.title")}</h2>
      <div className="card">
        <div style={styles.readout}>
          <span style={styles.nowLabel}>{last.minute}' · {t("momentum.now")}</span>
        </div>
        <ProbBar pHome={last.p_home} pDraw={last.p_draw} pAway={last.p_away}
                 homeCode={homeCode} awayCode={awayCode} />
        <div style={styles.chartWrap}>
          <span style={{ ...styles.yLabel, top: 0 }}>100%</span>
          <span style={{ ...styles.yLabel, top: "50%", transform: "translateY(-50%)" }}>50%</span>
          <span style={{ ...styles.yLabel, bottom: 0 }}>0%</span>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
               style={{ display: "block", borderRadius: 4 }}>
            <line x1="0" y1={H / 2} x2={W} y2={H / 2}
                  stroke="var(--text-low)" strokeWidth="0.5" strokeDasharray="3 3" />
            <polygon points={fillArea} fill={hc} fillOpacity="0.15" />
            <polyline points={lineStr} fill="none" stroke={hc} strokeWidth="2"
                      strokeLinejoin="round" strokeLinecap="round"
                      vectorEffect="non-scaling-stroke" />
            {goals.map((g, i) => (
              <g key={i}>
                <line x1={g.x} y1="0" x2={g.x} y2={H} stroke="#fff" strokeWidth="1" strokeOpacity="0.6" />
                <circle cx={g.x} cy="8" r="3" fill="#fff" />
              </g>
            ))}
          </svg>
        </div>
        <div style={styles.axis}>
          <span>0'</span><span>45'</span><span>90'</span>
        </div>
        <p style={styles.caption}>
          <span style={{ color: hc, fontWeight: 600 }}>{tTeam(homeCode)}</span> {t("momentum.lineLabel")} · {t("momentum.even")} = 50%
        </p>
        <p style={{ color: "var(--text-low)", fontSize: 12, margin: "4px 0 0" }}>
          {goals.length > 0 && <>⚽ {goals.map((g) => g.label).join(" · ")} · </>}
          {t("momentum.note")}
        </p>
        <Disclaimer />
      </div>
    </>
  );
}

const styles = {
  readout: { display: "flex", justifyContent: "flex-end", marginBottom: 4 },
  nowLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-low)" },
  chartWrap: { position: "relative", paddingLeft: 28, marginTop: 10 },
  yLabel: {
    position: "absolute", left: 0, width: 24, textAlign: "right",
    fontSize: 10, color: "var(--text-low)", lineHeight: 1,
  },
  axis: {
    display: "flex", justifyContent: "space-between",
    color: "var(--text-low)", fontSize: 11, marginTop: 4, paddingLeft: 28,
  },
  caption: { color: "var(--text-mid)", fontSize: 12, margin: "8px 0 0" },
};
