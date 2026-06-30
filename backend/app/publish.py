"""Snapshot the read API to static JSON and FTP-push it to the Hostinger CDN.

Server-side twin of scripts/build_static.py: instead of HTTP-fetching a running
API, it calls the read-route handlers directly (they return plain dicts via
db._dict_factory) and uploads the JSON tree to Hostinger over FTP. Driven by
GET /api/internal/refresh?...&publish=1 on a reliable external cron, so the CDN
stays fresh without depending on GitHub Actions' throttled scheduler.

The filename map + json.dumps flags below MUST stay byte-for-byte in sync with
scripts/build_static.py and frontend/src/lib/api.js::staticPath — all three
hardcode the same contract, and the incremental upload relies on identical bytes
hashing identically so unchanged files are skipped.
"""
import ftplib
import hashlib
import io
import json
import threading

import httpx
from fastapi import HTTPException

from . import db
from .config import (
    HOSTINGER_DATA_DIR,
    HOSTINGER_FTP_HOST,
    HOSTINGER_FTP_PASSWORD,
    HOSTINGER_FTP_USER,
    PUBLISH_CDN_URL,
)
from .routes import bracket, briefing, matches, methodology, players, sim, standings

# meta-table key holding {relpath: sha1} from the last successful publish. Not in
# the archive set, so a redeploy drops it and the next publish re-uploads once.
_HASH_KEY = "publish:hashes"

# one publish at a time — the external pinger fires every few minutes and a slow
# full upload must not overlap itself.
_lock = threading.Lock()


def _dumps(payload) -> bytes:
    # identical flags to build_static.py so unchanged data produces identical bytes
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def snapshot(published_at: str) -> dict[str, bytes]:
    """Build the static tree as {relative_path: json_bytes}, in memory.

    Only the HOT files: the six index endpoints + per-match detail (~110 files).
    Per-PLAYER detail (~1250 files) is deliberately NOT published — that many tiny
    files made every full FTP push a fragile 30-min marathon. The frontend already
    falls back to the live Render API on a CDN 404 (frontend/src/lib/api.js), so
    player-detail pages ride that fallback (Render is kept warm by the pinger).
    No disk writes — the bytes go straight to FTP.
    """
    match_list = matches.list_matches()
    player_list = players.list_players()

    files: dict[str, bytes] = {
        "matches.json": _dumps(match_list),
        "players.json": _dumps(player_list),
        "standings.json": _dumps(standings.standings()),
        "briefing-today.json": _dumps(briefing.today()),
        "sim-championship.json": _dumps(sim.championship()),
        "methodology-params.json": _dumps(methodology.params()),
        "bracket.json": _dumps(bracket.bracket()),
    }
    for m in match_list:
        files[f"matches/{m['id']}.json"] = _dumps(_detail(matches.match_detail, m["id"]))

    # CORS + a short cache window for the data dir (replaces the workflow's
    # .htaccess step): max-age=60 + must-revalidate so a publish reaches browsers
    # within a minute, while the existing ETag/Last-Modified make revalidation a
    # cheap 304. Without this, Hostinger sends no Cache-Control and browsers
    # heuristic-cache the JSON, showing stale data long after a publish.
    files[".htaccess"] = (
        b'Header set Access-Control-Allow-Origin "*"\n'
        b'<FilesMatch "\\.json$">\n'
        b'Header set Cache-Control "public, max-age=60, must-revalidate"\n'
        b"</FilesMatch>\n"
    )
    files["status.json"] = _dumps(
        {"published_at": published_at,
         "matches": len(match_list), "players": len(player_list)}
    )
    return files


def _detail(fn, item_id):
    """Call a detail handler, tolerating the (shouldn't-happen) missing-id 404 so
    one bad row can't sink the whole snapshot."""
    try:
        return fn(item_id)
    except HTTPException:
        return None


def _connect():
    """Explicit-TLS FTPS, falling back to plain FTP if the host won't negotiate."""
    try:
        ftp = ftplib.FTP_TLS(timeout=30)
        ftp.connect(HOSTINGER_FTP_HOST, 21)
        ftp.login(HOSTINGER_FTP_USER, HOSTINGER_FTP_PASSWORD)
        ftp.prot_p()
        return ftp
    except ftplib.all_errors:
        ftp = ftplib.FTP(timeout=30)
        ftp.connect(HOSTINGER_FTP_HOST, 21)
        ftp.login(HOSTINGER_FTP_USER, HOSTINGER_FTP_PASSWORD)
        return ftp


def _upload_order(rel: str):
    # detail files (matches/<id>.json, players/<id>.json) before the index files
    # that reference them, so a partial push never leaves matches.json pointing at
    # a detail blob that isn't up yet. status.json dead last — its timestamp only
    # advances on a complete run.
    if rel == "status.json":
        return (2, rel)
    return (0, rel) if "/" in rel else (1, rel)


def ftp_upload(files: dict[str, bytes]) -> dict:
    if not (HOSTINGER_FTP_HOST and HOSTINGER_FTP_USER and HOSTINGER_FTP_PASSWORD):
        return {"skipped": "no FTP creds"}

    new_hashes = {rel: hashlib.sha1(data).hexdigest() for rel, data in files.items()}
    prior = _load_hashes()
    merged = dict(prior)  # advance a file's hash only once it actually uploads

    ftp = _connect()
    mode = "ftps" if isinstance(ftp, ftplib.FTP_TLS) else "ftp"
    uploaded, skipped, failed = 0, 0, []
    try:
        ftp.cwd(HOSTINGER_DATA_DIR.rstrip("/") or "/")
        try:
            ftp.mkd("matches")
        except ftplib.error_perm:
            pass  # already exists

        for rel in sorted(files, key=_upload_order):
            if rel == "status.json" and failed:
                break  # don't advance the freshness beacon on a partial run
            if rel != "status.json" and prior.get(rel) == new_hashes[rel]:
                skipped += 1
                continue  # unchanged bytes
            try:
                ftp.storbinary(f"STOR {rel}", io.BytesIO(files[rel]))
                uploaded += 1
                if rel != "status.json":  # status.json's bytes change every run
                    merged[rel] = new_hashes[rel]  # advance hash only on success
            except ftplib.all_errors as e:
                failed.append({"file": rel, "error": str(e)})  # keep old hash -> retry

        # stash the manifest on the CDN so a redeploy (which wipes meta) reseeds
        # from it via _load_hashes and skips a full re-upload of unchanged files.
        try:
            ftp.storbinary("STOR hashes.json", io.BytesIO(json.dumps(merged).encode()))
        except ftplib.all_errors:
            pass
    finally:
        try:
            ftp.quit()
        except ftplib.all_errors:
            ftp.close()

    _save_hashes(merged)

    report = {"mode": mode, "uploaded": uploaded, "skipped_unchanged": skipped}
    if failed:
        report["failed"] = failed
    return report


def _load_hashes() -> dict:
    conn = db.connect()
    try:
        row = conn.execute("SELECT value FROM meta WHERE key=?", (_HASH_KEY,)).fetchone()
    finally:
        conn.close()
    if row:
        return json.loads(row["value"])
    # cold start (a redeploy wiped meta): reseed from the manifest the last publish
    # stashed on the CDN, so we re-upload only real changes, not all ~1356 files.
    try:
        r = httpx.get(f"{PUBLISH_CDN_URL.rstrip('/')}/hashes.json", timeout=15)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return {}


def _save_hashes(hashes: dict) -> None:
    conn = db.connect()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
            (_HASH_KEY, json.dumps(hashes)),
        )
        conn.commit()
    finally:
        conn.close()


def run(published_at: str) -> dict:
    """Snapshot + upload. Non-blocking guard so overlapping pings don't stack."""
    if not _lock.acquire(blocking=False):
        return {"skipped": "publish already in progress"}
    try:
        return ftp_upload(snapshot(published_at))
    finally:
        _lock.release()
