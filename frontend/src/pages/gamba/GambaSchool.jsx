import { Link } from "react-router-dom";

import { useGamba } from "../../lib/gamba/GambaContext";
import { fmtG, impliedP, ledger, overround } from "../../lib/gamba/engine";
import { useLang } from "../../lib/i18n";
import { useApi } from "../../lib/useApi";

// "Why the book always wins" — the whole point of Gamba Mode, in numbers the
// visitor generated themselves.
export default function GambaSchool() {
  const { t, tCountry } = useLang();
  const { bets } = useGamba();
  const { data } = useApi("/api/odds");
  const lg = ledger(bets);

  // live overround demo from the first match carrying a real book
  const demo = data?.matches?.find((m) => m.real?.h2h && m.model);
  const demoPrices = demo
    ? ["home", "draw", "away"].map((s) => demo.real.h2h[s]?.median).filter(Boolean)
    : null;
  const demoRake = demoPrices?.length === 3 ? overround(demoPrices) : null;

  // model price vs real (closing-ish) consensus, every priced match
  const table = (data?.matches ?? [])
    .filter((m) => m.model && m.real?.h2h)
    .map((m) => ({
      id: m.match_id,
      name: `${tCountry(m.home_name)} v ${tCountry(m.away_name)}`,
      rows: ["home", "draw", "away"].map((s) => ({
        sel: s === "draw" ? t("gamba.sel.draw")
          : tCountry(s === "home" ? m.home_name : m.away_name),
        model: m.model.h2h[s].price,
        real: m.real.h2h[s]?.median,
      })),
    }));

  return (
    <>
      <h1 className="gamba-page-title">{t("gamba.school.title")}</h1>

      <div className="g-prose">
        <p>{t("gamba.school.p1", { margin: ((data?.margin ?? 0.05) * 100).toFixed(0) })}</p>
        <p>{t("gamba.school.p2")}</p>
      </div>

      <h2 className="g-h">{t("gamba.school.yourLedger")}</h2>
      {lg.nSettled === 0 ? (
        <p className="gamba-sub">{t("gamba.school.noHistory")}</p>
      ) : (
        <>
          <div className="g-stats">
            <div className="g-stat">
              <span className="lbl">{t("gamba.bets.staked")}</span>
              <span className="val">{fmtG(lg.staked)}</span>
            </div>
            <div className="g-stat">
              <span className="lbl">{t("gamba.bets.returned")}</span>
              <span className="val">{fmtG(lg.returned)}</span>
            </div>
            <div className="g-stat">
              <span className="lbl">{t("gamba.bets.roi")}</span>
              <span className={`val ${lg.roi < 0 ? "neg" : lg.roi > 0 ? "pos" : ""}`}>
                {(lg.roi * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="g-overround">
            {t("gamba.school.expectedVsActual", {
              expected: fmtG(Math.abs(lg.expectedNet)),
              expSign: lg.expectedNet < 0 ? t("gamba.school.lose") : t("gamba.school.win"),
              actual: fmtG(Math.abs(lg.net)),
              actSign: lg.net < 0 ? t("gamba.school.lost") : t("gamba.school.won"),
            })}{" "}
            {t("gamba.school.luck")}
          </div>
        </>
      )}

      <h2 className="g-h">{t("gamba.school.overround")}</h2>
      <div className="g-prose">
        {demoRake != null ? (
          <p>
            {t("gamba.school.overroundDemo", {
              match: `${tCountry(demo.home_name)} v ${tCountry(demo.away_name)}`,
              probs: demoPrices.map((p) => (impliedP(p) * 100).toFixed(1) + "%").join(" + "),
              sum: ((1 + demoRake) * 100).toFixed(1),
              edge: (demoRake * 100).toFixed(1),
            })}
          </p>
        ) : (
          <p>{t("gamba.school.overroundStatic")}</p>
        )}
      </div>

      {table.length > 0 && (
        <>
          <h2 className="g-h">{t("gamba.school.modelVsReal")}</h2>
          <p className="gamba-sub">{t("gamba.school.modelVsRealSub")}</p>
          <div className="g-card" style={{ overflowX: "auto" }}>
            <table className="g-table">
              <thead>
                <tr>
                  <th>{t("gamba.school.thMatch")}</th>
                  <th>{t("gamba.school.thSel")}</th>
                  <th className="num">{t("gamba.market.modelBook")}</th>
                  <th className="num">{t("gamba.market.realBook")}</th>
                </tr>
              </thead>
              <tbody>
                {table.flatMap((m) =>
                  m.rows.map((r, i) => (
                    <tr key={`${m.id}-${i}`}>
                      <td>{i === 0 ? m.name : ""}</td>
                      <td>{r.sel}</td>
                      <td className="num">{r.model?.toFixed(2)}</td>
                      <td className="num">{r.real?.toFixed(2) ?? "–"}</td>
                    </tr>
                  )))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="g-h">{t("gamba.school.takeaway")}</h2>
      <div className="g-prose">
        <p>{t("gamba.school.p3")}</p>
        <Link to="/gamba" className="g-btn" style={{ display: "inline-block" }}
              onClick={() => localStorage.removeItem("pitchside.tour.gamba.v1")}>
          {t("tour.replay.gamba")}
        </Link>
      </div>
    </>
  );
}
