import { useFactBar } from "../lib/factBar";
import { useLang } from "../lib/i18n";
import { teamFlag } from "../lib/teamColors";

// Global hover fun-fact bar. Country facts are curated (fact.team.<CODE>);
// player facts are derived from real API data, so they are factual by
// construction. Pointer-only — CSS hides it on touch devices.
export default function FactBar() {
  const { fact } = useFactBar();
  const { t, tTeam } = useLang();

  let icon = "⚽";
  let title = "";
  let body = "";

  if (fact?.kind === "team") {
    icon = teamFlag(fact.code);
    title = tTeam(fact.code, fact.name);
    const key = "fact.team." + fact.code;
    const f = t(key);
    body = f === key ? "" : f; // t() returns the key when no curated fact exists
  } else if (fact?.kind === "player") {
    title = fact.name;
    body = fact.data ? playerFact(t, tTeam, fact.data) : t("fact.loading");
  }

  // A team with no curated fact yet shows nothing; players always show (name + …/line).
  const show = !!fact && (fact.kind === "player" || !!body);

  return (
    <div className={`fact-bar${show ? " fact-bar--open" : ""}`} aria-hidden={!show}>
      <div className="container fact-bar__inner">
        <span className="fact-bar__icon">{icon}</span>
        <span className="fact-bar__title">{title}</span>
        {body && <span className="fact-bar__body">{body}</span>}
      </div>
    </div>
  );
}

function playerFact(t, tTeam, p) {
  const clubs = (p.career || []).filter((c) => !c.is_national);
  const club = clubs.length
    ? clubs.reduce((best, c) => (c.to_year >= (best?.to_year ?? -1) ? c : best), null)?.team_name
    : null;
  const intlStarts = (p.career || [])
    .filter((c) => c.is_national)
    .reduce((n, c) => n + (c.starts ?? 0), 0);
  return t("fact.player", {
    team: tTeam(p.team_code, p.team_name),
    posLabel: p.position ? t("posOne." + p.position) : null,
    age: p.date_of_birth ? ageFrom(p.date_of_birth) : null,
    club,
    g: p.totals?.goals ?? 0,
    a: p.totals?.assists ?? 0,
    apps: p.totals?.apps ?? 0,
    intlStarts: intlStarts || null,
  });
}

function ageFrom(dob) {
  const ms = Date.now() - new Date(dob).getTime();
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
}
