import { useFactBar } from "../lib/factBar";
import { useLang } from "../lib/i18n";
import { teamFlag, teamFlagUrl } from "../lib/teamColors";

export default function TeamBadge({ code, name, size = 20 }) {
  const { tTeam } = useLang();
  const { showTeam, clear } = useFactBar();
  const url = teamFlagUrl(code);
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      onMouseEnter={() => code && showTeam(code, name)}
      onMouseLeave={clear}
    >
      {url ? (
        <img
          src={url}
          alt=""
          width={Math.round(size * 4 / 3)}
          height={size}
          loading="lazy"
          style={{
            borderRadius: 2,
            boxShadow: "0 0 0 1px var(--line)", // light flags need an edge on dark
            flexShrink: 0,
          }}
        />
      ) : (
        <span style={{ fontSize: size, lineHeight: 1 }}>{teamFlag(code)}</span>
      )}
      <span>{tTeam(code, name)}</span>
    </span>
  );
}
