import { ColdStartLoader, ErrorState } from "../components/Loaders";
import TeamBadge from "../components/TeamBadge";
import { useLang } from "../lib/i18n";
import { useApi } from "../lib/useApi";

// Order is the official 2026 table from the API — never re-sort it client-side.
const COLUMNS = ["played", "won", "drawn", "lost", "gf", "ga", "gd", "pts"];
// phones keep the essentials (P / GD / Pts); the rest hide via .col-wide
const WIDE = new Set(["won", "drawn", "lost", "gf", "ga"]);
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

// Tolerate a CDN snapshot published before won/drawn/lost/ga existed: GA is
// always derivable (gf - gd); w/d/l can't be, so show an en-dash until the
// next republish carries them, rather than a blank cell that looks misaligned.
const cell = (r, key) => {
  if (key === "gd") return signed(r.gd);
  if (key === "ga") return r.ga ?? r.gf - r.gd;
  return r[key] ?? "–";
};

export default function Groups() {
  const { t } = useLang();
  const { data, loading, error } = useApi("/api/standings");

  if (loading) return <ColdStartLoader />;
  if (error) return <ErrorState error={error} />;

  const groups = data ?? [];
  const played = groups.some((g) => g.table.some((r) => r.played > 0));

  return (
    <>
      <h1 className="page-title">{t("groups.title")}</h1>
      <p style={{ color: "var(--text-low)", marginTop: -8 }}>
        <span style={styles.cut} aria-hidden="true" /> {t("groups.qualify")}
      </p>

      {!played && <p style={{ color: "var(--text-mid)" }}>{t("groups.empty")}</p>}

      {groups.map((g) => (
        <section key={g.group}>
          <h2 className="section-title">{t("groups.group", { letter: g.group })}</h2>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            {/* fixed layout + shared colgroup so all 12 tables share one grid —
                otherwise each auto-sizes to its own team names and the numeric
                columns don't line up vertically across groups */}
            <table className="stat-table groups-table" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col className="gcol-pos" />
                <col className="gcol-team" />
                {COLUMNS.map((key) => (
                  <col key={key} className={`gcol-num${WIDE.has(key) ? " col-wide" : ""}`} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>{t("groups.pos")}</th>
                  <th>{t("players.team")}</th>
                  {COLUMNS.map((key) => (
                    <th key={key} className={`num${WIDE.has(key) ? " col-wide" : ""}`}>
                      {t("groups.col." + key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.table.map((r) => (
                  // rank<=2 auto-advance: faint tint + grass "advancing" strip,
                  // with a gold cut line under 2nd
                  <tr
                    key={r.team_id}
                    className={r.rank <= 2 ? "qualify-row" : undefined}
                  >
                    <td style={r.rank === 2 ? styles.cutCell : undefined}>{r.rank}</td>
                    <td style={r.rank === 2 ? styles.cutCell : undefined}>
                      <TeamBadge code={r.code} name={r.name} />
                    </td>
                    {COLUMNS.map((key) => (
                      <td
                        key={key}
                        className={`num${WIDE.has(key) ? " col-wide" : ""}`}
                        style={{
                          ...(r.rank === 2 ? styles.cutCell : {}),
                          ...(key === "pts" ? { fontWeight: 700 } : {}),
                        }}
                      >
                        {cell(r, key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}

const styles = {
  cutCell: { borderBottom: "2px solid var(--gold)" },
  cut: {
    display: "inline-block",
    width: 14,
    height: 0,
    borderTop: "2px solid var(--gold)",
    verticalAlign: "middle",
    marginRight: 2,
  },
};
