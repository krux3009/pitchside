import { teamColor } from "../lib/teamColors";

// Mirrored bars meeting in the middle.
export default function StatCompareRow({ label, home, away, homeCode, awayCode, suffix = "" }) {
  const h = home ?? 0;
  const a = away ?? 0;
  const total = h + a || 1;
  return (
    <div style={{ margin: "10px 0" }}>
      <div style={styles.labels}>
        <span className="mono-num">{home ?? "–"}{suffix}</span>
        <span style={{ color: "var(--text-low)", fontSize: 12 }}>{label}</span>
        <span className="mono-num">{away ?? "–"}{suffix}</span>
      </div>
      <div style={styles.track}>
        <div style={{ display: "flex", justifyContent: "flex-end", width: "50%" }}>
          <div style={{ width: `${(h / total) * 100}%`, background: teamColor(homeCode), borderRadius: "3px 0 0 3px" }} />
        </div>
        <div style={{ width: "50%" }}>
          <div style={{ width: `${(a / total) * 100}%`, background: teamColor(awayCode), borderRadius: "0 3px 3px 0" }} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  labels: { display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, marginBottom: 4 },
  track: { display: "flex", height: 6, background: "var(--bg-elevated)", borderRadius: 3 },
};
