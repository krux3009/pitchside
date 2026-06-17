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

export async function apiGet(path, { retry = true, bypassCache = false } = {}) {
  if (!bypassCache) {
    const hit = cache.get(path);
    if (hit && Date.now() - hit.at < TTL(path)) return hit.data;
  }

  if (DATA_BASE) {
    // static mode: read the CDN snapshot — no server to wake. On a miss (e.g. an
    // id newer than the last snapshot) fall through to the live API once rather
    // than hard-erroring; the happy path never touches Render. Requires
    // VITE_API_URL to stay set so the fallback has somewhere to go.
    try {
      const res = await fetch(`${DATA_BASE}/${staticPath(path)}`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache.set(path, { at: Date.now(), data });
      return data;
    } catch {
      // CDN miss → fall through to the live-API path below
    }
  }

  // api mode (also the static-miss fallback): live backend, one cold-start retry
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

// Freshness beacon written by the server-side publisher (publish.py::snapshot).
// Static (production) mode only — the live API has no status.json — so this
// returns the ISO publish time, or null when there's nothing to show.
export async function getPublishedAt() {
  if (!DATA_BASE) return null;
  try {
    const res = await fetch(`${DATA_BASE}/status.json`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()).published_at ?? null;
  } catch {
    return null;
  }
}
