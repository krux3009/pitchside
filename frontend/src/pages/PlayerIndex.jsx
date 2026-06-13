import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ColdStartLoader, ErrorState } from "../components/Loaders";
import TeamBadge from "../components/TeamBadge";
import { useFactBar } from "../lib/factBar";
import { useLang } from "../lib/i18n";
import { useApi } from "../lib/useApi";

const COLUMNS = ["goals", "assists", "goals_per_90", "team_goal_share", "minutes", "apps"];

export default function PlayerIndex() {
  const { t } = useLang();
  const { showPlayer, clear } = useFactBar();
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
      <h1 className="page-title">{t("players.title")}</h1>
      <input
        className="search"
        placeholder={t("players.search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={t("players.search")}
      />
      {rows.length === 0 && (
        <p style={{ color: "var(--text-mid)" }}>{t("players.none")}</p>
      )}
      {rows.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="stat-table">
            <thead>
              <tr>
                <th>{t("players.player")}</th>
                <th>{t("players.team")}</th>
                {COLUMNS.map((key) => (
                  <th key={key} className="num" aria-sort={sort === key ? "descending" : "none"}>
                    <button
                      type="button"
                      className={`th-sort${sort === key ? " th-sort--active" : ""}`}
                      onClick={() => setSort(key)}
                    >
                      {t("players.col." + key)}
                      <span className="th-sort__arrow" aria-hidden="true">▾</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.player_id}>
                  <td>
                    <Link
                      to={`/players/${p.player_id}`}
                      onMouseEnter={() => showPlayer(p.player_id, p.name)}
                      onMouseLeave={clear}
                      style={{ fontWeight: 600 }}
                    >
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
