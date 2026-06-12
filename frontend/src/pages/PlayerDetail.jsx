import { Link, useParams } from "react-router-dom";

import { ColdStartLoader, ErrorState } from "../components/Loaders";
import Sparkline from "../components/Sparkline";
import TeamBadge from "../components/TeamBadge";
import { useApi } from "../lib/useApi";

export default function PlayerDetail() {
  const { id } = useParams();
  const { data: p, loading, error } = useApi(`/api/players/${id}`);

  if (loading) return <ColdStartLoader />;
  if (error) return <ErrorState error={error} />;

  const t = p.totals;
  const statCards = t
    ? [
        ["Goals", t.goals],
        ["Assists", t.assists],
        ["Goals / 90", t.goals_per_90 ?? "–"],
        ["Share of team goals", Math.round(p.team_goal_share * 100) + "%"],
        ["Minutes", t.minutes],
        ["Appearances", t.apps],
        ["Yellow cards", t.yellows],
        ["Red cards", t.reds],
      ]
    : [];

  return (
    <>
      <div className="card" style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "center" }}>
        {p.photo_url && (
          <img src={p.photo_url} alt="" width="64" height="64"
               style={{ borderRadius: "50%", background: "var(--bg-elevated)" }} />
        )}
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, margin: 0 }}>
            {p.name}
          </h1>
          <p style={{ color: "var(--text-mid)", margin: "4px 0 0" }}>
            <TeamBadge code={p.team_code} name={p.team_name} />{" "}
            · {p.position} {p.shirt_number ? `· #${p.shirt_number}` : ""}
            {p.date_of_birth ? ` · ${age(p.date_of_birth)} yrs` : ""}
          </p>
        </div>
      </div>

      {t ? (
        <>
          <h2 className="section-title">Tournament</h2>
          <div style={styles.grid}>
            {statCards.map(([label, value]) => (
              <div key={label} className="card" style={{ textAlign: "center" }}>
                <div className="score" style={{ fontSize: 26 }}>{value}</div>
                <div style={{ color: "var(--text-low)", fontSize: 12 }}>{label}</div>
              </div>
            ))}
          </div>

          <h2 className="section-title">Form (goal contributions, last 5)</h2>
          <div className="card">
            <Sparkline values={p.form} width={220} height={40} />
          </div>

          <h2 className="section-title">Match Log</h2>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="stat-table">
              <thead>
                <tr>
                  <th>Match</th><th className="num">Min</th><th className="num">G</th>
                  <th className="num">A</th><th className="num">Shots</th><th className="num">Cards</th>
                </tr>
              </thead>
              <tbody>
                {p.match_log.map((r) => (
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
        <p style={{ color: "var(--text-mid)", marginTop: 20 }}>No minutes played yet.</p>
      )}
    </>
  );
}

function age(dob) {
  const ms = Date.now() - new Date(dob).getTime();
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
}

const styles = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 },
};
