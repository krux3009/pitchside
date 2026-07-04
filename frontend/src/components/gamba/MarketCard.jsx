import { useState } from "react";

import { canBet } from "../../lib/gamba/engine";
import { useLang } from "../../lib/i18n";
import { localKickoff } from "../../lib/format";

// One match's markets. Model book and real book are separate rows per market —
// tapping any price starts a ticket. Real prices show best (median, n books).
export default function MarketCard({ m, pick, onPick }) {
  const { t, tCountry, dateLocale } = useLang();
  const [showCS, setShowCS] = useState(false);
  const open = canBet(m);

  const title = m.home_name
    ? `${tCountry(m.home_name)} v ${tCountry(m.away_name)}`
    : `${t(`stage.${m.stage}`)} · #${m.match_id}`;

  const base = {
    matchId: m.match_id,
    homeName: m.home_name, awayName: m.away_name,
    homeId: m.home_id, awayId: m.away_id,
  };
  const isOn = (sel) =>
    pick && pick.matchId === m.match_id && pick.market === sel.market &&
    pick.selection === sel.selection && pick.line === sel.line &&
    pick.oddsSource === sel.oddsSource;

  const price = (sel, label, extra) => (
    <button
      key={`${sel.market}:${sel.selection}:${sel.line}:${sel.oddsSource}`}
      className={`g-price${isOn(sel) ? " on" : ""}`}
      disabled={!open}
      onClick={() => onPick(isOn(sel) ? null : { ...base, ...sel, match: m })}
    >
      <span className="g-price__sel">{label}</span>
      <span className="g-price__odds">{sel.price.toFixed(2)}</span>
      {extra && <span className="g-price__real">{extra}</span>}
    </button>
  );

  // model-book button: p + fair frozen into the pick for the slip's EV lesson
  const mb = (market, selection, entry, label, line = 0, listedScores) =>
    price({ market, selection, line, price: entry.price, pModel: entry.p,
            fair: entry.fair, oddsSource: "model", listedScores }, label);

  // real-book button: settles at the BEST price; model p (when the model
  // quotes the same selection) still powers the EV line
  const rb = (market, selection, entry, label, line = 0, pModel = null) =>
    price({ market, selection, line, price: entry.best, pModel,
            fair: pModel ? Math.round(100 / pModel) / 100 : null,
            oddsSource: "real" },
          label, `${t("gamba.market.median")} ${entry.median?.toFixed(2)} · ${entry.n}`);

  const model = m.model;
  const real = m.real;
  const codes = { home: m.home_code || "1", draw: "X", away: m.away_code || "2" };

  return (
    <article className="g-card g-match">
      <div className="g-match__head">
        <span className="g-match__teams">{title}</span>
        <span className="g-match__meta">
          {t(`stage.${m.stage}`)} · {localKickoff(m.kickoff_utc, dateLocale)}
          {!open && ` · ${t("gamba.board.closed")}`}
        </span>
      </div>

      {!model && <div className="g-locked">{t("gamba.board.locked")}</div>}

      {model && (
        <>
          <div className="g-market">
            <div className="g-market__label">
              {t("gamba.market.h2h")}
              <span className="g-badge">{t("gamba.market.modelBook")}</span>
            </div>
            <div className="g-prices">
              {["home", "draw", "away"].map((s) =>
                mb("h2h", s, model.h2h[s],
                   s === "draw" ? t("gamba.sel.draw") : codes[s]))}
            </div>
            {real?.h2h && (
              <>
                <div className="g-market__label" style={{ marginTop: 6 }}>
                  <span className="g-badge">{t("gamba.market.realBook")}</span>
                </div>
                <div className="g-prices">
                  {["home", "draw", "away"].map((s) => real.h2h[s] &&
                    rb("h2h", s, real.h2h[s],
                       s === "draw" ? t("gamba.sel.draw") : codes[s],
                       0, model.h2h[s]?.p))}
                </div>
              </>
            )}
          </div>

          <div className="g-market">
            <div className="g-market__label">
              {t("gamba.market.totals")}
              <span className="g-badge">{t("gamba.market.modelBook")}</span>
            </div>
            {model.totals.map((tl) => (
              <div className="g-prices" key={tl.line} style={{ marginBottom: 6 }}>
                {mb("totals", "over", tl.over, `${t("gamba.sel.over")} ${tl.line}`, tl.line)}
                {mb("totals", "under", tl.under, `${t("gamba.sel.under")} ${tl.line}`, tl.line)}
              </div>
            ))}
            {real?.totals?.length > 0 && (
              <>
                <div className="g-market__label" style={{ marginTop: 6 }}>
                  <span className="g-badge">{t("gamba.market.realBook")}</span>
                </div>
                {real.totals.map((tl) => {
                  const modelLine = model.totals.find((x) => x.line === tl.line);
                  return (
                    <div className="g-prices" key={tl.line} style={{ marginBottom: 6 }}>
                      {tl.over && rb("totals", "over", tl.over,
                        `${t("gamba.sel.over")} ${tl.line}`, tl.line, modelLine?.over.p)}
                      {tl.under && rb("totals", "under", tl.under,
                        `${t("gamba.sel.under")} ${tl.line}`, tl.line, modelLine?.under.p)}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div className="g-market">
            <div className="g-market__label">
              {t("gamba.market.btts")}
              <span className="g-badge">{t("gamba.market.modelBook")}</span>
            </div>
            <div className="g-prices">
              {mb("btts", "yes", model.btts.yes, t("gamba.sel.yes"))}
              {mb("btts", "no", model.btts.no, t("gamba.sel.no"))}
            </div>
            {real?.btts && (
              <>
                <div className="g-market__label" style={{ marginTop: 6 }}>
                  <span className="g-badge">{t("gamba.market.realBook")}</span>
                </div>
                <div className="g-prices">
                  {real.btts.yes && rb("btts", "yes", real.btts.yes,
                    t("gamba.sel.yes"), 0, model.btts.yes.p)}
                  {real.btts.no && rb("btts", "no", real.btts.no,
                    t("gamba.sel.no"), 0, model.btts.no.p)}
                </div>
              </>
            )}
          </div>

          <div className="g-market">
            <div className="g-market__label">
              {t("gamba.market.correct_score")}
              <span className="g-badge">{t("gamba.market.csBadge")}</span>
            </div>
            {showCS ? (
              <div className="g-prices">
                {model.correct_score.map((c) =>
                  mb("correct_score", c.selection, c,
                     c.selection === "other" ? t("gamba.sel.otherScore") : c.selection,
                     0,
                     // freeze the listed grid into 'other' so late re-pricing
                     // can't change what the bet meant
                     c.selection === "other"
                       ? model.correct_score.filter((x) => x.selection !== "other")
                           .map((x) => x.selection)
                       : undefined))}
              </div>
            ) : (
              <button className="g-expand" onClick={() => setShowCS(true)}>
                {t("gamba.market.showCS")}
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
