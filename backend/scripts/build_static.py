"""Snapshot the Pitchside read API into a static JSON tree.

Hits a running API (``--base``) and writes one file per read endpoint, so the
whole site can be served from a CDN with no live backend — which removes the
Render free-tier cold-start latency that makes first load slow on mobile.

Run against production in CI, or a local uvicorn while developing:

    python scripts/build_static.py --base https://pitchside-api-atie.onrender.com --out ./static_out
    python scripts/build_static.py                 # defaults to http://localhost:8000

Output tree (consumed by frontend/src/lib/api.js static mode):
    matches.json  players.json  standings.json
    briefing-today.json  sim-championship.json  methodology-params.json
    matches/<id>.json   players/<id>.json
"""
import argparse
import json
from pathlib import Path

import httpx

# NOTE: app/publish.py is the server-side twin of this script — it pushes the same
# tree to the CDN from inside the API. Keep FIXED, the per-id loops, and the
# json.dumps flags in sync with publish.py and frontend/src/lib/api.js::staticPath.

# fixed (no path param) endpoints -> output filename
FIXED = {
    "/api/matches": "matches.json",
    "/api/players": "players.json",
    "/api/standings": "standings.json",
    "/api/briefing/today": "briefing-today.json",
    "/api/sim/championship": "sim-championship.json",
    "/api/methodology/params": "methodology-params.json",
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8000",
                    help="API base URL to snapshot")
    ap.add_argument("--out", default="static_out", help="output directory")
    args = ap.parse_args()
    base = args.base.rstrip("/")
    out = Path(args.out)

    # generous timeout: a cold Render instance can take ~60s to wake on first hit.
    # trust_env=False: ignore any system/HTTP proxy — we talk to base directly.
    with httpx.Client(base_url=base, timeout=90.0, trust_env=False) as client:
        def get(path):
            r = client.get(path)
            r.raise_for_status()
            return r.json()

        def write(rel, payload):
            dest = out / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(
                json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            )

        for path, fname in FIXED.items():
            write(fname, get(path))

        matches = get("/api/matches")
        for m in matches:
            write(f"matches/{m['id']}.json", get(f"/api/matches/{m['id']}"))

        players = get("/api/players")
        for p in players:
            write(f"players/{p['player_id']}.json", get(f"/api/players/{p['player_id']}"))

    n = sum(1 for _ in out.rglob("*.json"))
    print(f"build_static: wrote {n} files to {out} (base={base}, "
          f"{len(matches)} matches, {len(players)} players)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
