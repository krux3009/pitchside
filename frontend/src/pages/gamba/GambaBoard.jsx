import { useRef, useState } from "react";

import BetSlip from "../../components/gamba/BetSlip";
import MarketCard from "../../components/gamba/MarketCard";
import Tour from "../../components/Tour";
import { canBet, overround } from "../../lib/gamba/engine";
import { localDateHeading, localDayKey } from "../../lib/format";
import { useLang } from "../../lib/i18n";
import { useApi } from "../../lib/useApi";

const GAMBA_TOUR = [
  { anchor: ".gamba-chip", title: "tour.gamba.balance.t", body: "tour.gamba.balance.b" },
  { anchor: ".g-price", title: "tour.gamba.price.t", body: "tour.gamba.price.b" },
  { anchor: ".g-slip:not(.g-slip--empty)", title: "tour.gamba.slip.t", body: "tour.gamba.slip.b" },
  { anchor: '[data-tour="gamba-school"]', title: "tour.gamba.school.t", body: "tour.gamba.school.b" },
];

export default function GambaBoard() {
  const { t, dateLocale } = useLang();
  const { data, loading, error } = useApi("/api/odds", { pollMs: 60_000 });
  const [pick, setPick] = useState(null);
  const tourPicked = useRef(false); // the demo pick the tour opened, if any

  const matches = data?.matches ?? [];
  const days = new Map();
  for (const m of matches) {
    const key = localDayKey(m.kickoff_utc);
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(m);
  }

  // the rake, live from the first match carrying a full real 1X2
  const first = matches.find((m) => m.real?.h2h);
  const h2hPrices = first
    ? ["home", "draw", "away"].map((s) => first.real.h2h[s]?.median).filter(Boolean)
    : null;
  const rake = h2hPrices?.length === 3 ? overround(h2hPrices) : null;

  // the tour's slip step needs a slip on screen (on phones it only exists
  // once a price is picked), so it opens a demo ticket and tidies up after
  const openDemoPick = () => {
    if (pick) return;
    const m = matches.find((x) => x.real?.h2h?.home && canBet(x));
    if (!m) return; // no open market: the step auto-skips on missing anchor
    const pModel = m.model?.h2h?.home?.p ?? null;
    tourPicked.current = true;
    setPick({
      matchId: m.match_id,
      homeName: m.home_name, awayName: m.away_name,
      homeId: m.home_id, awayId: m.away_id,
      market: "h2h", selection: "home", line: 0,
      price: m.real.h2h.home.best, pModel,
      fair: pModel ? Math.round(100 / pModel) / 100 : null,
      oddsSource: "real", match: m,
    });
  };
  const endTour = () => {
    if (tourPicked.current) {
      tourPicked.current = false;
      setPick(null);
    }
  };
  const tourSteps = GAMBA_TOUR.map((s) =>
    s.title === "tour.gamba.slip.t" ? { ...s, onEnter: openDemoPick } : s);

  return (
    <>
      {!loading && !error && matches.length > 0 && (
        <Tour storageKey="pitchside.tour.gamba.v1" theme="gamba"
              steps={tourSteps} onEnd={endTour} />
      )}
      <h1 className="gamba-page-title">{t("gamba.board.title")}</h1>
      <p className="gamba-sub">{t("gamba.board.sub")}</p>
      <p className="gamba-sub">{t("gamba.rule90")}</p>

      {rake != null && (
        <div className="g-overround">
          {t("gamba.board.overround", {
            sum: ((1 + rake) * 100).toFixed(1),
            edge: (rake * 100).toFixed(1),
            book: t("gamba.market.realBook"),
          })}
        </div>
      )}

      <div className="gamba-board">
        <div>
          {loading && <div className="g-slip__empty">…</div>}
          {error && <div className="g-slip__empty">{t("gamba.board.error")}</div>}
          {!loading && !error && matches.length === 0 && (
            <div className="g-locked" style={{ marginTop: 20 }}>
              {t("gamba.board.empty")}
            </div>
          )}
          {[...days.entries()].map(([day, ms]) => (
            <section key={day}>
              <h2 className="g-h">{localDateHeading(day, dateLocale)}</h2>
              {ms.map((m) => (
                <MarketCard key={m.match_id} m={m} pick={pick} onPick={setPick} />
              ))}
            </section>
          ))}
        </div>
        <aside className="gamba-board__rail">
          <BetSlip pick={pick} onClear={() => setPick(null)} />
        </aside>
      </div>
    </>
  );
}
