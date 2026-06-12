// English dictionary. Entries are strings, functions (vars) => string|JSX for
// anything with pluralization or live numbers, or arrays for lists.
// zh.jsx must mirror these keys; t() falls back here when a zh key is missing.

export const EN = {
  // navigation + footer
  "nav.home": "Home",
  "nav.matches": "Matches",
  "nav.players": "Players",
  "nav.methodology": "Methodology",
  "footer.disclaimer": "Predictions are statistical estimates for fun, not betting advice.",
  "footer.project": "A student portfolio project —",

  // loaders / errors
  "loader.warming": "Stadium lights warming up…",
  "loader.coldStart": "The free server sleeps between matches — first load can take up to a minute.",
  "loader.apiError": "Couldn’t reach the API.",

  // gambling disclaimer (required on every prediction surface)
  "disclaimer.ps": "PS:",
  "disclaimer.base": "This is a student statistics project. Probabilities are model estimates and are frequently wrong — they are not betting advice.",
  "disclaimer.short": " If you gamble, nothing here should inform it.",
  "disclaimer.expanded": " Any gambling decision or bet made based on these predictions is your own responsibility; nothing on this site should inform it. The model exists for learning and for fun.",

  // stages
  "stage.GROUP": "Group Stage",
  "stage.R32": "Round of 32",
  "stage.R16": "Round of 16",
  "stage.QF": "Quarter-final",
  "stage.SF": "Semi-final",
  "stage.THIRD": "Third Place",
  "stage.FINAL": "Final",
  "stage.group": ({ letter }) => `Group ${letter}`,

  // match cards + detail
  "match.live": "LIVE",
  "match.ft": "FT",
  "match.fullTime": "Full time",
  "match.prediction": "Model Prediction",
  "match.likelyScore": "Most likely score:",
  "match.how": "how this works",
  "match.teamStats": "Team Statistics",
  "match.lineups": "Lineups",
  "match.squads": "Squads",
  "match.bench": "BENCH",
  "match.squadNote": "Official lineups appear ~30 minutes before kickoff — full 26-man squads below.",
  "prob.draw": "draw",

  // team stat rows
  "stat.possession": "Possession",
  "stat.shots": "Shots",
  "stat.shots_on_target": "On target",
  "stat.corners": "Corners",
  "stat.fouls": "Fouls",
  "stat.offsides": "Offsides",
  "stat.passes": "Passes",
  "stat.pass_accuracy": "Pass accuracy",
  "stat.yellows": "Yellow cards",
  "stat.reds": "Red cards",

  // position groups
  "pos.GK": "Goalkeepers",
  "pos.DF": "Defenders",
  "pos.MF": "Midfielders",
  "pos.FW": "Forwards",

  // timetable
  "timetable.title": "Timetable",
  "timetable.allStages": "All stages",
  "timetable.allGroups": "All groups",

  // player index
  "players.title": "Players",
  "players.search": "Search player or team…",
  "players.none": "No players match that search.",
  "players.player": "Player",
  "players.team": "Team",
  "players.col.goals": "G",
  "players.col.assists": "A",
  "players.col.goals_per_90": "G/90",
  "players.col.team_goal_share": "Share",
  "players.col.minutes": "Min",
  "players.col.apps": "Apps",

  // player detail
  "player.age": ({ n }) => `${n} yrs`,
  "player.tournament": "Tournament",
  "player.goals": "Goals",
  "player.assists": "Assists",
  "player.goalsPer90": "Goals / 90",
  "player.share": "Share of team goals",
  "player.minutes": "Minutes",
  "player.apps": "Appearances",
  "player.yellows": "Yellow cards",
  "player.reds": "Red cards",
  "player.form": "Form (goal contributions, last 5)",
  "player.matchLog": "Match Log",
  "player.log.match": "Match",
  "player.log.min": "Min",
  "player.log.shots": "Shots",
  "player.log.cards": "Cards",
  "player.noMinutes": "No World Cup 2026 minutes yet.",
  "player.clubCareer": "Club Career",
  "player.international": "International",
  "player.career.team": "Team",
  "player.career.years": "Years",
  "player.career.starts": "Starts",
  "player.career.cs": "CS",
  "player.careerNote": "Pre-tournament career via ESPN season totals (league and cup competitions where tracked). ESPN counts starts, not substitute appearances.",

  // home / briefing
  "home.title": "Matchday Briefing",
  "home.autogen": "auto-generated from match data",
  "home.yesterday": "Yesterday",
  "home.today": "Today",
  "home.noMatches": "No matches today.",
  "home.injuries": "Availability Watch",
  "home.whoWins": "Who wins the World Cup?",
  "home.crunching": "Crunching simulations…",
  "home.simNote": ({ n }) => `${n} Monte Carlo simulations of the remaining tournament · `,
  "home.oddsMovers": "Odds Movers",
  "home.champTail": ({ pct }) => `→ ${pct} champion`,
  "home.upset": ({ team, pct }) => `Upset: the model gave ${team} only a ${pct} chance.`,
  "home.goals": ({ n }) => `${n} goal${n > 1 ? "s" : ""}`,
  "home.assists": ({ n }) => `${n} assist${n > 1 ? "s" : ""}`,

  // methodology
  "meth.title": "Methodology",
  "meth.lead": "Every probability on this site comes from the pipeline below. Nothing is editorial; the parameters shown here are read live from the running model.",
  "meth.s1.title": "1 · Team strength — World Football Elo",
  "meth.s1.p1": ({ link }) => (
    <>Each team carries an Elo rating (seeded from {link}), updated after every match:</>
  ),
  "meth.s1.p2": "K = 60 for World Cup finals matches. G scales with the margin of victory (1 for a draw or one-goal win, 1.5 for two, (11+N)/8 beyond). The classic +100 home-advantage points apply only when a host — USA, Mexico, or Canada — plays in its own country; every other fixture is neutral. Ratings update on 90-minute scores, per Elo convention.",
  "meth.s2.title": "2 · From ratings to goals — the Poisson bridge",
  "meth.s2.p1": "Expected goals for each side come from the Elo difference:",
  "meth.s2.fitted": ({ n, year, halfLife, b0, b1, bHome, eloPerGoal }) => (
    <>
      Fitted by maximum likelihood on <strong>{n}</strong> competitive
      internationals since {year} (friendlies excluded, exponential decay with
      a {halfLife}-year half-life): β₀ = {b0}, β₁ = {b1}, β_home = {bHome}.
      β₁ implies roughly one extra goal per ~{eloPerGoal} Elo points of advantage.
    </>
  ),
  "meth.s3.title": "3 · Scorelines — Dixon-Coles correction",
  "meth.s3.p": ({ rho }) => (
    <>
      Two independent Poisson distributions build an 11×11 score-probability
      matrix. Plain Poisson famously under-predicts 0-0 and 1-1, so the four
      low-score cells get the Dixon &amp; Coles (1997) τ correction
      {rho && <> with ρ = {rho}</>}, then the matrix is renormalised. Summing
      the matrix above, on, and below the diagonal gives win / draw / loss
      probabilities and the most likely scoreline.
    </>
  ),
  "meth.s4.title": "4 · The tournament — 10,000 Monte Carlo simulations",
  "meth.s4.p": () => (
    <>
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
    </>
  ),
  "meth.s5.title": "5 · How wrong are we? — live scorecard",
  "meth.s5.p": ({ n, brier, brierBase, logLoss, logLossBase }) => (
    <>
      Over <strong>{n}</strong> finished match{n === 1 ? "" : "es"}, the
      model's Brier score is {brier} against {brierBase} for an always-⅓
      guesser (lower is better). Log-loss: {logLoss} vs {logLossBase}. This
      updates automatically as the tournament progresses — including when the
      model does badly.
    </>
  ),
  "meth.s5.none": "No finished matches scored yet — check back after the next matchday.",
  "meth.s6.title": "6 · Known limitations",
  "meth.limits": [
    "No xG layer yet (planned); team strength is results-based only.",
    "Player availability (injuries, suspensions) does not adjust λ.",
    "Penalty shoot-outs are treated as a fair coin.",
    "No travel/fatigue modelling across the three host countries.",
    "Where ESPN is the only data source, player minutes are estimated.",
  ],
  "meth.refs.title": "References",
};
