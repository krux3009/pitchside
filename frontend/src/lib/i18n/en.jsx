// English dictionary. Entries are strings, functions (vars) => string|JSX for
// anything with pluralization or live numbers, or arrays for lists.
// zh.jsx must mirror these keys; t() falls back here when a zh key is missing.

export const EN = {
  // navigation + footer
  "nav.home": "Home",
  "nav.matches": "Matches",
  "nav.groups": "Groups",
  "nav.bracket": "Bracket",
  "nav.players": "Players",
  "nav.compare": "Compare",
  "nav.methodology": "Methodology",
  "footer.disclaimer": "Predictions are statistical estimates for fun, not betting advice.",
  "footer.project": "A student portfolio project —",
  "a11y.skip": "Skip to content",

  // loaders / errors
  "loader.warming": "Stadium lights warming up…",
  "loader.coldStart": "The free server sleeps between matches — first load can take up to a minute.",
  "loader.apiError": "Couldn’t reach the API.",
  "error.title": "Something broke",
  "error.body": "The page hit an error. The data is fine — try reloading.",
  "error.reload": "Reload",

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
  "hero.countdown": ({ d, h, m, s }) =>
    d > 0 ? `Kicks off in ${d}d ${h}h ${m}m ${s}s`
      : h > 0 ? `Kicks off in ${h}h ${m}m ${s}s`
      : `Kicks off in ${m}m ${s}s`,
  "timetable.onNow": "On now",
  "event.ht": "Half-time",
  "event.et": "Extra time",
  "compare.vs": "VS",
  "bracket.topHalf": "Top half of the draw",
  "bracket.bottomHalf": "Bottom half of the draw",
  "meth.tile.brier": "Brier score",
  "meth.tile.logloss": "Log loss",
  "meth.tile.baseline": ({ v }) => `uniform baseline ${v}`,
  "match.pens": ({ h, a }) => `${h}–${a} on penalties`,
  "match.pensShort": ({ h, a }) => `(${h}–${a} p)`,
  "match.pensL": ({ h }) => `(${h}`,
  "match.pensR": ({ a }) => `${a} p)`,
  "match.aet": "AET",
  "match.prediction": "Model Prediction",
  "match.likelyScore": "Most likely score:",
  "match.how": "how this works",
  "match.teamStats": "Team Statistics",
  "match.lineups": "Lineups",
  "match.squads": "Squads",
  "match.bench": "BENCH",
  "match.squadNote": "Official lineups appear ~30 minutes before kickoff — full 26-man squads below.",
  "match.timeline": "Timeline",
  "reminder.cta": "Reminder 5 min before kickoff",
  "reminder.aria": "Add a 5-minute kickoff reminder",
  "ics.title": "FIFA World Cup 2026",
  "momentum.title": "Win Probability",
  "momentum.lineLabel": "win probability",
  "momentum.even": "even",
  "momentum.now": "Now",
  "momentum.note": "A live proxy: the score so far plus the model's expectation for the minutes remaining. Not a trained in-match model — it ignores who has the ball.",
  "event.own-goal": "own goal",
  "event.penalty-goal": "pen",
  "event.assist": ({ name }) => `assist: ${name}`,
  "shotmap.title": "Shot Map",
  "shotmap.allPlayers": "All Players",
  "shotmap.tapHint": "Tap a shot, or scrub the timeline to replay the match",
  "shotmap.xgSource": "xG / xGOT data via ESPN",
  "shotmap.scrub": "Scrub match minutes",
  "shotmap.upTo": ({ min, shown, total }) => `${min}' · ${shown}/${total}`,
  "shotmap.prevShot": "Previous shot",
  "shotmap.nextShot": "Next shot",
  "shot.result.goal": "Goal",
  "shot.result.saved": "Saved",
  "shot.result.off-target": "Off Target",
  "shot.result.blocked": "Blocked",
  "shot.xg": "xG",
  "shot.xgot": "xGOT",
  "shot.distance": "Distance",
  "shot.bodyPart": "Shot Type",
  "shot.situation": "Situation",
  "shot.goalZone": "Goal Zone",
  "shot.metres": ({ n }) => `${n} m`,
  "prob.draw": "draw",

  // team stat rows
  "stat.xg": "Expected goals (xG)",
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
  "timetable.search": "Search a team…",
  "timetable.none": "No matches for that search.",
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

  // group standings
  "groups.title": "Group Standings",
  "groups.group": ({ letter }) => `Group ${letter}`,
  "groups.qualify": "Top 2 advance",
  "groups.empty": "No group matches have finished yet.",
  "groups.pos": "#",
  "groups.col.played": "P",
  "groups.col.won": "W",
  "groups.col.drawn": "D",
  "groups.col.lost": "L",
  "groups.col.gf": "GF",
  "groups.col.ga": "GA",
  "groups.col.gd": "GD",
  "groups.col.pts": "Pts",

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
  "player.career.present": "present",
  "player.careerNote": "Pre-tournament career via ESPN season totals (league and cup competitions where tracked). ESPN counts starts, not substitute appearances.",

  // bracket
  "bracket.title": "Knockout Bracket",
  "bracket.lead": ({ n }) => `Round of 32 through the final · champion odds from ${n} Monte Carlo simulations · `,
  "bracket.leadNoSim": "Round of 32 through the final · ",
  "bracket.champion": "Champion",
  "bracket.third": "3rd place",
  "bracket.caveat": "Slots show the FIFA seeding (group winner 1A, runner-up 2B, a best third 3rd) until results resolve them. The eight best third-placed teams are assigned by a deterministic rule that can differ from FIFA's published allocation in rare combinations. Percentages are each team's simulated chance of winning the tournament.",

  // compare
  "compare.title": "Compare",
  "compare.lead": "Put two teams or two players side by side.",
  "compare.teams": "Teams",
  "compare.players": "Players",
  "compare.selectTeam": "Select a team…",
  "compare.selectPlayer": "Select a player…",
  "compare.empty": "Pick two to compare.",
  "compare.played": "Played",
  "compare.won": "Won",
  "compare.drawn": "Drawn",
  "compare.lost": "Lost",
  "compare.gf": "Goals for",
  "compare.ga": "Goals against",
  "compare.pts": "Points",
  "compare.champ": "Champion odds",
  "compare.form": "Form (last 5)",

  // home / briefing
  "home.title": "Matchday Briefing",
  "home.autogen": "auto-generated from match data",
  "home.updated": ({ time }) => `updated ${time}`,
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

  // hover fun-fact bar (player line derived from live data; country facts below)
  "fact.loading": "…",
  "posOne.GK": "Goalkeeper",
  "posOne.DF": "Defender",
  "posOne.MF": "Midfielder",
  "posOne.FW": "Forward",
  "fact.player": ({ team, posLabel, age, club, g, a, apps, intlStarts }) => {
    const id = [team, posLabel, age != null ? `age ${age}` : null, club]
      .filter(Boolean)
      .join(" · ");
    const tail =
      apps > 0
        ? `WC26: ${g}G ${a}A in ${apps} app${apps === 1 ? "" : "s"}`
        : intlStarts
          ? `${intlStarts} international starts`
          : null;
    return tail ? `${id} — ${tail}` : id;
  },
  // country fun facts — verified, durable (titles / hosting / historic results)
  "fact.team.ALG": "Stunned West Germany 2-1 at the 1982 World Cup.",
  "fact.team.ARG": "Three-time World Cup champion — 1978, 1986 and 2022.",
  "fact.team.AUS": "Beat American Samoa 31-0 in 2001 — the largest win in international football.",
  "fact.team.AUT": "Austria 7-5 Switzerland (1954) is the highest-scoring World Cup match.",
  "fact.team.BEL": "Finished third at the 2018 World Cup — the golden generation's best.",
  "fact.team.BIH": "Made their World Cup debut in 2014 as an independent nation.",
  "fact.team.BRA": "The only team to play in every World Cup, and a record five-time champion.",
  "fact.team.CAN": "Won the 2000 CONCACAF Gold Cup, beating Mexico and the USA.",
  "fact.team.CIV": "Three-time Africa Cup of Nations champion — 1992, 2015 and 2023.",
  "fact.team.COD": "As Zaire in 1974, the first sub-Saharan African team at a World Cup.",
  "fact.team.COL": "Won 5-0 away to Argentina in a famous 1993 World Cup qualifier.",
  "fact.team.CPV": "An Atlantic archipelago of about 500,000, nicknamed the Blue Sharks.",
  "fact.team.CRO": "Reached the 2018 World Cup final in their famous red-and-white checks.",
  "fact.team.CUW": "FIFA's recognized successor to the former Netherlands Antilles.",
  "fact.team.CZE": "Home of the “Panenka” penalty — Antonín Panenka, Euro 1976.",
  "fact.team.ECU": "Reached the World Cup Round of 16 in 2006, their best result.",
  "fact.team.EGY": "Record seven-time Africa Cup of Nations champion.",
  "fact.team.ENG": "Won the 1966 World Cup on home soil — their only title.",
  "fact.team.ESP": "2010 World Cup winners and four-time European champions.",
  "fact.team.FRA": "Two-time World Cup champion — 1998 and 2018.",
  "fact.team.GER": "Four-time World Cup champion — 1954, 1974, 1990 and 2014.",
  "fact.team.GHA": "Four-time Africa Cup of Nations champion; 2010 World Cup quarter-finalists.",
  "fact.team.HAI": "In 1974, Emmanuel Sanon ended Dino Zoff's record 1,142-minute shutout streak.",
  "fact.team.IRN": "The only side to win three straight Asian Cups — 1968, 1972 and 1976.",
  "fact.team.IRQ": "Won the 2007 Asian Cup as underdogs from a war-torn nation.",
  "fact.team.JOR": "Runners-up at the 2023 Asian Cup — their first major final.",
  "fact.team.JPN": "Record four-time AFC Asian Cup champion.",
  "fact.team.KOR": "First Asian team to reach a World Cup semi-final, in 2002.",
  "fact.team.KSA": "Beat eventual finalists Argentina 2-1 at the 2022 World Cup.",
  "fact.team.MAR": "First African team to reach a World Cup semi-final, in 2022.",
  "fact.team.MEX": "First nation to host two World Cups — 1970 and 1986.",
  "fact.team.NED": "Home of Total Football; three-time World Cup runner-up (1974, 1978, 2010).",
  "fact.team.NOR": "Have never lost to Brazil — two wins and two draws in four meetings.",
  "fact.team.NZL": "The only unbeaten team at the 2010 World Cup — three draws.",
  "fact.team.PAN": "Declared a national holiday when they reached their first World Cup, 2018.",
  "fact.team.PAR": "Reached the World Cup quarter-finals in 2010, their best run.",
  "fact.team.POR": "Won Euro 2016, their first major international trophy.",
  "fact.team.QAT": "First Arab nation to host the World Cup, in 2022.",
  "fact.team.RSA": "First African nation to host the World Cup, in 2010.",
  "fact.team.SCO": "Played the world's first official international — vs England, 1872.",
  "fact.team.SEN": "Reached the quarter-finals on their 2002 World Cup debut, beating France.",
  "fact.team.SUI": "Home of FIFA, headquartered in Zürich; hosted the 1954 World Cup.",
  "fact.team.SWE": "Runners-up as hosts of the 1958 World Cup, losing the final to Brazil.",
  "fact.team.TUN": "First African team to win a World Cup match — beat Mexico 3-1 in 1978.",
  "fact.team.TUR": "Hakan Şükür's 2002 strike (about 11 sec) is the fastest World Cup goal.",
  "fact.team.URU": "Won the first World Cup in 1930 as hosts; two-time champion.",
  "fact.team.USA": "Reached the semi-finals of the first World Cup in 1930 — their best finish.",
  "fact.team.UZB": "A Central Asian side (AFC); won football gold at the 1994 Asian Games.",

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

  // Gamba Mode — play-money betting simulator
  "nav.gamba": "Gamba",
  "gamba.strap": "PLAY MONEY — ₲ are fake credits, never real money",
  "gamba.balance": "Balance",
  "gamba.nav.board": "Board",
  "gamba.nav.bets": "My bets",
  "gamba.nav.school": "School",
  "gamba.disclaimer": "₲ are fake credits with no cash value; nothing can be deposited, withdrawn, or purchased. This page exists to show, with your own numbers, why betting loses money.",

  "gamba.board.title": "The Board",
  "gamba.board.sub": "Every price below carries a margin — find it before it finds you.",
  "gamba.rule90": "All markets settle on the 90-minute score. A knockout draw after 90' pays DRAW, even though the match itself continues.",
  "gamba.board.overround": ({ sum, edge, book }) =>
    `The ${book} 1X2 prices below imply ${sum}% total probability. Real outcomes sum to 100% — the extra ${edge}% is the rake.`,
  "gamba.board.error": "Couldn’t load the odds board.",
  "gamba.board.empty": "No open markets — the tournament is done.",
  "gamba.board.locked": "Teams not decided yet — market opens when the bracket resolves",
  "gamba.board.noOdds": "Bookmakers haven't priced this one yet — check back closer to kickoff",
  "gamba.board.closed": "betting closed",

  "gamba.market.h2h": "1X2 · Match result (90')",
  "gamba.market.totals": "Over/Under · Total goals",
  "gamba.market.btts": "Both teams to score",
  "gamba.market.correct_score": "Correct score",
  "gamba.market.modelBook": "Model book",
  "gamba.market.realBook": "Real books",
  "gamba.market.median": "med",

  "gamba.sel.draw": "Draw",
  "gamba.sel.over": "Over",
  "gamba.sel.under": "Under",
  "gamba.sel.yes": "Yes",
  "gamba.sel.no": "No",
  "gamba.sel.otherScore": "Any other score",
  "gamba.sel.exactScore": ({ score }) => `${score} exactly`,
  "gamba.sel.toWin": ({ team }) => `${team} to win`,

  "gamba.slip.title": "Bet slip",
  "gamba.slip.empty": "Tap a price to start a ticket.",
  "gamba.slip.close": "Minimize bet slip",
  "gamba.slip.expand": "Expand bet slip",
  "gamba.slip.printed": "TICKET PRINTED ✓",
  "gamba.slip.stake": "Stake",
  "gamba.slip.returns": "Returns",
  "gamba.slip.fair": "Fair price (model)",
  "gamba.slip.implied": "Implied probability",
  "gamba.slip.ev": "Expected value",
  "gamba.slip.evPer": ({ v }) => `${v} per ₲100`,
  "gamba.slip.place": "Place fake bet",
  "gamba.slip.closed": "Betting closed",
  "gamba.slip.err.closed": "This match has kicked off — betting closed.",
  "gamba.slip.err.min": "Minimum stake is ₲10.",
  "gamba.slip.err.funds": "Not enough ₲.",
  "gamba.drip": "Claim daily mercy ₲200",

  "gamba.ticket.won": "WON",
  "gamba.ticket.lost": "LOST",
  "gamba.ticket.void": "VOID",
  "gamba.ticket.final": ({ score }) => `FT ${score}`,
  "gamba.ticket.fairWas": ({ fair, paid }) =>
    `Fair price was ${fair} — you paid ${paid}. That gap is the house edge.`,
  "gamba.ticket.aboveFair": ({ fair, paid }) =>
    `Model fair price was ${fair} — you got ${paid}. The model calls that generous; one of the two books is wrong.`,
  "gamba.toast.settled": ({ match, amount }) => `${match} settled — returns ${amount}.`,

  "gamba.bets.title": "My bets",
  "gamba.bets.staked": "Staked",
  "gamba.bets.returned": "Returned",
  "gamba.bets.net": "Net",
  "gamba.bets.roi": "ROI",
  "gamba.bets.none": "No tickets yet — the board is that way:",
  "gamba.bets.open": "Open tickets",
  "gamba.bets.settled": "Settled",
  "gamba.reset": "Reset account",
  "gamba.reset.confirm": "Wipe all tickets and restart at ₲500?",

  "gamba.onboard.title": "Welcome to Gamba Mode",
  "gamba.onboard.p1": "You get ₲500 of play money. ₲ are fake credits: no deposits, no withdrawals, no purchases — ever.",
  "gamba.onboard.p2": "Every price on the board carries a hidden margin, just like a real sportsbook. Your job is to watch it drain your balance.",
  "gamba.onboard.p3": "The School page keeps score of what the margin cost you. Probabilities are not betting advice — this page is the proof.",
  "gamba.onboard.cta": ({ amount }) => `Deal me in — ${amount}`,

  "gamba.school.title": "Why the book always wins",
  "gamba.school.p1": ({ margin }) =>
    `Every price in the model book is deliberately ${margin}% short of fair. Bet at fair odds forever and you break even; bet at book odds and you hand over the margin, every single time.`,
  "gamba.school.p2": "Expected value (EV) is the average outcome of a bet if it were replayed forever. Every ticket here shows its EV before you place it — negative on every model-book price by construction.",
  "gamba.school.p3": "Real bookmakers run the same machine with sharper probabilities and bigger margins on the markets casuals love. No staking plan, streak, or gut feeling beats a negative-EV game in the long run. That’s the whole lesson — and why probabilities are never betting advice.",
  "gamba.school.yourLedger": "Your ledger",
  "gamba.school.noHistory": "No settled tickets yet — the ledger fills in as your bets settle.",
  "gamba.school.expectedVsActual": ({ expected, expSign, actual, actSign }) =>
    `On the tickets you’ve settled, the model expected you to ${expSign} ${expected}; you actually ${actSign} ${actual}.`,
  "gamba.school.luck": "The difference is luck — and luck has no memory.",
  "gamba.school.lose": "lose",
  "gamba.school.win": "win",
  "gamba.school.lost": "lost",
  "gamba.school.won": "won",
  "gamba.school.overround": "The overround, live",
  "gamba.school.overroundDemo": ({ match, probs, sum, edge }) =>
    `Take ${match}: the real books’ median 1X2 prices imply ${probs} = ${sum}%. Genuine probabilities sum to 100% — the surplus ${edge}% is the bookmaker’s built-in profit on a balanced book.`,
  "gamba.school.overroundStatic": "A bookmaker prices every outcome slightly short of fair, so the implied probabilities sum past 100%. The surplus is the overround — the book’s margin on a balanced book. (No real odds are loaded right now, so there’s nothing live to dissect.)",
  "gamba.school.modelVsReal": "Model vs real books",
  "gamba.school.modelVsRealSub": "Same matches, two books: our Elo-Poisson model against the median of real bookmakers. Where they disagree most is where one of them is most wrong.",
  "gamba.school.thMatch": "Match",
  "gamba.school.thSel": "Selection",
  "gamba.school.takeaway": "The takeaway",
};
