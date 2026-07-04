import { canBet } from "../../lib/gamba/engine";
import { useLang } from "../../lib/i18n";
import { localKickoff } from "../../lib/format";

// One match's markets — real bookmaker consensus only. Tapping a price starts
// a ticket, which settles at the BEST book's price. The model book never shows
// on the board, but its probability rides along on every pick so the slip can
// still teach the fair-price / EV lesson.
export default function MarketCard({ m, pick, onPick }) {
  const { t, tCountry, dateLocale } = useLang();
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
    pick.selection === sel.selection && pick.line === sel.line;

  // real-book button: settles at the BEST price; the model's probability (when
  // it quotes the same selection) still powers the slip's EV line
  const rb = (market, selection, entry, label, line = 0, pModel = null) => (
    <button
      key={`${market}:${selection}:${line}`}
      className={`g-price${isOn({ market, selection, line }) ? " on" : ""}`}
      disabled={!open}
      onClick={() => {
        const sel = { market, selection, line, price: entry.best, pModel,
                      fair: pModel ? Math.round(100 / pModel) / 100 : null,
                      oddsSource: "real" };
        onPick(isOn(sel) ? null : { ...base, ...sel, match: m });
      }}
    >
      <span className="g-price__sel">{label}</span>
      <span className="g-price__odds">{entry.best.toFixed(2)}</span>
      <span className="g-price__real">
        {t("gamba.market.median")} {entry.median?.toFixed(2)} · {entry.n}
      </span>
    </button>
  );

  const real = m.real;
  const model = m.model; // never displayed; feeds the EV lesson only
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

      {!real?.h2h && (
        <div className="g-locked">
          {m.home_name ? t("gamba.board.noOdds") : t("gamba.board.locked")}
        </div>
      )}

      {real?.h2h && (
        <>
          <div className="g-market">
            <div className="g-market__label">
              {t("gamba.market.h2h")}
              <span className="g-badge">{t("gamba.market.realBook")}</span>
            </div>
            <div className="g-prices">
              {["home", "draw", "away"].map((s) => real.h2h[s] &&
                rb("h2h", s, real.h2h[s],
                   s === "draw" ? t("gamba.sel.draw") : codes[s],
                   0, model?.h2h?.[s]?.p))}
            </div>
          </div>

          {real.totals?.length > 0 && (
            <div className="g-market">
              <div className="g-market__label">
                {t("gamba.market.totals")}
                <span className="g-badge">{t("gamba.market.realBook")}</span>
              </div>
              {real.totals.map((tl) => {
                const modelLine = model?.totals?.find((x) => x.line === tl.line);
                return (
                  <div className="g-prices" key={tl.line} style={{ marginBottom: 6 }}>
                    {tl.over && rb("totals", "over", tl.over,
                      `${t("gamba.sel.over")} ${tl.line}`, tl.line, modelLine?.over.p)}
                    {tl.under && rb("totals", "under", tl.under,
                      `${t("gamba.sel.under")} ${tl.line}`, tl.line, modelLine?.under.p)}
                  </div>
                );
              })}
            </div>
          )}

          {real.btts && (
            <div className="g-market">
              <div className="g-market__label">
                {t("gamba.market.btts")}
                <span className="g-badge">{t("gamba.market.realBook")}</span>
              </div>
              <div className="g-prices">
                {real.btts.yes && rb("btts", "yes", real.btts.yes,
                  t("gamba.sel.yes"), 0, model?.btts?.yes?.p)}
                {real.btts.no && rb("btts", "no", real.btts.no,
                  t("gamba.sel.no"), 0, model?.btts?.no?.p)}
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
}
