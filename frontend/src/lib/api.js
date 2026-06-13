// Data fetch with a tiny in-memory TTL cache. Two modes:
//
//  - STATIC (VITE_DATA_URL set): read pre-generated JSON snapshots from a CDN.
//    No live backend, so no Render cold-start wait — the fast production path.
//  - API (fallback, VITE_DATA_URL unset): hit the live FastAPI backend with one
//    cold-start retry. Kept so the app still runs against a running API.

const DATA_BASE = import.meta.env.VITE_DATA_URL;        // e.g. https://kruxqlyz.com/data
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const cache = new Map(); // path -> { at, data }

const TTL = (path) =>
  path.startsWith("/api/sim") || path.startsWith("/api/methodology")
    ? 60 * 60 * 1000
    : 60 * 1000;

// Map an API path to its static-snapshot file (mirrors backend/scripts/build_static.py).
const STATIC_FILE = {
  "/api/matches": "matches.json",
  "/api/players": "players.json",
  "/api/standings": "standings.json",
  "/api/briefing/today": "briefing-today.json",
  "/api/sim/championship": "sim-championship.json",
  "/api/methodology/params": "methodology-params.json",
};
function staticPath(path) {
  const clean = path.split("?")[0]; // drop ?query — the frontend filters client-side
  if (STATIC_FILE[clean]) return STATIC_FILE[clean];
  return clean.replace(/^\/api\//, "") + ".json"; // /api/matches/19 -> matches/19.json
}

export async function apiGet(path, { retry = true } = {}) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL(path)) return hit.data;

  if (DATA_BASE) {
    // static mode: a CDN file is there or it isn't — no server to wake, no retry
    const res = await fetch(`${DATA_BASE}/${staticPath(path)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.set(path, { at: Date.now(), data });
    return data;
  }

  // api mode (fallback): live backend, one cold-start retry (~30-60s to wake)
  try {
    const res = await fetch(API_BASE + path, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.set(path, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (retry) {
      await new Promise((r) => setTimeout(r, 20_000));
      return apiGet(path, { retry: false });
    }
    throw err;
  }
}
