import { useLang } from "../lib/i18n";
import { teamColor } from "../lib/teamColors";

// Glowing three-segment win/draw/loss bar.
export default function ProbBar({ pHome, pDraw, pAway, homeCode, awayCode, compact = false }) {
  const { t, tTeam } = useLang();
  if (pHome == null) return null;
  const seg = (p, color, glow) => ({
    width: `${Math.max(p * 100, 2)}%`,
    background: color,
    boxShadow: glow ? `0 0 12px color-mix(in srgb, ${color} 55%, transparent)` : "none",
    transition: "width .4s ease",
  });
  return (
    <div>
      {!compact && (
        <div style={styles.labels}>
          <span style={{ color: teamColor(homeCode) }}>{tTeam(homeCode)} {Math.round(pHome * 100)}%</span>
          <span style={{ color: "var(--text-low)" }}>{t("prob.draw")} {Math.round(pDraw * 100)}%</span>
          <span style={{ color: teamColor(awayCode) }}>{Math.round(pAway * 100)}% {tTeam(awayCode)}</span>
        </div>
      )}
      <div style={styles.track}>
        <div style={seg(pHome, teamColor(homeCode), true)} />
        <div style={seg(pDraw, "var(--draw)", false)} />
        <div style={seg(pAway, teamColor(awayCode), true)} />
      </div>
    </div>
  );
}

const styles = {
  labels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
  },
  track: {
    display: "flex",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    gap: 2,
    background: "var(--bg-elevated)",
  },
};
