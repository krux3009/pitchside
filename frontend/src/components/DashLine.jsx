// Dash-anchored two-value line: the halves flank a centred separator, so the
// dash of every row (score, xG) sits on the same vertical axis no matter how
// wide either side's text is.
export default function DashLine({ left, right, className, style }) {
  return (
    <span
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        columnGap: 6,
        alignItems: "baseline",
        ...style,
      }}
    >
      <span style={{ textAlign: "right", minWidth: 0 }}>{left}</span>
      <span>–</span>
      <span style={{ textAlign: "left", minWidth: 0 }}>{right}</span>
    </span>
  );
}
