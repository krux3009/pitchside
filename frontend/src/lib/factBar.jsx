import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { apiGet } from "./api";

// Drives the global hover fun-fact bar. TeamBadge / player links call
// showTeam / showPlayer on mouseenter and clear() on mouseleave; <FactBar/>
// (mounted in Layout) renders whatever fact is current. Small show/hide delays
// stop the bar flickering as the cursor crosses many badges in a row.

const FactBarContext = createContext(null);
const NOOP = { fact: null, showTeam() {}, showPlayer() {}, clear() {} };

export function useFactBar() {
  return useContext(FactBarContext) ?? NOOP;
}

export function FactBarProvider({ children }) {
  const [fact, setFact] = useState(null); // { kind: "team"|"player", code?, id?, name, data? }
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const reqId = useRef(0); // invalidates stale player fetches

  const showTeam = useCallback((code, name) => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => setFact({ kind: "team", code, name }), 120);
  }, []);

  const showPlayer = useCallback((id, name) => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    const myReq = ++reqId.current;
    showTimer.current = setTimeout(() => {
      setFact({ kind: "player", id, name, data: null });
      apiGet(`/api/players/${id}`)
        .then((data) => {
          if (reqId.current === myReq) setFact({ kind: "player", id, name, data });
        })
        .catch(() => {
          /* leave name-only; the bar degrades to just the name */
        });
    }, 120);
  }, []);

  const clear = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      reqId.current++; // drop any in-flight player fetch
      setFact(null);
    }, 150);
  }, []);

  const value = useMemo(
    () => ({ fact, showTeam, showPlayer, clear }),
    [fact, showTeam, showPlayer, clear]
  );
  return <FactBarContext.Provider value={value}>{children}</FactBarContext.Provider>;
}
