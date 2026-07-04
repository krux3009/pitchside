import { useEffect, useState } from "react";

import { useGamba } from "../../lib/gamba/GambaContext";
import {
  MIN_STAKE, canBet, ev, fmtG, impliedP, selectionText,
} from "../../lib/gamba/engine";
import { useLang } from "../../lib/i18n";
import Disclaimer from "../Disclaimer";

// Sticky receipt (right rail desktop / bottom sheet mobile). The line items ARE
// the lesson: RETURNS, the model's FAIR PRICE, IMPLIED P, and a (negative) EV.
export default function BetSlip({ pick, onClear }) {
  const { t, tCountry } = useLang();
  const { balance, placeBet, canDrip, claimDrip } = useGamba();
  const [stake, setStake] = useState(50);
  const [err, setErr] = useState(null);
  const [printed, setPrinted] = useState(false);

  useEffect(() => { setErr(null); }, [pick]);
  useEffect(() => {
    if (!printed) return;
    const id = setTimeout(() => setPrinted(false), 2500);
    return () => clearTimeout(id);
  }, [printed]);

  if (!pick) {
    // on phones this renders as nothing at all — the sheet only docks in when
    // it has something to say (printed flash) or offer (the daily drip)
    return (
      <div className={`g-slip g-slip--empty${printed ? " is-printed" : ""}${canDrip ? " has-drip" : ""}`}>
        <div className="g-slip__title">{t("gamba.slip.title")}</div>
        <div className="g-slip__empty">
          {printed ? t("gamba.slip.printed") : t("gamba.slip.empty")}
        </div>
        {canDrip && (
          <button className="g-btn" style={{ width: "100%" }} onClick={claimDrip}>
            {t("gamba.drip")}
          </button>
        )}
        <div className="g-slip__fine">
          <Disclaimer />
        </div>
      </div>
    );
  }

  const stakeNum = Number(stake) || 0;
  const evPerUnit = pick.pModel != null ? ev(pick.pModel, pick.price) : null;
  const open = canBet(pick.match);

  const place = () => {
    const { match, ...frozen } = pick; // fair stays on the ticket for the footer lesson
    const e = placeBet({ ...frozen, stake: stakeNum }, match);
    if (e) {
      setErr(e);
    } else {
      setPrinted(true);
      onClear();
    }
  };

  return (
    <div className="g-slip">
      <div className="g-slip__grab" aria-hidden="true" />
      <button className="g-slip__close" onClick={onClear}
              aria-label={t("gamba.slip.close")}>×</button>
      <div className="g-slip__title">{t("gamba.slip.title")}</div>

      <div className="g-slip__pick">
        {selectionText(pick, t, tCountry)} @ {pick.price.toFixed(2)}
        {pick.oddsSource === "real" && (
          <span className="g-badge" style={{ marginLeft: 6 }}>
            {t("gamba.market.realBook")}
          </span>
        )}
      </div>
      <div className="g-slip__match">
        {pick.homeName ? `${tCountry(pick.homeName)} v ${tCountry(pick.awayName)}` : `#${pick.matchId}`}
        {" · "}{t(`gamba.market.${pick.market}`)}
      </div>

      <label htmlFor="g-stake" className="g-slip__row" style={{ display: "block" }}>
        <span style={{ fontSize: 12, color: "var(--g-ink-soft)" }}>
          {t("gamba.slip.stake")}
        </span>
      </label>
      <input
        id="g-stake"
        className="g-stake"
        type="number"
        min={MIN_STAKE}
        max={Math.floor(balance)}
        step="10"
        value={stake}
        onChange={(e) => setStake(e.target.value)}
      />
      <div className="g-chips">
        {[50, 100, 250].map((v) => (
          <button key={v} className="g-chipbtn" onClick={() => setStake(v)}>
            {v}
          </button>
        ))}
        <button className="g-chipbtn" onClick={() => setStake(Math.floor(balance))}>
          MAX
        </button>
      </div>

      <dl className="g-slip__rows">
        <div className="g-slip__row">
          <dt>{t("gamba.slip.returns")}</dt>
          <dd>{fmtG(stakeNum * pick.price)}</dd>
        </div>
        {pick.fair != null && (
          <div className="g-slip__row">
            <dt>{t("gamba.slip.fair")}</dt>
            <dd>{pick.fair.toFixed(2)}</dd>
          </div>
        )}
        <div className="g-slip__row">
          <dt>{t("gamba.slip.implied")}</dt>
          <dd>{Math.round(impliedP(pick.price) * 1000) / 10}%</dd>
        </div>
        {evPerUnit != null && (
          <div className="g-slip__row">
            <dt>{t("gamba.slip.ev")}</dt>
            <dd className={evPerUnit < 0 ? "neg" : "pos"}>
              {t("gamba.slip.evPer", {
                v: `${evPerUnit >= 0 ? "+" : "−"}${fmtG(Math.abs(evPerUnit) * 100)}`,
              })}
            </dd>
          </div>
        )}
      </dl>

      <button className="g-place" onClick={place} disabled={!open}>
        {open ? t("gamba.slip.place") : t("gamba.slip.closed")}
      </button>
      {err && (
        <p className="g-slip__err">
          {t(`gamba.slip.err.${err}`)}
          {err === "funds" && canDrip && (
            <button className="g-btn" style={{ marginLeft: 8 }} onClick={claimDrip}>
              {t("gamba.drip")}
            </button>
          )}
        </p>
      )}

      <div className="g-slip__perf" />
      <Disclaimer />
    </div>
  );
}
