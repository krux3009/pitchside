import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ColdStartLoader, ErrorState } from "../components/Loaders";
import TeamBadge from "../components/TeamBadge";
import { useApi } from "../lib/useApi";

const COLUMNS = [
  ["goals", "G"],
  ["assists", "A"],
  ["goals_per_90", "G/90"],
  ["team_goal_share", "Share"],
  ["minutes", "Min"],
  ["apps", "Apps"],
];

export default function PlayerIndex() {
  const { data, loading, error } = useApi("/api/players");
  const [sort, setSort] = useState("goals");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!data) return [];
    const filtered = q
      ? data.filter((p) =>
          (p.name + p.team_name).toLowerCase().includes(q.toLowerCase()))
      : data;
    return [...filtered].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));
  }, [data, sort, q]);

  if (loading) return <ColdStartLoader />;
  if (error) return <ErrorState error={error} />;

  return (
    <>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "28px 0 12px" }}>
        Players
      </h1>
      <input
        placeholder="Search player or team…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={styles.search}
      />
      {rows.length === 0 && (
        <p style={{ color: "var(--text-mid)" }}>
          Player statistics appear once matches have been played.
        </p>
      )}
      {rows.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="stat-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                {COLUMNS.map(([key, label]) => (
                  <th
                    key={key}
                    className="num"
                    style={{ cursor: "pointer", color: sort === key ? "var(--gold)" : undefined }}
                    onClick={() => setSort(key)}
                  >
                    {label}{sort === key ? " ▾" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((p) => (
                <tr key={p.player_id}>
                  <td>
                    <Link to={`/players/${p.player_id}`} style={{ fontWeight: 600 }}>
                      {p.name}
                    </Link>{" "}
                    <span style={{ color: "var(--text-low)", fontSize: 12 }}>{p.position}</span>
                  </td>
                  <td><TeamBadge code={p.team_code} name={p.team_code} /></td>
                  <td className="num">{p.goals}</td>
                  <td className="num">{p.assists}</td>
                  <td className="num">{p.goals_per_90 ?? "–"}</td>
                  <td className="num">{Math.round((p.team_goal_share ?? 0) * 100)}%</td>
                  <td className="num">{p.minutes}</td>
                  <td className="num">{p.apps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const styles = {
  search: {
    width: "100%", maxWidth: 360, padding: "9px 12px", marginBottom: 14,
    background: "var(--bg-surface)", border: "1px solid var(--line)",
    borderRadius: 8, color: "var(--text-hi)", fontSize: 14, outline: "none",
  },
};
