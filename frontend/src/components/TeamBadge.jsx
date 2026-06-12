import { useLang } from "../lib/i18n";
import { teamFlag } from "../lib/teamColors";

export default function TeamBadge({ code, name, size = 20, showName = true }) {
  const { tTeam } = useLang();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: size, lineHeight: 1 }}>{teamFlag(code)}</span>
      {showName && <span>{tTeam(code, name)}</span>}
    </span>
  );
}
