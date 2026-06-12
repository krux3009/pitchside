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
React (Vite) on Vercel  ──fetch──▶  FastAPI on Render  ──SQLite cache──▶  data sources
                                          ▲
                          GitHub Actions cron (refresh + keep-alive + nightly archive)
```

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
