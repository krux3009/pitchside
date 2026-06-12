// Single fetch path: base URL + tiny in-memory TTL cache + one cold-start retry
// (the Render free instance takes ~30-60s to wake after idling).

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const cache = new Map(); // path -> { at, data }

const TTL = (path) =>
  path.startsWith("/api/sim") || path.startsWith("/api/methodology")
    ? 60 * 60 * 1000
    : 60 * 1000;

export async function apiGet(path, { retry = true } = {}) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL(path)) return hit.data;

  try {
    const res = await fetch(BASE + path, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.set(path, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (retry) {
      // likely a cold start: give the instance time to wake, try once more
      await new Promise((r) => setTimeout(r, 20_000));
      return apiGet(path, { retry: false });
    }
    throw err;
  }
}
