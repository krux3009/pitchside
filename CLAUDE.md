# CLAUDE.md — Pitchside

World Cup 2026 analytics site. Live: https://worldcup.kruxqlyz.com · API on Render ·
repo github.com/krux3009/pitchside. Architecture, data sources, and model math: `README.md`.

## Session start

**Before any work, check `../../handoffs/` (vault root) for the most recent
`*pitchside*` handoff doc and read it** — it carries the current task, open
follow-ups, and constraints that aren't in the code.

## Commands

```bash
cd backend && .venv/bin/python -m pytest tests/   # test suite (uv venv, Python 3.12 — scipy needs it)
.venv/bin/python scripts/build_seed.py            # rebuild seed.db from free sources
.venv/bin/uvicorn app.main:app --reload           # local API on :8000
cd frontend && npm run dev                        # local UI on :5173 (VITE_API_URL defaults to :8000)
# deploy = git push (Render + Vercel auto-deploy from main)
```

## Hard rules

- Free data tiers only. ESPN = no quota; FBref = max 1 request/6s (day-ban risk);
  API-Football free = seasons 2022–2024 only (season 2026 paywalled — verified NO-GO).
- Render disk is ephemeral: anything that must survive a redeploy goes in seed.db,
  in the nightly archive (`backend/app/archive.py::TABLES`), or must be cheaply
  re-fetchable on boot (the lifespan self-heal handles recomputable state).
- Career/heavy fetches must NOT run inside the matchday refresh loop
  (`fetch/refresh.py` runs every 10 min via GitHub Actions cron).
- Gambling disclaimer (`frontend/src/components/Disclaimer.jsx`) on every surface
  that shows a probability — don't remove placements.
- Plain sqlite3 + handwritten SQL, no ORM. Recruiters read this repo.
- Player identity: `players.id` is canonical (`team_id*100 + shirt_number`);
  ESPN athletes reconcile via `fetch/ingest.py::_resolve_player` — never insert
  players keyed on raw external ids.
- 2026 tie-breakers: overall goal difference BEFORE head-to-head (new for 2026) —
  `model/tiebreakers.py` is correct; don't "fix" it against pre-2026 references.
