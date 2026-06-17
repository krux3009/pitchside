import { useMemo, useState } from "react";

import { ColdStartLoader, ErrorState } from "../components/Loaders";
import MatchCard from "../components/MatchCard";
import { localDateHeading } from "../lib/format";
import { useLang } from "../lib/i18n";
import { useApi } from "../lib/useApi";

const STAGES = ["ALL", "GROUP", "R32", "R16", "QF", "SF", "FINAL"];
const GROUPS = ["ALL", ..."ABCDEFGHIJKL"];

export default function Timetable() {
  const { t, tTeam, dateLocale } = useLang();
  const { data, loading, error } = useApi("/api/matches");
  const [stage, setStage] = useState("ALL");
  const [group, setGroup] = useState("ALL");
  const [teamQ, setTeamQ] = useState("");

  const byDate = useMemo(() => {
    if (!data) return [];
    const q = teamQ.trim().toLowerCase();
    const filtered = data.filter((m) => {
      const stageOk = stage === "ALL" || m.stage === stage;
      const groupOk = group === "ALL" || m.group_letter === group;
      const teamOk =
        !q ||
        [
          m.home_name, m.away_name, m.home_code, m.away_code, m.home_slot, m.away_slot,
          tTeam(m.home_code, m.home_name), tTeam(m.away_code, m.away_name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      return stageOk && groupOk && teamOk;
    });
    const days = new Map();
    for (const m of filtered) {
      const day = m.kickoff_utc.slice(0, 10);
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(m);
    }
    return [...days.entries()];
  }, [data, stage, group, teamQ, tTeam]);

  // groups only exist in the group stage; reset a stale group pick when the user
  // moves to a knockout stage so the filter can't silently zero out the results.
  const showGroups = stage === "ALL" || stage === "GROUP";
  const onStageChange = (s) => {
    setStage(s);
    if (s !== "ALL" && s !== "GROUP") setGroup("ALL");
  };

  if (loading) return <ColdStartLoader />;
  if (error) return <ErrorState error={error} />;

  return (
    <>
      <h1 className="page-title">{t("timetable.title")}</h1>
      <input
        className="search"
        placeholder={t("timetable.search")}
        value={teamQ}
        onChange={(e) => setTeamQ(e.target.value)}
        aria-label={t("timetable.search")}
      />
      <div className="filter-row">
        <select
          className="select"
          value={stage}
          onChange={(e) => onStageChange(e.target.value)}
          aria-label={t("timetable.allStages")}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? t("timetable.allStages") : t("stage." + s)}
            </option>
          ))}
        </select>
        {showGroups && (
          <select
            className="select"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            aria-label={t("timetable.allGroups")}
          >
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g === "ALL" ? t("timetable.allGroups") : t("stage.group", { letter: g })}
              </option>
            ))}
          </select>
        )}
      </div>

      {byDate.length === 0 && (
        <p style={{ color: "var(--text-mid)", marginTop: 16 }}>{t("timetable.none")}</p>
      )}
      {byDate.map(([day, matches]) => (
        <section key={day}>
          <h2 className="section-title">{localDateHeading(day, dateLocale)}</h2>
          <div style={styles.grid}>
            {matches.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

const styles = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 },
};
