import { Link } from "react-router-dom";

import Disclaimer from "../components/Disclaimer";
import { useLang } from "../lib/i18n";
import { useApi } from "../lib/useApi";

export default function Methodology() {
  const { t } = useLang();
  const { data } = useApi("/api/methodology/params");
  const m = data?.model;
  const bt = data?.backtest;

  const eloLink = (
    <a style={styles.a} href="https://www.eloratings.net">eloratings.net</a>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="page-title">{t("meth.title")}</h1>
      <p style={styles.lead}>{t("meth.lead")}</p>

      <Section title={t("meth.s1.title")}>
        <p>{t("meth.s1.p1", { link: eloLink })}</p>
        <Formula>R′ = R + K · G · (W − Wₑ)   with   Wₑ = 1 / (10^(−dr/400) + 1)</Formula>
        <p>{t("meth.s1.p2")}</p>
        {data?.elo?.seed_note && <Note>{data.elo.seed_note}</Note>}
      </Section>

      <Section title={t("meth.s2.title")}>
        <p>{t("meth.s2.p1")}</p>
        <Formula>
          λ_home = exp(β₀ + β₁·EloDiff + β_home)   ·   μ_away = exp(β₀ − β₁·EloDiff)
        </Formula>
        {m && (
          <p>
            {t("meth.s2.fitted", {
              n: m.fit_meta.n_matches.toLocaleString(),
              year: m.fit_meta.cutoff.slice(0, 4),
              halfLife: m.fit_meta.half_life_years,
              b0: <Mono>{m.b0.toFixed(4)}</Mono>,
              b1: <Mono>{m.b1.toFixed(5)}</Mono>,
              bHome: <Mono>{m.b_home.toFixed(4)}</Mono>,
              eloPerGoal: Math.round(1 / m.b1 / 100) * 100,
            })}
          </p>
        )}
      </Section>

      <Section title={t("meth.s3.title")}>
        <p>{t("meth.s3.p", { rho: m ? <Mono>{m.rho.toFixed(4)}</Mono> : null })}</p>
      </Section>

      <Section title={t("meth.s4.title")}>
        <p>{t("meth.s4.p")}</p>
      </Section>

      <Section title={t("meth.s5.title")}>
        {bt ? (
          <>
            <div style={styles.tiles}>
              <Tile label={t("meth.tile.brier")} value={bt.brier}
                    base={t("meth.tile.baseline", { v: bt.brier_uniform_baseline })} />
              <Tile label={t("meth.tile.logloss")} value={bt.log_loss}
                    base={t("meth.tile.baseline", { v: bt.log_loss_uniform_baseline })} />
            </div>
            <p>
              {t("meth.s5.p", {
                n: bt.n_matches,
                brier: <Mono>{bt.brier}</Mono>,
                brierBase: <Mono>{bt.brier_uniform_baseline}</Mono>,
                logLoss: <Mono>{bt.log_loss}</Mono>,
                logLossBase: <Mono>{bt.log_loss_uniform_baseline}</Mono>,
              })}
            </p>
          </>
        ) : (
          <p>{t("meth.s5.none")}</p>
        )}
      </Section>

      <Section title={t("meth.s6.title")}>
        <ul style={{ paddingLeft: 18, lineHeight: 1.7 }}>
          {t("meth.limits").map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title={t("meth.refs.title")}>
        <ul style={{ paddingLeft: 18, lineHeight: 1.7, fontSize: 14 }}>
          <li>Elo, A. (1978). <em>The Rating of Chessplayers, Past and Present.</em></li>
          <li>Maher, M.J. (1982). “Modelling Association Football Scores.” <em>Statistica Neerlandica</em> 36(3).</li>
          <li>Dixon, M.J. &amp; Coles, S.G. (1997). “Modelling Association Football Scores and Inefficiencies in the Football Betting Market.” <em>JRSS Series C</em> 46(2).</li>
          <li>FiveThirtyEight — “How Our World Cup Predictions Work” (via web.archive.org).</li>
          <li>World Football Elo Ratings — eloratings.net/about.</li>
          <li>Data: openfootball (CC0), eloratings.net, martj42/international_results, ESPN.</li>
        </ul>
      </Section>

      <div className="card" style={{ marginTop: 24 }}>
        <Disclaimer expanded />
      </div>

      <p style={{ marginTop: 16 }}>
        <Link to="/" style={styles.a}
              onClick={() => localStorage.removeItem("pitchside.tour.main.v1")}>
          {t("tour.replay.main")}
        </Link>
      </p>
    </div>
  );
}

const Section = ({ title, children }) => (
  <section>
    <h2 className="section-title">{title}</h2>
    <div style={{ color: "var(--text-mid)", fontSize: 15, lineHeight: 1.65 }}>{children}</div>
  </section>
);

const Formula = ({ children }) => (
  <pre style={styles.formula}>{children}</pre>
);

const Mono = ({ children }) => (
  <code style={{ color: "var(--gold)" }}>{children}</code>
);

const Note = ({ children }) => (
  <p style={{ fontSize: 12, color: "var(--text-low)" }}>{children}</p>
);

const Tile = ({ label, value, base }) => (
  <div className="card" style={{ textAlign: "center", padding: "14px 10px" }}>
    <div style={{ fontFamily: "var(--font-score)", fontWeight: 700, fontSize: 24, color: "var(--text-hi)" }}>
      {value}
    </div>
    <div style={{ fontSize: 12, color: "var(--text-low)" }}>{label}</div>
    <div style={{ fontSize: 11, color: "var(--text-low)" }}>{base}</div>
  </div>
);

const styles = {
  lead: { color: "var(--text-mid)", fontSize: 16 },
  a: { color: "var(--gold)" },
  formula: {
    // chalkboard: elevated slate with a grass accent edge
    background: "color-mix(in srgb, var(--grass-deep) 22%, var(--bg-elevated))",
    border: "1px solid var(--line)",
    borderLeft: "3px solid var(--grass)",
    borderRadius: 8,
    padding: "12px 14px",
    overflowX: "auto",
    color: "var(--text-hi)",
    fontSize: 13,
  },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    margin: "4px 0 12px",
  },
};
