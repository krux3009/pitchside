import { useEffect, useMemo, useState } from "react";

import Disclaimer from "../components/Disclaimer";
import { ColdStartLoader, ErrorState } from "../components/Loaders";
import Sparkline from "../components/Sparkline";
import StatCompareRow from "../components/StatCompareRow";
import TeamBadge from "../components/TeamBadge";
import { apiGet } from "../lib/api";
import { useLang } from "../lib/i18n";
import { useApi } from "../lib/useApi";

// Overall tournament record per team, summed client-side from the match list
// (no team endpoint — results-based, so it works straight off the CDN matches.json).
function teamRecords(matches) {
  const agg = {};
  const blank = () => ({ played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 });
  for (const m of matches) {
    if (m.status !== "FT" || m.home_goals == null || m.away_goals == null) continue;
    for (const [id, gf, ga] of [
      [m.home_id, m.home_goals, m.away_goals],
      [m.away_id, m.away_goals, m.home_goals],
    ]) {
      if (id == null) continue;
      const r = (agg[id] ||= blank());
      r.played++; r.gf += gf; r.ga += ga;
      if (gf > ga) { r.won++; r.pts += 3; }
      else if (gf === ga) { r.drawn++; r.pts += 1; }
      else r.lost++;
    }
  }
  return agg;
}

function Picker({ value, onChange, children, label }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label}</option>
      {children}
    </select>
  );
}

function Header({ a, b }) {
  return (
    <div style={styles.header}>
      <span style={{ fontWeight: 700 }}><TeamBadge code={a.code} name={a.name} /></span>
      <span style={{ color: "var(--text-low)", fontSize: 13 }}>vs</span>
      <span style={{ fontWeight: 700 }}><TeamBadge code={b.code} name={b.name} /></span>
    </div>
  );
}

function TeamCompare() {
  const { t, tTeam } = useLang();
  const standings = useApi("/api/standings");
  const matches = useApi("/api/matches");
  const sim = useApi("/api/sim/championship");
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const teams = useMemo(() => {
    const out = [];
    for (const g of standings.data ?? [])
      for (const row of g.table)
        out.push({ id: row.team_id, name: row.name, code: row.code, group: g.group });
    return out;
  }, [standings.data]);

  const records = useMemo(() => teamRecords(matches.data ?? []), [matches.data]);
  const champ = useMemo(() => {
    const m = {};
    for (const tm of sim.data?.teams ?? []) m[tm.team_id] = tm.p_champion;
    return m;
  }, [sim.data]);

  if (standings.loading || matches.loading) return <ColdStartLoader />;
  if (standings.error || matches.error)
    return <ErrorState error={standings.error || matches.error} />;

  const ta = teams.find((x) => String(x.id) === a);
  const tb = teams.find((x) => String(x.id) === b);
  const ra = records[a] ?? {};
  const rb = records[b] ?? {};
  const options = teams
    .slice()
    .sort((x, y) => x.group.localeCompare(y.group) || tTeam(x.code, x.name).localeCompare(tTeam(y.code, y.name)))
    .map((tm) => (
      <option key={tm.id} value={tm.id}>{tTeam(tm.code, tm.name)} · {tm.group}</option>
    ));

  return (
    <>
      <div className="filter-row">
        <Picker value={a} onChange={setA} label={t("compare.selectTeam")}>{options}</Picker>
        <Picker value={b} onChange={setB} label={t("compare.selectTeam")}>{options}</Picker>
      </div>
      {ta && tb ? (
        <div className="card" style={{ marginTop: 14 }}>
          <Header a={ta} b={tb} />
          <StatCompareRow label={t("compare.played")} home={ra.played} away={rb.played} homeCode={ta.code} awayCode={tb.code} />
          <StatCompareRow label={t("compare.won")} home={ra.won} away={rb.won} homeCode={ta.code} awayCode={tb.code} />
          <StatCompareRow label={t("compare.drawn")} home={ra.drawn} away={rb.drawn} homeCode={ta.code} awayCode={tb.code} />
          <StatCompareRow label={t("compare.lost")} home={ra.lost} away={rb.lost} homeCode={ta.code} awayCode={tb.code} />
          <StatCompareRow label={t("compare.gf")} home={ra.gf} away={rb.gf} homeCode={ta.code} awayCode={tb.code} />
          <StatCompareRow label={t("compare.ga")} home={ra.ga} away={rb.ga} homeCode={ta.code} awayCode={tb.code} />
          <StatCompareRow label={t("compare.pts")} home={ra.pts} away={rb.pts} homeCode={ta.code} awayCode={tb.code} />
          {(champ[a] != null || champ[b] != null) && (
            <>
              <StatCompareRow
                label={t("compare.champ")}
                home={champ[a] != null ? Math.round(champ[a] * 100) : null}
                away={champ[b] != null ? Math.round(champ[b] * 100) : null}
                homeCode={ta.code} awayCode={tb.code} suffix="%"
              />
              <Disclaimer />
            </>
          )}
        </div>
      ) : (
        <p style={styles.empty}>{t("compare.empty")}</p>
      )}
    </>
  );
}

function usePlayer(id) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!id) { setData(null); return; }
    let alive = true;
    apiGet(`/api/players/${id}`).then((d) => alive && setData(d)).catch(() => alive && setData(null));
    return () => { alive = false; };
  }, [id]);
  return data;
}

function PlayerCompare() {
  const { t, tTeam } = useLang();
  const list = useApi("/api/players");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const pa = usePlayer(a);
  const pb = usePlayer(b);

  if (list.loading) return <ColdStartLoader />;
  if (list.error) return <ErrorState error={list.error} />;

  // index is pre-sorted by goals desc, so notable players surface first
  const options = (list.data ?? []).map((p) => (
    <option key={p.player_id} value={p.player_id}>
      {p.name} · {tTeam(p.team_code, p.team_name)}
    </option>
  ));

  const ready = pa && pb;
  const ga = pa?.totals ?? {};
  const gb = pb?.totals ?? {};
  const row = (label, key, opts = {}) => (
    <StatCompareRow
      label={label} home={ga[key]} away={gb[key]}
      homeCode={pa.team_code} awayCode={pb.team_code} {...opts}
    />
  );

  return (
    <>
      <div className="filter-row">
        <Picker value={a} onChange={setA} label={t("compare.selectPlayer")}>{options}</Picker>
        <Picker value={b} onChange={setB} label={t("compare.selectPlayer")}>{options}</Picker>
      </div>
      {ready ? (
        <div className="card" style={{ marginTop: 14 }}>
          <Header a={{ code: pa.team_code, name: pa.name }} b={{ code: pb.team_code, name: pb.name }} />
          {row(t("player.goals"), "goals")}
          {row(t("player.assists"), "assists")}
          {row(t("player.minutes"), "minutes")}
          {row(t("player.apps"), "apps")}
          {row(t("player.goalsPer90"), "goals_per_90")}
          {row(t("player.yellows"), "yellows")}
          {row(t("player.reds"), "reds")}
          <StatCompareRow
            label={t("player.share")}
            home={Math.round((pa.team_goal_share ?? 0) * 100)}
            away={Math.round((pb.team_goal_share ?? 0) * 100)}
            homeCode={pa.team_code} awayCode={pb.team_code} suffix="%"
          />
          <div style={styles.forms}>
            <div>
              <div style={styles.formLabel}>{pa.name}</div>
              <Sparkline values={pa.form} />
            </div>
            <span style={{ color: "var(--text-low)", fontSize: 12, alignSelf: "center" }}>
              {t("compare.form")}
            </span>
            <div style={{ textAlign: "right" }}>
              <div style={styles.formLabel}>{pb.name}</div>
              <Sparkline values={pb.form} />
            </div>
          </div>
        </div>
      ) : (
        <p style={styles.empty}>{t("compare.empty")}</p>
      )}
    </>
  );
}

export default function Compare() {
  const { t } = useLang();
  const [mode, setMode] = useState("teams");
  return (
    <>
      <h1 className="page-title">{t("compare.title")}</h1>
      <p style={{ color: "var(--text-low)", marginTop: -8 }}>{t("compare.lead")}</p>
      <div className="filter-row" style={{ marginBottom: 4 }}>
        {["teams", "players"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`nav-link${mode === m ? " active" : ""}`}
            style={styles.toggle}
          >
            {t(`compare.${m}`)}
          </button>
        ))}
      </div>
      {mode === "teams" ? <TeamCompare /> : <PlayerCompare />}
    </>
  );
}

const styles = {
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 8, paddingBottom: 10, marginBottom: 6, borderBottom: "1px solid var(--line)",
  },
  empty: { color: "var(--text-mid)", marginTop: 18 },
  forms: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
    gap: 12, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)",
  },
  formLabel: { fontSize: 12, color: "var(--text-mid)", marginBottom: 4 },
  toggle: { background: "none", border: "1px solid var(--line)", cursor: "pointer" },
};
