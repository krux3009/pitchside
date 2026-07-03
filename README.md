# Pitchside ⚽

World Cup 2026 analytics site — live match data, transparent statistical predictions, and a
Monte Carlo tournament simulation. Built as a portfolio project while the tournament runs
(June 11 – July 19, 2026).

## What it does

- **Home** — auto-generated daily briefing (yesterday's results, standout performers,
  today's fixtures with win probabilities, injury flags) plus a champion-odds chart from a
  10,000-iteration tournament simulation.
- **Timetable** — all 104 matches, filterable by stage / group / team / date.
- **Match breakdown** — team stats comparison, lineups, and a win/draw/loss prediction.
- **Player breakdown** — tournament stats plus derived metrics (goals/90, share of team
  goals, form trend), and pre-tournament career history (club + international season
  totals via ESPN, bulk-baked into the seed by `scripts/fetch_careers.py`).
- **Methodology** — every formula, fitted parameter, and citation behind the predictions,
  with a live backtest scorecard grading the model against real results.

> PS: This is a student statistics project. Probabilities are model estimates and are
> frequently wrong — they are not betting advice. If you gamble, nothing here should
> inform it.

## How predictions work (short version)

World Football Elo ratings → expected goals via a fitted Poisson bridge → 11×11 score
matrix with the Dixon-Coles low-score correction → win/draw/loss probabilities. The
tournament simulation replays the remaining schedule 10,000 times using the official 2026
tie-breaking rules. Full details, formulas, and citations live on the Methodology page.

## Architecture

```
React (Vite) on Vercel  ──fetch──▶  static-JSON CDN (Hostinger)   ← production read path
                              └────▶  FastAPI on Render  ──SQLite cache──▶  data sources
                                          ▲
          external cron pinger (~10 min refresh+publish, keep-alive) · in-app live loop (~75s during matches)
          GitHub Actions (nightly archive · on-demand static-publish)
```

**Cold-start avoidance:** Render's free tier sleeps after 15 min idle (30–60s to
wake). In production the frontend reads pre-generated JSON snapshots from a CDN
instead of the live API, so users never wait on Render. Set `VITE_DATA_URL` in
Vercel to turn this on (unset = talk straight to the API, the dev default); see
`frontend/.env.example`. Snapshots are rebuilt by the `static-publish` GitHub
Action (`backend/scripts/build_static.py` → Hostinger FTP) on the matchday
cadence, or on demand via the workflow's manual trigger. On a snapshot miss the
frontend falls back to the live API once (`frontend/src/lib/api.js`).

Data sources: API-Football (lineups, player stats, injuries — 100 req/day free budget),
ESPN public JSON (live scores, no quota), openfootball (fixtures/results, CC0),
eloratings.net (Elo seeds), martj42/international_results (model fitting).

## Run locally

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add your API_FOOTBALL_KEY
uvicorn app.main:app --reload

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Status

- [x] M1 — data sources verified, repo scaffolded
- [x] M2 — model core (Elo + Poisson + backtest)
- [x] M3 — simulation + fetch pipeline
- [x] M4 — frontend shell + Home
- [x] M5 — Timetable + Match breakdown
- [x] M6 — Players + Methodology
- [ ] M7 — polish + launch (deploy to Render + Vercel, mobile pass, README screenshots)

Screenshots in `docs/`. v1.1 backlog: FBref xG layer, API-Football injuries
(needs key), exact FIFA third-place allocation table, score-matrix heatmap.
