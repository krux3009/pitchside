// Gamba settlement engine — pure functions, no React, no storage.
//
// Every market settles on the 90-minute score (home_goals_90/away_goals_90),
// bookmaker convention: a knockout draw after 90' pays Draw even though the
// match itself continues. Settlement reads the /api/matches feed, never
// /api/odds — the odds document can lag or vanish without touching balances.
//
// Bet shape (frozen at placement):
//   {id, matchId, market, selection, line, price, stake, placedAt, oddsSource,
//    pModel, homeName, awayName, homeId, awayId, listedScores?,
//    status: 'open'|'won'|'lost'|'void', returns?, settledAt?, result?}

export const START_BALANCE = 500;
export const MIN_STAKE = 10;
export const DRIP_AMOUNT = 200;
export const DRIP_BELOW = 200;

// ---- money ------------------------------------------------------------------

// ₲ = "Gamba credits". Whole numbers stay whole; fractional returns show 2dp.
export function fmtG(n) {
  const v = Math.round((n ?? 0) * 100) / 100;
  return "₲ " + v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(v) ? 0 : 2,
  });
}

// ---- the educational math ----------------------------------------------------

export const impliedP = (price) => (price > 0 ? 1 / price : 0);

// EV per 1 unit staked, judged by the model's probability: p*price - 1.
// Negative on every model-book price by construction — that IS the lesson.
export const ev = (pModel, price) => pModel * price - 1;

// Overround of a full market: sum of implied probabilities - 1 (the rake).
export const overround = (prices) =>
  prices.reduce((s, p) => s + impliedP(p), 0) - 1;

// ---- settlement --------------------------------------------------------------

function outcome(bet, h, a) {
  switch (bet.market) {
    case "h2h": {
      const winner = h > a ? "home" : h < a ? "away" : "draw";
      return bet.selection === winner;
    }
    case "totals":
      return bet.selection === "over" ? h + a > bet.line : h + a < bet.line;
    case "btts":
      return bet.selection === "yes" ? h >= 1 && a >= 1 : !(h >= 1 && a >= 1);
    case "correct_score": {
      const final = `${h}-${a}`;
      if (bet.selection === "other")
        return !(bet.listedScores || []).includes(final);
      return bet.selection === final;
    }
    default:
      return false;
  }
}

// One bet against one match row from /api/matches.
// Returns the settled bet, or null when it can't settle yet.
export function settleBet(bet, match) {
  if (!match || match.status !== "FT") return null;
  const settledAt = new Date().toISOString();
  const h = match.home_goals_90;
  const a = match.away_goals_90;
  // void (stake back): no 90' score recorded, or the fixture's teams changed
  // after placement (knockout re-pairing) — the bet's premise is gone
  const teamsChanged =
    (bet.homeId != null && match.home_id !== bet.homeId) ||
    (bet.awayId != null && match.away_id !== bet.awayId);
  if (h == null || a == null || teamsChanged) {
    return { ...bet, status: "void", returns: bet.stake, settledAt };
  }
  const won = outcome(bet, h, a);
  return {
    ...bet,
    status: won ? "won" : "lost",
    returns: won ? Math.round(bet.stake * bet.price * 100) / 100 : 0,
    result: `${h}-${a}`,
    settledAt,
  };
}

// All open bets against the matches feed. Returns {bets, credit, settled}:
// the full updated list, the total to add to the balance, and just the
// newly settled bets (for the stamp-toast).
export function settleAll(bets, matches) {
  const byId = new Map((matches || []).map((m) => [m.id, m]));
  const settled = [];
  const next = bets.map((bet) => {
    if (bet.status !== "open") return bet;
    const done = settleBet(bet, byId.get(bet.matchId));
    if (done) settled.push(done);
    return done || bet;
  });
  const credit = settled.reduce((s, b) => s + b.returns, 0);
  return { bets: next, credit, settled };
}

// Betting is open only before kickoff on a still-scheduled match.
export const canBet = (match, now = Date.now()) =>
  match?.status === "SCHEDULED" && now < new Date(match.kickoff_utc).getTime();

// Human line for a pick/ticket: "Brazil to win @ 2.10", "Over 2.5", "BTTS: yes".
// Takes the i18n helpers so tickets re-render in whichever language is on.
export function selectionText(bet, t, tCountry) {
  switch (bet.market) {
    case "h2h":
      return bet.selection === "draw"
        ? t("gamba.sel.draw")
        : t("gamba.sel.toWin", {
            team: tCountry(bet.selection === "home" ? bet.homeName : bet.awayName),
          });
    case "totals":
      return `${t(`gamba.sel.${bet.selection}`)} ${bet.line}`;
    case "btts":
      return `${t("gamba.market.btts")}: ${t(`gamba.sel.${bet.selection}`)}`;
    case "correct_score":
      return bet.selection === "other"
        ? t("gamba.sel.otherScore")
        : t("gamba.sel.exactScore", { score: bet.selection });
    default:
      return bet.selection;
  }
}

// ---- lifetime ledger (derived, never stored — storage can't drift) -----------

export function ledger(bets) {
  const settledBets = bets.filter((b) => b.status !== "open");
  const nonVoid = settledBets.filter((b) => b.status !== "void");
  const staked = nonVoid.reduce((s, b) => s + b.stake, 0);
  const returned = nonVoid.reduce((s, b) => s + (b.returns || 0), 0);
  // what the model priced each ticket at: stake * pModel * price
  const expectedReturn = nonVoid.reduce(
    (s, b) => s + b.stake * (b.pModel ?? impliedP(b.price)) * b.price, 0);
  return {
    nBets: bets.length,
    nSettled: settledBets.length,
    staked,
    returned,
    net: returned - staked,
    expectedNet: expectedReturn - staked,
    roi: staked > 0 ? (returned - staked) / staked : 0,
  };
}
