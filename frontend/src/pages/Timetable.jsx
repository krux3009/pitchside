import { useMemo, useState } from "react";

import { ColdStartLoader, ErrorState } from "../components/Loaders";
import MatchCard from "../components/MatchCard";
import { localDateHeading, STAGE_LABEL } from "../lib/format";
import { useApi } from "../lib/useApi";

const STAGES = ["ALL", "GROUP", "R32", "R16", "QF", "SF", "FINAL"];
const GROUPS = ["ALL", ..."ABCDEFGHIJKL"];

export default function Timetable() {
  const { data, loading, error } = useApi("/api/matches");
  const [stage, setStage] = useState("ALL");
  const [group, setGroup] = useState("ALL");

  const byDate = useMemo(() => {
    if (!data) return [];
    const filtered = data.filter(
      (m) =>
        (stage === "ALL" || m.stage === stage) &&
        (group === "ALL" || m.group_letter === group)
    );
    const days = new Map();
    for (const m of filtered) {
      const day = m.kickoff_utc.slice(0, 10);
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(m);
    }
    return [...days.entries()];
  }, [data, stage, group]);

  if (loading) return <ColdStartLoader />;
  if (error) return <ErrorState error={error} />;

  return (
    <>
      <h1 style={styles.h1}>Timetable</h1>
      <div style={styles.filters}>
        {STAGES.map((s) => (
          <span
            key={s}
            className={`pill ${stage === s ? "active" : ""}`}
            onClick={() => setStage(s)}
          >
            {s === "ALL" ? "All stages" : STAGE_LABEL[s]}
          </span>
        ))}
      </div>
      {stage !== "R32" && stage !== "R16" && stage !== "QF" && stage !== "SF" && stage !== "FINAL" && (
        <div style={styles.filters}>
          {GROUPS.map((g) => (
            <span
              key={g}
              className={`pill ${group === g ? "active" : ""}`}
              onClick={() => setGroup(g)}
            >
              {g === "ALL" ? "All groups" : `Group ${g}`}
            </span>
          ))}
        </div>
      )}

      {byDate.map(([day, matches]) => (
        <section key={day}>
          <h2 className="section-title">{localDateHeading(day)}</h2>
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
  h1: { fontFamily: "var(--font-display)", fontSize: 28, margin: "28px 0 12px" },
  filters: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 },
};
