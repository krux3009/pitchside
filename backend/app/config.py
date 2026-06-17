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

# Hostinger FTP target for the static-JSON CDN publish — the server-side twin of
# the build_static GitHub Action (see publish.py). Empty creds => publish is inert.
HOSTINGER_FTP_HOST = os.getenv("HOSTINGER_FTP_HOST", "")
HOSTINGER_FTP_USER = os.getenv("HOSTINGER_FTP_USER", "")
HOSTINGER_FTP_PASSWORD = os.getenv("HOSTINGER_FTP_PASSWORD", "")
# FTP chroots to the home dir; the live docroot is domains/kruxqlyz.com/public_html/,
# NOT the legacy ./public_html. Set this to the same value as the working GH secret.
HOSTINGER_DATA_DIR = os.getenv(
    "HOSTINGER_DATA_DIR", "domains/kruxqlyz.com/public_html/data/"
)

# API-Football: free plan allows 100 requests/day. We stop at a soft cap so a
# restart that wipes the ledger can never push the real total past 100.
API_FOOTBALL_DAILY_SOFT_CAP = 80
WORLD_CUP_LEAGUE_ID = 1
SEASON = 2026
