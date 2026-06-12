import { teamFlag } from "../lib/teamColors";

export default function TeamBadge({ code, name, size = 20, showName = true }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: size, lineHeight: 1 }}>{teamFlag(code)}</span>
      {showName && <span>{name ?? code}</span>}
    </span>
  );
}
