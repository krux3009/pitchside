import { fmtG, selectionText } from "../../lib/gamba/engine";
import { useLang } from "../../lib/i18n";

// One bet as a paper ticket stub. Settled stubs get a rotated rubber stamp;
// the footer keeps teaching: "fair was 1.92 — you paid 1.83".
export default function Ticket({ bet }) {
  const { t, tCountry, dateLocale } = useLang();
  const settled = bet.status !== "open";
  return (
    <article className={`g-ticket${settled ? " g-ticket--settled" : ""}`}>
      <div className="g-ticket__top">
        <span>{t(`gamba.market.${bet.market}`)}
          {bet.oddsSource === "real" ? ` · ${t("gamba.market.realBook")}` : ""}
        </span>
        <span>{new Date(bet.placedAt).toLocaleString(dateLocale, {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        })}</span>
      </div>
      <div className="g-ticket__pick">
        {selectionText(bet, t, tCountry)} @ {bet.price.toFixed(2)}
      </div>
      <div className="g-ticket__match">
        {bet.homeName ? `${tCountry(bet.homeName)} v ${tCountry(bet.awayName)}` : `#${bet.matchId}`}
        {bet.result ? ` · ${t("gamba.ticket.final", { score: bet.result })}` : ""}
      </div>
      <div className="g-ticket__nums">
        <div>
          <span className="lbl">{t("gamba.slip.stake")}</span>
          <span className="val">{fmtG(bet.stake)}</span>
        </div>
        <div>
          <span className="lbl">{t("gamba.slip.returns")}</span>
          <span className="val">
            {settled ? fmtG(bet.returns) : fmtG(bet.stake * bet.price)}
          </span>
        </div>
      </div>
      {bet.fair != null && bet.fair !== bet.price && (
        <div className="g-ticket__foot">
          {t(bet.price < bet.fair ? "gamba.ticket.fairWas" : "gamba.ticket.aboveFair", {
            fair: bet.fair.toFixed(2), paid: bet.price.toFixed(2),
          })}
        </div>
      )}
      {settled && (
        <span className={`g-stamp g-stamp--${bet.status}`}>
          {t(`gamba.ticket.${bet.status}`)}
        </span>
      )}
    </article>
  );
}
