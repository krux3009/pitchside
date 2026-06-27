import { useFactBar } from "../lib/factBar";
import { useLang } from "../lib/i18n";
import { teamFlag } from "../lib/teamColors";

export default function TeamBadge({ code, name, size = 20 }) {
  const { tTeam } = useLang();
  const { showTeam, clear } = useFactBar();
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      onMouseEnter={() => code && showTeam(code, name)}
      onMouseLeave={clear}
    >
      <span style={{ fontSize: size, lineHeight: 1 }}>{teamFlag(code)}</span>
      <span>{tTeam(code, name)}</span>
    </span>
  );
}
