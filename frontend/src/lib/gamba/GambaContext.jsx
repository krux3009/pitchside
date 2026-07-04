// Gamba account state — same convention as LanguageContext: one context, one
// localStorage key, a memoised value. Fake credits only; editing localStorage
// is minting Monopoly money, so there's defensive parsing and nothing more —
// honest simplicity over security theater.
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  DRIP_AMOUNT, DRIP_BELOW, MIN_STAKE, START_BALANCE, canBet, settleAll,
} from "./engine";

const STORAGE_KEY = "pitchside.gamba.v1";

const FRESH = {
  version: 1,
  balance: START_BALANCE,
  bets: [],
  lastDripDate: null,
  onboardingSeen: false,
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw || raw.version !== 1 || typeof raw.balance !== "number"
        || !Array.isArray(raw.bets)) return FRESH;
    return { ...FRESH, ...raw };
  } catch {
    return FRESH;
  }
}

const GambaContext = createContext(null);

export function GambaProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo(() => {
    // returns an error key for the UI, or null on success
    const placeBet = (bet, match) => {
      let err = null;
      setState((s) => {
        if (!canBet(match)) { err = "closed"; return s; }
        if (!(bet.stake >= MIN_STAKE)) { err = "min"; return s; }
        if (bet.stake > s.balance) { err = "funds"; return s; }
        return {
          ...s,
          balance: Math.round((s.balance - bet.stake) * 100) / 100,
          bets: [
            { ...bet, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              placedAt: new Date().toISOString(), status: "open" },
            ...s.bets,
          ],
        };
      });
      return err;
    };

    // settle open bets against the matches feed; returns newly settled bets.
    // Computed against the current render's state (the memo is rebuilt every
    // state change and the caller is a post-render effect). Idempotent: a
    // second call finds no open bets, so StrictMode's double effects and
    // overlapping polls can never double-credit.
    const settle = (matches) => {
      const { bets, credit, settled } = settleAll(state.bets, matches);
      if (settled.length) {
        setState((s) => ({
          ...s, bets,
          balance: Math.round((s.balance + credit) * 100) / 100,
        }));
      }
      return settled;
    };

    // mercy drip: +₲200 once per day, only while broke — never a top-up
    const today = new Date().toISOString().slice(0, 10);
    const canDrip = state.balance < DRIP_BELOW && state.lastDripDate !== today;
    const claimDrip = () => {
      setState((s) =>
        s.balance < DRIP_BELOW && s.lastDripDate !== today
          ? { ...s, balance: s.balance + DRIP_AMOUNT, lastDripDate: today }
          : s);
    };

    const resetAccount = () =>
      setState((s) => ({ ...FRESH, onboardingSeen: s.onboardingSeen }));
    const markOnboarded = () =>
      setState((s) => ({ ...s, onboardingSeen: true }));

    return {
      balance: state.balance,
      bets: state.bets,
      onboardingSeen: state.onboardingSeen,
      canDrip,
      placeBet, settle, claimDrip, resetAccount, markOnboarded,
    };
  }, [state]);

  return <GambaContext.Provider value={value}>{children}</GambaContext.Provider>;
}

export function useGamba() {
  return useContext(GambaContext);
}
