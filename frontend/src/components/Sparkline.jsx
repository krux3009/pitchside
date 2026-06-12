// Tiny SVG polyline; values are small non-negative ints (goal contributions).
export default function Sparkline({ values, width = 120, height = 28 }) {
  if (!values?.length) return <span style={{ color: "var(--text-low)" }}>–</span>;
  const max = Math.max(...values, 1);
  const step = width / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${i * step},${height - 4 - (v / max) * (height - 8)}`)
    .join(" ");
  return (
    <svg width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={height - 4 - (v / max) * (height - 8)}
          r="2.5"
          fill={v > 0 ? "var(--gold)" : "var(--text-low)"}
        />
      ))}
    </svg>
  );
}
