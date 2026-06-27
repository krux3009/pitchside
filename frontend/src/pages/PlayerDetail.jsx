import { Link, useParams } from "react-router-dom";

import { ColdStartLoader, ErrorState } from "../components/Loaders";
import Sparkline from "../components/Sparkline";
import TeamBadge from "../components/TeamBadge";
import { ageFromDob } from "../lib/format";
import { useLang } from "../lib/i18n";
import { useApi } from "../lib/useApi";

export default function PlayerDetail() {
  const { t } = useLang();
  const { id } = useParams();
  const { data: p, loading, error } = useApi(`/api/players/${id}`);

  if (loading) return <ColdStartLoader />;
  if (error) return <ErrorState error={error} />;

  const tot = p.totals;
  const clubs = (p.career || []).filter((c) => !c.is_national);
  const international = (p.career || []).filter((c) => c.is_national);
  const statCards = tot
    ? [
        [t("player.goals"), tot.goals],
        [t("player.assists"), tot.assists],
        [t("player.goalsPer90"), tot.goals_per_90 ?? "–"],
        [t("player.share"), Math.round((p.team_goal_share ?? 0) * 100) + "%"],
        [t("player.minutes"), tot.minutes],
        [t("player.apps"), tot.apps],
        [t("player.yellows"), tot.yellows],
        [t("player.reds"), tot.reds],
      ]
    : [];

  return (
    <>
      <div className="card" style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "center" }}>
        {p.photo_url && (
          <img src={p.photo_url} alt="" width="64" height="64"
               style={{ borderRadius: "50%", background: "var(--bg-elevated)" }}
               onError={(e) => { e.currentTarget.style.display = "none"; }} />
        )}
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: 0 }}>
            {p.name}
          </h1>
          <p style={{ color: "var(--text-mid)", margin: "4px 0 0" }}>
            <TeamBadge code={p.team_code} name={p.team_name} />{" "}
            · {p.position} {p.shirt_number ? `· #${p.shirt_number}` : ""}
            {p.date_of_birth ? <> · {t("player.age", { n: ageFromDob(p.date_of_birth) })}</> : ""}
          </p>
        </div>
      </div>

      {tot ? (
        <>
          <h2 className="section-title">{t("player.tournament")}</h2>
          <div style={styles.grid}>
            {statCards.map(([label, value]) => (
              <div key={label} className="card" style={{ textAlign: "center" }}>
                <div className="score" style={{ fontSize: 26 }}>{value}</div>
                <div style={{ color: "var(--text-low)", fontSize: 12 }}>{label}</div>
              </div>
            ))}
          </div>

          <h2 className="section-title">{t("player.form")}</h2>
          <div className="card">
            <Sparkline values={p.form} width={220} height={40} />
          </div>

          <h2 className="section-title">{t("player.matchLog")}</h2>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="stat-table">
              <thead>
                <tr>
                  <th>{t("player.log.match")}</th><th className="num">{t("player.log.min")}</th>
                  <th className="num">{t("players.col.goals")}</th>
                  <th className="num">{t("players.col.assists")}</th>
                  <th className="num">{t("player.log.shots")}</th>
                  <th className="num">{t("player.log.cards")}</th>
                </tr>
              </thead>
              <tbody>
                {(p.match_log ?? []).map((r) => (
                  <tr key={r.match_id}>
                    <td>
                      <Link to={`/matches/${r.match_id}`}>
                        {r.home_code} {r.home_goals}–{r.away_goals} {r.away_code}
                      </Link>
                    </td>
                    <td className="num">{r.minutes}′</td>
                    <td className="num">{r.goals}</td>
                    <td className="num">{r.assists}</td>
                    <td className="num">{r.shots}</td>
                    <td className="num">
                      {"🟨".repeat(r.yellow || 0)}{"🟥".repeat(r.red || 0) || (r.yellow ? "" : "–")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p style={{ color: "var(--text-mid)", marginTop: 20 }}>
          {t("player.noMinutes")}
        </p>
      )}

      <CareerTable title={t("player.clubCareer")} rows={clubs} />
      <CareerTable title={t("player.international")} rows={international} localizeNames />
      {p.career?.length > 0 && (
        <p style={{ color: "var(--text-low)", fontSize: 12, marginTop: 8 }}>
          {t("player.careerNote")}
        </p>
      )}
    </>
  );
}

function CareerTable({ title, rows, localizeNames = false }) {
  const { t, tCountry } = useLang();
  if (!rows.length) return null;
  const hasCleanSheets = rows.some((c) => c.clean_sheets != null);
  // ponytail: the side with the latest season is treated as still-active (these
  // are current-tournament players) so its end year reads "present", not a year
  // that looks like a departure. Upgrade to a real current-club flag if a player
  // is ever between clubs at tournament time.
  const latestYear = Math.max(...rows.map((c) => c.to_year));
  return (
    <>
      <h2 className="section-title">{title}</h2>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="stat-table">
          <thead>
            <tr>
              <th>{t("player.career.team")}</th>
              <th className="num">{t("player.career.years")}</th>
              <th className="num">{t("player.career.starts")}</th>
              <th className="num">{t("players.col.goals")}</th>
              <th className="num">{t("players.col.assists")}</th>
              {hasCleanSheets && <th className="num">{t("player.career.cs")}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={`${c.team_name}-${c.from_year}`}>
                <td>{localizeNames ? tCountry(c.team_name) : c.team_name}</td>
                <td className="num">
                  {c.to_year === latestYear
                    ? `${c.from_year}–${t("player.career.present")}`
                    : c.from_year === c.to_year
                      ? c.from_year
                      : `${c.from_year}–${c.to_year}`}
                </td>
                <td className="num">{c.starts ?? "–"}</td>
                <td className="num">{c.goals ?? "–"}</td>
                <td className="num">{c.assists ?? "–"}</td>
                {hasCleanSheets && <td className="num">{c.clean_sheets ?? "–"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const styles = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 },
};
