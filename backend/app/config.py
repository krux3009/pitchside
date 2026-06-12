"""Environment configuration. Loaded once at import time."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY", "")
REFRESH_KEY = os.getenv("REFRESH_KEY", "change-me")
DB_PATH = Path(os.getenv("DB_PATH") or DATA_DIR / "pitchside.db")
SEED_DB_PATH = DATA_DIR / "seed.db"
# comma-separated list, e.g. "https://site-a.vercel.app,https://worldcup.example.com"
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGIN", "http://localhost:5173").split(",")
    if o.strip()
]

# API-Football: free plan allows 100 requests/day. We stop at a soft cap so a
# restart that wipes the ledger can never push the real total past 100.
API_FOOTBALL_DAILY_SOFT_CAP = 80
WORLD_CUP_LEAGUE_ID = 1
SEASON = 2026
