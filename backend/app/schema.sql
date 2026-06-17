-- Pitchside cache schema.
-- SQLite here is a rebuildable cache: committed seed.db + nightly results archive +
-- a catch-up refresh can reconstruct every table after a Render restart.

CREATE TABLE IF NOT EXISTS teams (
  id            INTEGER PRIMARY KEY,        -- canonical Pitchside id (1..48, seed-assigned)
  name          TEXT NOT NULL,
  fifa_code     TEXT,                       -- 'BRA', 'USA', ...
  elo_code      TEXT,                       -- eloratings.net 2-letter code
  group_letter  TEXT,                       -- 'A'..'L'
  fifa_rank     INTEGER,                    -- final tie-breaker
  elo           REAL NOT NULL,
  is_host       INTEGER DEFAULT 0,          -- USA / MEX / CAN
  badge_url     TEXT,
  af_id         INTEGER,                    -- API-Football team id (filled on first fetch)
  espn_id       TEXT
);

CREATE TABLE IF NOT EXISTS matches (
  id            INTEGER PRIMARY KEY,        -- FIFA official match number 1..104
  stage         TEXT NOT NULL,              -- 'GROUP','R32','R16','QF','SF','THIRD','FINAL'
  group_letter  TEXT,
  kickoff_utc   TEXT NOT NULL,              -- ISO 8601
  venue         TEXT,
  city          TEXT,
  venue_country TEXT,                       -- drives host Elo bonus
  home_team_id  INTEGER REFERENCES teams(id),  -- NULL until knockout slot resolves
  away_team_id  INTEGER REFERENCES teams(id),
  home_slot     TEXT,                       -- knockout feed: '1A', '2B', '3A/B/C/D/F', 'W73', 'L101'
  away_slot     TEXT,
  status        TEXT DEFAULT 'SCHEDULED',   -- 'SCHEDULED','LIVE','FT'
  home_goals    INTEGER,                    -- final, incl. extra time
  away_goals    INTEGER,
  home_goals_90 INTEGER,                    -- regulation only; Elo + Poisson fit on these
  away_goals_90 INTEGER,
  home_pens     INTEGER,
  away_pens     INTEGER,
  winner_team_id INTEGER,
  af_fixture_id INTEGER,                    -- API-Football fixture id (filled on first fetch)
  espn_event_id TEXT
);

CREATE TABLE IF NOT EXISTS match_team_stats (
  match_id      INTEGER REFERENCES matches(id),
  team_id       INTEGER REFERENCES teams(id),
  possession    REAL,
  shots         INTEGER,
  shots_on_target INTEGER,
  corners       INTEGER,
  fouls         INTEGER,
  offsides      INTEGER,
  yellows       INTEGER,
  reds          INTEGER,
  passes        INTEGER,
  pass_accuracy REAL,
  xg            REAL,                       -- NULL until the v1.1 FBref layer
  PRIMARY KEY (match_id, team_id)
);

CREATE TABLE IF NOT EXISTS players (
  id            INTEGER PRIMARY KEY,        -- canonical: team_id*100 + shirt_number
                                            -- (ESPN id only for late squad additions)
  team_id       INTEGER REFERENCES teams(id),
  name          TEXT NOT NULL,
  position      TEXT,                       -- GK/DF/MF/FW from squads; refined by ESPN
  shirt_number  INTEGER,
  date_of_birth TEXT,
  photo_url     TEXT,
  espn_id       TEXT                        -- ESPN athlete id, learned on first match ingest
);

CREATE TABLE IF NOT EXISTS player_match_stats (
  match_id      INTEGER REFERENCES matches(id),
  player_id     INTEGER REFERENCES players(id),
  team_id       INTEGER REFERENCES teams(id),
  started       INTEGER,
  minutes       INTEGER,
  goals         INTEGER,
  assists       INTEGER,
  yellow        INTEGER,
  red           INTEGER,
  shots         INTEGER,
  shots_on_target INTEGER,
  passes        INTEGER,
  rating        REAL,
  PRIMARY KEY (match_id, player_id)
);

-- Tournament totals are always derived, never fetched (saves the API budget).
CREATE VIEW IF NOT EXISTS player_totals AS
  SELECT player_id,
         team_id,
         COUNT(*)                                            AS apps,
         SUM(minutes)                                        AS minutes,
         SUM(goals)                                          AS goals,
         SUM(assists)                                        AS assists,
         SUM(yellow)                                         AS yellows,
         SUM(red)                                            AS reds,
         ROUND(90.0 * SUM(goals) / NULLIF(SUM(minutes), 0), 2) AS goals_per_90
  FROM player_match_stats
  GROUP BY player_id;

-- Pre-tournament career history, one row per season x team x competition.
-- Bulk-fetched from ESPN's athlete-stats API into seed.db by
-- scripts/fetch_careers.py (static during the tournament, so it ships in the
-- seed and never touches the matchday refresh loop or the nightly archive).
-- ESPN's soccer feed counts STARTS, not appearances — columns say what they mean.
CREATE TABLE IF NOT EXISTS player_career (
  player_id     INTEGER REFERENCES players(id),
  espn_team_id  TEXT,
  team_name     TEXT,
  league_slug   TEXT,
  league_name   TEXT,
  season_year   INTEGER,
  season_name   TEXT,                       -- '2025-26 Turkish Super Lig', 'Final', ...
  is_national   INTEGER DEFAULT 0,          -- senior or youth national duty vs club
  starts        INTEGER,
  goals         INTEGER,
  assists       INTEGER,
  shots         INTEGER,
  shots_on_target INTEGER,
  yellows       INTEGER,
  reds          INTEGER,
  fouls_committed INTEGER,
  fouls_suffered  INTEGER,
  offsides      INTEGER,
  clean_sheets  INTEGER,                    -- GK category; NULL for outfielders
  saves         INTEGER,
  goals_against INTEGER,
  PRIMARY KEY (player_id, espn_team_id, league_slug, season_year, season_name)
);

CREATE TABLE IF NOT EXISTS lineups (
  match_id      INTEGER REFERENCES matches(id),
  team_id       INTEGER REFERENCES teams(id),
  formation     TEXT,
  starters_json TEXT,                       -- [{player_id,name,number,pos,grid}]
  bench_json    TEXT,
  coach         TEXT,
  PRIMARY KEY (match_id, team_id)
);

-- Timed match event log (goals/cards/subs) parsed from the ESPN summary feed's
-- keyEvents array. Runtime-only like lineups; archived so it survives a redeploy.
CREATE TABLE IF NOT EXISTS match_events (
  match_id      INTEGER REFERENCES matches(id),
  seq           INTEGER,                    -- order within the match (keyEvents index)
  minute        INTEGER,                    -- match clock; NULL if unparseable
  clock         TEXT,                       -- ESPN displayValue, e.g. "45+2'"
  type          TEXT,                       -- goal/own-goal/penalty-goal/yellow-card/red-card/substitution
  team_id       INTEGER REFERENCES teams(id),
  player_id     INTEGER,                    -- canonical id when resolvable, else NULL
  player_name   TEXT,                       -- scorer / carded / sub coming ON (always present)
  assist_id     INTEGER,                    -- goal: assister; sub: player coming OFF
  assist_name   TEXT,
  text          TEXT,                       -- ESPN shortText for the row
  PRIMARY KEY (match_id, seq)
);

CREATE TABLE IF NOT EXISTS injuries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id       INTEGER,
  player_id     INTEGER,
  player_name   TEXT,
  reason        TEXT,
  status        TEXT,
  reported_at   TEXT
);

CREATE TABLE IF NOT EXISTS predictions (
  match_id      INTEGER PRIMARY KEY REFERENCES matches(id),
  model_version TEXT,
  home_elo      REAL,
  away_elo      REAL,
  lambda_home   REAL,
  mu_away       REAL,
  p_home        REAL,
  p_draw        REAL,
  p_away        REAL,
  likely_score  TEXT,                       -- '2-1'
  score_matrix_json TEXT,
  created_at    TEXT
);

CREATE TABLE IF NOT EXISTS elo_history (
  team_id       INTEGER,
  match_id      INTEGER,
  elo_after     REAL,
  recorded_at   TEXT,
  PRIMARY KEY (team_id, match_id)
);

CREATE TABLE IF NOT EXISTS sim_results (
  run_id        TEXT,
  run_at        TEXT,
  n_iterations  INTEGER,
  team_id       INTEGER REFERENCES teams(id),
  p_win_group   REAL,
  p_r32         REAL,
  p_r16         REAL,
  p_qf          REAL,
  p_sf          REAL,
  p_final       REAL,
  p_champion    REAL,
  PRIMARY KEY (run_id, team_id)
);

CREATE TABLE IF NOT EXISTS briefings (
  briefing_date TEXT PRIMARY KEY,           -- 'YYYY-MM-DD'
  content_json  TEXT,
  generated_at  TEXT
);

-- Budget ledger: every external request is logged; the API-Football client refuses
-- to fire once today's count passes the soft cap.
CREATE TABLE IF NOT EXISTS fetch_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fetched_at    TEXT,
  source        TEXT,                       -- 'api_football' | 'espn' | 'openfootball'
  endpoint      TEXT,
  params        TEXT,
  status        INTEGER
);

CREATE TABLE IF NOT EXISTS meta (
  key           TEXT PRIMARY KEY,
  value         TEXT
);
