import Disclaimer from "../components/Disclaimer";
import { useApi } from "../lib/useApi";

export default function Methodology() {
  const { data } = useApi("/api/methodology/params");
  const m = data?.model;
  const bt = data?.backtest;

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={styles.h1}>Methodology</h1>
      <p style={styles.lead}>
        Every probability on this site comes from the pipeline below. Nothing is
        editorial; the parameters shown here are read live from the running model.
      </p>

      <Section title="1 · Team strength — World Football Elo">
        <p>
          Each team carries an Elo rating (seeded from{" "}
          <a style={styles.a} href="https://www.eloratings.net">eloratings.net</a>),
          updated after every match:
        </p>
        <Formula>R′ = R + K · G · (W − Wₑ)   with   Wₑ = 1 / (10^(−dr/400) + 1)</Formula>
        <p>
          K = 60 for World Cup finals matches. G scales with the margin of victory
          (1 for a draw or one-goal win, 1.5 for two, (11+N)/8 beyond). The classic
          +100 home-advantage points apply only when a host — USA, Mexico, or
          Canada — plays in its own country; every other fixture is neutral.
          Ratings update on 90-minute scores, per Elo convention.
        </p>
        {data?.elo?.seed_note && <Note>{data.elo.seed_note}</Note>}
      </Section>

      <Section title="2 · From ratings to goals — the Poisson bridge">
        <p>Expected goals for each side come from the Elo difference:</p>
        <Formula>
          λ_home = exp(β₀ + β₁·EloDiff + β_home)   ·   μ_away = exp(β₀ − β₁·EloDiff)
        </Formula>
        {m && (
          <p>
            Fitted by maximum likelihood on{" "}
            <strong>{m.fit_meta.n_matches.toLocaleString()}</strong> competitive
            internationals since {m.fit_meta.cutoff.slice(0, 4)} (friendlies
            excluded, exponential decay with a {m.fit_meta.half_life_years}-year
            half-life): β₀ = <Mono>{m.b0.toFixed(4)}</Mono>, β₁ ={" "}
            <Mono>{m.b1.toFixed(5)}</Mono>, β_home = <Mono>{m.b_home.toFixed(4)}</Mono>.
            β₁ implies roughly one extra goal per ~{Math.round(1 / m.b1 / 100) * 100}{" "}
            Elo points of advantage.
          </p>
        )}
      </Section>

      <Section title="3 · Scorelines — Dixon-Coles correction">
        <p>
          Two independent Poisson distributions build an 11×11 score-probability
          matrix. Plain Poisson famously under-predicts 0-0 and 1-1, so the four
          low-score cells get the Dixon &amp; Coles (1997) τ correction
          {m && <> with ρ = <Mono>{m.rho.toFixed(4)}</Mono></>}, then the matrix is
          renormalised. Summing the matrix above, on, and below the diagonal gives
          win / draw / loss probabilities and the most likely scoreline.
        </p>
      </Section>

      <Section title="4 · The tournament — 10,000 Monte Carlo simulations">
        <p>
          The remaining schedule is replayed 10,000 times. Group tables follow the
          exact 2026 tie-breakers — points, then <em>overall</em> goal difference
          and goals (new for 2026), then head-to-head applied recursively among
          still-tied teams, then fair-play points, then FIFA ranking. The eight
          best third-placed teams fill the Round-of-32 slots via a deterministic
          assignment honouring FIFA's allowed-group constraints (this can differ
          from FIFA's published allocation in rare combinations). Drawn knockout
          games get 30 minutes of extra time at one-third intensity, then a 50/50
          penalty shoot-out. In simulations the fair-play criterion is unknowable
          and falls through to FIFA ranking. Ratings stay frozen at simulation time.
        </p>
      </Section>

      <Section title="5 · How wrong are we? — live scorecard">
        {bt ? (
          <p>
            Over <strong>{bt.n_matches}</strong> finished match{bt.n_matches === 1 ? "" : "es"},
            the model's Brier score is <Mono>{bt.brier}</Mono> against{" "}
            <Mono>{bt.brier_uniform_baseline}</Mono> for an always-⅓ guesser
            (lower is better). Log-loss: <Mono>{bt.log_loss}</Mono> vs{" "}
            <Mono>{bt.log_loss_uniform_baseline}</Mono>. This updates automatically
            as the tournament progresses — including when the model does badly.
          </p>
        ) : (
          <p>No finished matches scored yet — check back after the next matchday.</p>
        )}
      </Section>

      <Section title="6 · Known limitations">
        <ul style={{ paddingLeft: 18, lineHeight: 1.7 }}>
          <li>No xG layer yet (planned); team strength is results-based only.</li>
          <li>Player availability (injuries, suspensions) does not adjust λ.</li>
          <li>Penalty shoot-outs are treated as a fair coin.</li>
          <li>No travel/fatigue modelling across the three host countries.</li>
          <li>Where ESPN is the only data source, player minutes are estimated.</li>
        </ul>
      </Section>

      <Section title="References">
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

const styles = {
  h1: { fontFamily: "var(--font-display)", fontSize: 28, margin: "28px 0 8px" },
  lead: { color: "var(--text-mid)", fontSize: 16 },
  a: { color: "var(--gold)" },
  formula: {
    background: "var(--bg-surface)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: "10px 14px",
    overflowX: "auto",
    color: "var(--text-hi)",
    fontSize: 13,
  },
};
