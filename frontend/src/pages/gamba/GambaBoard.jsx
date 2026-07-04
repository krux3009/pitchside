import { useState } from "react";

import BetSlip from "../../components/gamba/BetSlip";
import MarketCard from "../../components/gamba/MarketCard";
import { overround } from "../../lib/gamba/engine";
import { localDateHeading, localDayKey } from "../../lib/format";
import { useLang } from "../../lib/i18n";
import { useApi } from "../../lib/useApi";

export default function GambaBoard() {
  const { t, dateLocale } = useLang();
  const { data, loading, error } = useApi("/api/odds", { pollMs: 60_000 });
  const [pick, setPick] = useState(null);

  const matches = data?.matches ?? [];
  const days = new Map();
  for (const m of matches) {
    const key = localDayKey(m.kickoff_utc);
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(m);
  }

  // the rake, live from the first priced match: real book when present
  // (bookmakers vary), else the model book (always exactly the margin)
  const first = matches.find((m) => m.real?.h2h || m.model);
  const h2hPrices = first?.real?.h2h
    ? ["home", "draw", "away"].map((s) => first.real.h2h[s]?.median).filter(Boolean)
    : first?.model
      ? ["home", "draw", "away"].map((s) => first.model.h2h[s].price)
      : null;
  const rake = h2hPrices ? overround(h2hPrices) : null;

  return (
    <>
      <h1 className="gamba-page-title">{t("gamba.board.title")}</h1>
      <p className="gamba-sub">{t("gamba.board.sub")}</p>
      <p className="gamba-sub">{t("gamba.rule90")}</p>

      {rake != null && (
        <div className="g-overround">
          {t("gamba.board.overround", {
            sum: ((1 + rake) * 100).toFixed(1),
            edge: (rake * 100).toFixed(1),
            book: first.real?.h2h
              ? t("gamba.market.realBook") : t("gamba.market.modelBook"),
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
