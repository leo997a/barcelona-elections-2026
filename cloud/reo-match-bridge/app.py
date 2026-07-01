#!/usr/bin/env python3
"""REO Match Bridge cloud controller.

Runs a small authenticated HTTP service around the WhoScored extractor. The
service keeps one polling worker, persists the selected match URL, backs off on
errors, and stops automatically when the match reaches a final status.
"""

from __future__ import annotations

import base64
import hashlib
import html as html_lib
import json
import os
import re
import secrets
import signal
import subprocess
import sys
import threading
import time
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
import urllib.error
import urllib.request
from urllib.parse import parse_qs, quote, urlparse

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("REO_BRIDGE_DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_FILE = DATA_DIR / "current-match.json"
LATEST_FILE = DATA_DIR / "latest-match.json"

sys.path.insert(0, str(BASE_DIR / "extractor"))
from extract_match import extract_once  # noqa: E402

HOST = os.environ.get("REO_BRIDGE_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", os.environ.get("REO_BRIDGE_PORT", "3005")))
TOKEN = os.environ.get("REO_BRIDGE_TOKEN", "")
DEFAULT_INTERVAL = int(os.environ.get("REO_EXTRACT_INTERVAL", "60"))
MIN_INTERVAL = int(os.environ.get("REO_MIN_INTERVAL", "30"))
MAX_RUNTIME_SECONDS = int(os.environ.get("REO_MAX_RUNTIME_SECONDS", str(4 * 60 * 60)))
DEFAULT_MATCH_URL = os.environ.get("REO_DEFAULT_MATCH_URL", "")
STOP_ON_FINAL = os.environ.get("REO_STOP_ON_FINAL", "1") != "0"
ARCHIVE_GITHUB_TOKEN = os.environ.get("REO_ARCHIVE_GITHUB_TOKEN", "")
ARCHIVE_GITHUB_REPO = os.environ.get("REO_ARCHIVE_GITHUB_REPO", "")
ARCHIVE_GITHUB_BRANCH = os.environ.get("REO_ARCHIVE_GITHUB_BRANCH", "main")
ARCHIVE_BASE_PATH = os.environ.get("REO_ARCHIVE_BASE_PATH", "match-archive")
ARCHIVE_ON_SUCCESS = os.environ.get("REO_ARCHIVE_ON_SUCCESS", "1") != "0"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "REO_ALLOWED_ORIGINS",
        "https://peachpuff-herring-712997.hostingersite.com,https://barcelona-elections-2026.vercel.app,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
WORLD_CUP_URL = os.environ.get(
    "REO_WORLD_CUP_URL",
    "https://www.fotmob.com/leagues/77/overview/world-cup",
)
WORLD_CUP_CACHE_SECONDS = max(10, int(os.environ.get("REO_WORLD_CUP_CACHE_SECONDS", "15")))
WORLD_CUP_CACHE_LOCK = threading.RLock()
WORLD_CUP_CACHE: dict[str, Any] = {}
MATCH_DETAILS_CACHE_SECONDS = max(10, int(os.environ.get("REO_MATCH_DETAILS_CACHE_SECONDS", "12")))
MATCH_DETAILS_CACHE_LOCK = threading.RLock()
MATCH_DETAILS_CACHE: dict[str, Any] = {}

FINAL_STATUS_VALUES = {
    item.strip().lower()
    for item in os.environ.get(
        "REO_FINAL_STATUS_VALUES",
        "6,ft,fulltime,full time,final,finished,postmatch,post-match",
    ).split(",")
    if item.strip()
}

URL_RE = re.compile(r"^https://(?:www\.|sport360\.)?whoscored\.com/matches/\d+/(?:live|livestatistics)/", re.I)

METRICS_CATALOG = {
    "provider": "WhoScored matchCentreData",
    "teamMetrics": [
        "possession",
        "dominance",
        "passes",
        "passesAccurate",
        "passAccuracy",
        "finalThirdEntries",
        "ballRecoveries",
        "shots",
        "shotsOnTarget",
        "shotsOffTarget",
        "blockedShots",
        "shotAccuracy",
        "keyPasses",
        "boxTouches",
        "corners",
        "crosses",
        "longBalls",
        "throughBalls",
        "dribbles",
        "dribbleSuccessRate",
        "tackles",
        "interceptions",
        "clearances",
        "blocks",
        "aerialWon",
        "aerialWinRate",
        "saves",
        "saveRate",
        "fouls",
        "offsides",
        "cards",
        "turnovers",
    ],
    "playerMetrics": [
        "passes",
        "passAccuracy",
        "passesAccurate",
        "keyPasses",
        "assists",
        "shots",
        "shotsOnTarget",
        "shotAccuracy",
        "goals",
        "dribbles",
        "dribbleSuccessRate",
        "crosses",
        "longBalls",
        "throughBalls",
        "finalThirdPasses",
        "boxTouches",
        "tackles",
        "interceptions",
        "clearances",
        "ballRecoveries",
        "saves",
    ],
}


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def fetch_world_cup_page_props() -> dict[str, Any]:
    now = time.time()
    with WORLD_CUP_CACHE_LOCK:
        cached_at = float(WORLD_CUP_CACHE.get("cachedAt") or 0)
        cached_payload = WORLD_CUP_CACHE.get("payload")
        if cached_payload and now - cached_at < WORLD_CUP_CACHE_SECONDS:
            return cached_payload

    request = urllib.request.Request(
        WORLD_CUP_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; REO-SHOW-Bridge/1.0; +https://www.fotmob.com)",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        page_html = response.read().decode("utf-8", errors="replace")

    next_data_match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">([\s\S]*?)</script>',
        page_html,
    )
    if not next_data_match:
        raise RuntimeError("FotMob page did not contain __NEXT_DATA__")

    next_data = json.loads(html_lib.unescape(next_data_match.group(1)))
    page_props = ((next_data.get("props") or {}).get("pageProps") or {})
    if not isinstance(page_props, dict) or not page_props:
        raise RuntimeError("FotMob __NEXT_DATA__ did not contain pageProps")

    payload = {
        "provider": "fotmob",
        "sourceMode": "reo-match-bridge",
        "sourceUrl": WORLD_CUP_URL,
        "fetchedAt": now_iso(),
        "pageProps": page_props,
    }
    with WORLD_CUP_CACHE_LOCK:
        WORLD_CUP_CACHE["cachedAt"] = now
        WORLD_CUP_CACHE["payload"] = payload
    return payload


def fetch_fotmob_match_details(match_id: str) -> dict[str, Any]:
    if not re.match(r"^\d{4,}$", match_id or ""):
        raise ValueError("matchId is required and must be a FotMob numeric match id")
    now = time.time()
    with MATCH_DETAILS_CACHE_LOCK:
        cached = MATCH_DETAILS_CACHE.get(match_id)
        if cached and now - float(cached.get("cachedAt") or 0) < MATCH_DETAILS_CACHE_SECONDS:
            return cached["payload"]

    source_url = f"https://www.fotmob.com/api/data/matchDetails?matchId={quote(match_id)}"
    request = urllib.request.Request(
        source_url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; REO-SHOW-Bridge/1.0; +https://www.fotmob.com)",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "application/json",
            "Referer": "https://www.fotmob.com/",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8", errors="replace"))
    if not isinstance(payload, dict) or not payload.get("general"):
        raise RuntimeError("FotMob match details response is missing general data")
    payload["_reoBridge"] = {
        "provider": "fotmob",
        "sourceMode": "reo-match-bridge",
        "sourceUrl": source_url,
        "fetchedAt": now_iso(),
    }
    with MATCH_DETAILS_CACHE_LOCK:
        MATCH_DETAILS_CACHE[match_id] = {
            "cachedAt": now,
            "payload": payload,
        }
    return payload


def read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def write_json(path: Path, payload: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def validate_match_url(url: str) -> str:
    cleaned = (url or "").strip().strip('"').strip("'")
    if not URL_RE.match(cleaned):
        raise ValueError("Use a WhoScored /live/ or /livestatistics/ match URL")
    return cleaned


def slugify(value: Any, fallback: str = "unknown") -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9\u0600-\u06ff]+", "-", text, flags=re.I).strip("-")
    return text or fallback


def derive_archive_path(payload: dict[str, Any], url: str) -> str:
    match = payload.get("match") or {}
    meta = payload.get("meta") or {}
    url_path = urlparse(url).path
    url_match = re.search(r"/matches/(\d+)/", url_path)
    match_id = str(meta.get("matchId") or match.get("matchId") or (url_match.group(1) if url_match else "match"))
    slug_tail = url_path.rstrip("/").split("/")[-1] if url_path else ""
    season_match = re.search(r"(20\d{2})-(20\d{2})", slug_tail)
    season = "-".join(season_match.groups()) if season_match else slugify(match.get("season"), "season-unknown")
    competition_from_url = slug_tail.split(season_match.group(0))[0].strip("-") if season_match else ""
    competition = slugify(match.get("competition") or competition_from_url, "competition-unknown")
    round_name = slugify(match.get("round") or meta.get("round") or "round-unknown", "round-unknown")
    home = slugify(match.get("homeTeam"), "home")
    away = slugify(match.get("awayTeam"), "away")
    date_value = str(match.get("date") or meta.get("bridgeUpdatedAt") or now_iso())
    date_match = re.search(r"\d{4}-\d{2}-\d{2}", date_value)
    date_part = date_match.group(0) if date_match else now_iso()[:10]
    return f"{ARCHIVE_BASE_PATH.strip('/')}/{season}/{competition}/{round_name}/{date_part}_{match_id}_{home}-vs-{away}.json"


def archive_match_to_github(payload: dict[str, Any], url: str) -> dict[str, Any]:
    archive_path = derive_archive_path(payload, url)
    if not ARCHIVE_GITHUB_TOKEN or not ARCHIVE_GITHUB_REPO:
        queued_path = queue_archive_payload(payload, archive_path, "missing REO_ARCHIVE_GITHUB_TOKEN or REO_ARCHIVE_GITHUB_REPO")
        return {
            "enabled": False,
            "ok": False,
            "path": archive_path,
            "queuedPath": queued_path,
            "reason": "missing REO_ARCHIVE_GITHUB_TOKEN or REO_ARCHIVE_GITHUB_REPO",
        }
    encoded_path = quote(archive_path, safe="/")
    contents_url = f"https://api.github.com/repos/{ARCHIVE_GITHUB_REPO}/contents/{encoded_path}"
    headers = {
        "Authorization": f"Bearer {ARCHIVE_GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "reo-match-bridge",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = {
        "message": f"archive match {archive_path}",
        "content": base64.b64encode(json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")).decode("ascii"),
        "branch": ARCHIVE_GITHUB_BRANCH,
    }
    try:
        lookup = urllib.request.Request(f"{contents_url}?ref={quote(ARCHIVE_GITHUB_BRANCH)}", headers=headers)
        with urllib.request.urlopen(lookup, timeout=20) as response:
            existing = json.loads(response.read().decode("utf-8"))
        if existing.get("sha"):
            body["sha"] = existing["sha"]
    except urllib.error.HTTPError as error:
        if error.code != 404:
            details = error.read().decode("utf-8", errors="replace")
            error_text = f"GitHub lookup {error.code}: {details[:500]}"
            return {
                "enabled": True,
                "ok": False,
                "path": archive_path,
                "queuedPath": queue_archive_payload(payload, archive_path, error_text),
                "error": error_text,
            }
    except Exception as error:
        error_text = f"GitHub lookup failed: {error}"
        return {
            "enabled": True,
            "ok": False,
            "path": archive_path,
            "queuedPath": queue_archive_payload(payload, archive_path, error_text),
            "error": error_text,
        }

    request = urllib.request.Request(
        contents_url,
        data=json.dumps(body).encode("utf-8"),
        method="PUT",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
        return {
            "enabled": True,
            "ok": True,
            "path": archive_path,
            "url": (result.get("content") or {}).get("html_url"),
            "committedAt": now_iso(),
        }
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        error_text = f"GitHub {error.code}: {details[:500]}"
        return {
            "enabled": True,
            "ok": False,
            "path": archive_path,
            "queuedPath": queue_archive_payload(payload, archive_path, error_text),
            "error": error_text,
        }
    except Exception as error:
        error_text = str(error)
        return {
            "enabled": True,
            "ok": False,
            "path": archive_path,
            "queuedPath": queue_archive_payload(payload, archive_path, error_text),
            "error": error_text,
        }


def queue_archive_payload(payload: dict[str, Any], archive_path: str, reason: str) -> str:
    queued_file = DATA_DIR / "archive-queue" / archive_path
    queued_file.parent.mkdir(parents=True, exist_ok=True)
    queued_file.write_text(
        json.dumps(
            {
                "archivePath": archive_path,
                "queuedAt": now_iso(),
                "lastError": reason,
                "payload": payload,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return str(queued_file)


def archive_fingerprint(payload: dict[str, Any]) -> str:
    """Build a stable hash for real match data while ignoring bridge timestamps."""
    try:
        stable = json.loads(json.dumps(payload, ensure_ascii=False))
        meta = stable.get("meta")
        if isinstance(meta, dict):
            for key in ("bridgeUpdatedAt", "extractedAt", "snapshotFile"):
                meta.pop(key, None)
        encoded = json.dumps(stable, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    except Exception:
        encoded = repr(payload)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def cleanup_browser_processes() -> None:
    if os.name == "nt":
        return
    try:
        subprocess.run(
            ["pkill", "-u", str(os.getuid()), "-f", "chrome|chromedriver"],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as error:
        print(f"[WARN] Browser cleanup skipped: {error}")


def load_initial_url() -> str:
    stored = read_json(CONFIG_FILE, {})
    url = str(stored.get("url") or DEFAULT_MATCH_URL or "").strip()
    return url


class BridgeState:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.stop_event = threading.Event()
        self.worker: threading.Thread | None = None
        self.data: dict[str, Any] | None = read_json(LATEST_FILE, None)
        self.last_archive_fingerprint = ""
        self.status: dict[str, Any] = {
            "ok": True,
            "service": "reo-match-bridge",
            "hasData": self.data is not None,
            "currentUrl": load_initial_url(),
            "pollingActive": False,
            "intervalSec": max(MIN_INTERVAL, DEFAULT_INTERVAL),
            "isFetching": False,
            "lastUpdatedAt": None,
            "nextPollAt": None,
            "lastError": None,
            "errorCount": 0,
            "startedAt": None,
            "stoppedAt": None,
            "stoppedReason": None,
            "match": (self.data or {}).get("match") if isinstance(self.data, dict) else None,
            "provider": METRICS_CATALOG["provider"],
            "archive": None,
            "archiveOnSuccess": ARCHIVE_ON_SUCCESS,
        }

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            payload = dict(self.status)
            payload["workerAlive"] = bool(self.worker and self.worker.is_alive())
            payload["serverTime"] = now_iso()
            return payload

    def set_url(self, url: str) -> dict[str, Any]:
        cleaned = validate_match_url(url)
        with self.lock:
            if cleaned != self.status.get("currentUrl"):
                self.data = None
                self.last_archive_fingerprint = ""
                self.status["hasData"] = False
                self.status["match"] = None
                self.status["archive"] = None
            self.status["currentUrl"] = cleaned
            self.status["lastError"] = None
            self.status["stoppedReason"] = "match_changed"
            write_json(CONFIG_FILE, {"url": cleaned, "updatedAt": now_iso()})
        return self.snapshot()

    def start(self, url: str | None = None, interval: int | None = None) -> dict[str, Any]:
        if url:
            self.set_url(url)
        with self.lock:
            if interval:
                self.status["intervalSec"] = max(MIN_INTERVAL, int(interval))
            current_url = self.status.get("currentUrl")
            if not current_url:
                raise ValueError("No match URL configured")
            validate_match_url(str(current_url))
            if self.worker and self.worker.is_alive():
                self.status["pollingActive"] = True
                self.stop_event.clear()
                return self.snapshot()
            self.stop_event.clear()
            self.status.update({
                "pollingActive": True,
                "startedAt": now_iso(),
                "stoppedAt": None,
                "stoppedReason": None,
                "lastError": None,
            })
            self.worker = threading.Thread(target=self._run_loop, name="reo-match-poller", daemon=True)
            self.worker.start()
            return self.snapshot()

    def stop(self, reason: str = "manual_stop") -> dict[str, Any]:
        self.stop_event.set()
        if reason in {"manual_stop", "service_signal"}:
            cleanup_browser_processes()
        with self.lock:
            self.status.update({
                "pollingActive": False,
                "isFetching": False,
                "nextPollAt": None,
                "stoppedAt": now_iso(),
                "stoppedReason": reason,
            })
        return self.snapshot()

    def _should_stop_for_final(self, payload: dict[str, Any]) -> bool:
        if not STOP_ON_FINAL:
            return False
        match = payload.get("match") or {}
        if bool(match.get("isFinal")):
            return True
        status_value = str(match.get("status") or "").strip().lower()
        return bool(status_value and status_value in FINAL_STATUS_VALUES)

    def _archive_snapshot(
        self,
        payload: dict[str, Any],
        url: str,
        reason: str,
        force: bool = False,
    ) -> dict[str, Any]:
        if not payload:
            result = {"enabled": bool(ARCHIVE_GITHUB_TOKEN and ARCHIVE_GITHUB_REPO), "ok": False, "reason": "no match data yet"}
            with self.lock:
                self.status["archive"] = result
            return result

        fingerprint = archive_fingerprint(payload)
        with self.lock:
            previous_fingerprint = self.last_archive_fingerprint

        if not force and previous_fingerprint == fingerprint:
            path = derive_archive_path(payload, url) if ARCHIVE_GITHUB_TOKEN and ARCHIVE_GITHUB_REPO else None
            result = {
                "enabled": bool(ARCHIVE_GITHUB_TOKEN and ARCHIVE_GITHUB_REPO),
                "ok": True,
                "skipped": True,
                "reason": "unchanged",
                "path": path,
                "checkedAt": now_iso(),
            }
            with self.lock:
                self.status["archive"] = result
            return result

        result = archive_match_to_github(payload, url)
        result["reason"] = reason
        with self.lock:
            self.status["archive"] = result
            if result.get("ok"):
                self.last_archive_fingerprint = fingerprint
        return result

    def force_archive(self) -> dict[str, Any]:
        with self.lock:
            data = self.data if isinstance(self.data, dict) else read_json(LATEST_FILE, None)
            url = str(self.status.get("currentUrl") or (data or {}).get("meta", {}).get("sourceUrl") or "")
        if not data:
            self._archive_snapshot({}, url, "manual_force", force=True)
            return self.snapshot()
        self._archive_snapshot(data, url, "manual_force", force=True)
        return self.snapshot()

    def _run_loop(self) -> None:
        started = datetime.utcnow()
        while not self.stop_event.is_set():
            with self.lock:
                url = str(self.status.get("currentUrl") or "")
                interval = int(self.status.get("intervalSec") or DEFAULT_INTERVAL)
                self.status.update({
                    "isFetching": True,
                    "pollingActive": True,
                    "nextPollAt": (datetime.utcnow() + timedelta(seconds=interval)).replace(microsecond=0).isoformat() + "Z",
                })

            try:
                data = extract_once(url, save_timestamped=False)
                data.setdefault("meta", {})
                data["meta"].update({
                    "bridgeProvider": METRICS_CATALOG["provider"],
                    "bridgeUpdatedAt": now_iso(),
                })
                write_json(LATEST_FILE, data)
                with self.lock:
                    self.data = data
                    self.status.update({
                        "hasData": True,
                        "isFetching": False,
                        "lastUpdatedAt": now_iso(),
                        "lastError": None,
                        "errorCount": 0,
                        "match": data.get("match"),
                    })

                if ARCHIVE_ON_SUCCESS:
                    self._archive_snapshot(data, url, "poll_success")

                if self._should_stop_for_final(data):
                    if not ARCHIVE_ON_SUCCESS:
                        self._archive_snapshot(data, url, "match_final", force=True)
                    self.stop("match_final")
                    break
            except Exception as error:
                with self.lock:
                    errors = int(self.status.get("errorCount") or 0) + 1
                    self.status.update({
                        "isFetching": False,
                        "lastError": str(error),
                        "errorCount": errors,
                    })

            if (datetime.utcnow() - started).total_seconds() >= MAX_RUNTIME_SECONDS:
                self.stop("max_runtime_reached")
                break

            with self.lock:
                errors = int(self.status.get("errorCount") or 0)
                interval = int(self.status.get("intervalSec") or DEFAULT_INTERVAL)
            sleep_for = min(300, max(MIN_INTERVAL, interval + errors * 20))
            self.stop_event.wait(sleep_for)

        with self.lock:
            self.status["isFetching"] = False
            self.status["pollingActive"] = False
            if not self.status.get("stoppedAt"):
                self.status["stoppedAt"] = now_iso()
                self.status["stoppedReason"] = "loop_exit"


STATE = BridgeState()


class Handler(BaseHTTPRequestHandler):
    server_version = "REOMatchBridge/1.0"

    def _origin(self) -> str:
        return self.headers.get("Origin", "")

    def _cors_origin(self) -> str:
        origin = self._origin()
        if origin and origin in ALLOWED_ORIGINS:
            return origin
        return ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else "*"

    def _send_json(self, code: int, payload: Any) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", self._cors_origin())
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _require_auth(self) -> bool:
        if not TOKEN:
            self._send_json(503, {"error": "REO_BRIDGE_TOKEN is not configured"})
            return False
        auth = self.headers.get("Authorization", "")
        bearer = auth[len("Bearer "):].strip() if auth.startswith("Bearer ") else ""
        query = parse_qs(urlparse(self.path).query)
        query_token = (query.get("token") or [""])[0]
        if secrets.compare_digest(bearer, TOKEN) or secrets.compare_digest(query_token, TOKEN):
            return True
        self._send_json(401, {"error": "Unauthorized"})
        return False

    def _body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or "0")
        if not length:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw) if raw else {}

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send_json(204, {})

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path in {"/", "/health"}:
            self._send_json(200, {"ok": True, "service": "reo-match-bridge", "time": now_iso()})
            return
        if not self._require_auth():
            return
        if path == "/api/status":
            status = STATE.snapshot()
            status["worldCup"] = {
                "enabled": True,
                "provider": "fotmob",
                "cacheSeconds": WORLD_CUP_CACHE_SECONDS,
                "endpoint": "/api/world-cup",
                "matchDetailsEndpoint": "/api/match-details?matchId=<id>",
            }
            self._send_json(200, status)
            return
        if path == "/api/match":
            with STATE.lock:
                data = STATE.data
                status = STATE.snapshot()
            if data:
                self._send_json(200, data)
            else:
                self._send_json(404, {"error": "No match data yet", "status": status})
            return
        if path == "/api/metrics-catalog":
            self._send_json(200, METRICS_CATALOG)
            return
        if path == "/api/world-cup":
            try:
                self._send_json(200, fetch_world_cup_page_props())
            except Exception as error:
                self._send_json(502, {
                    "error": "Unable to load FotMob World Cup data",
                    "detail": str(error),
                })
            return
        if path == "/api/match-details":
            query = parse_qs(urlparse(self.path).query)
            try:
                self._send_json(200, fetch_fotmob_match_details((query.get("matchId") or [""])[0]))
            except Exception as error:
                self._send_json(502, {
                    "error": "Unable to load FotMob match details",
                    "detail": str(error),
                })
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if not self._require_auth():
            return
        path = urlparse(self.path).path
        try:
            body = self._body()
            if path == "/api/control/set-match":
                self._send_json(200, STATE.set_url(str(body.get("url") or "")))
                return
            if path == "/api/control/start":
                self._send_json(200, STATE.start(
                    url=str(body.get("url") or "").strip() or None,
                    interval=int(body["intervalSec"]) if body.get("intervalSec") else None,
                ))
                return
            if path == "/api/control/stop":
                self._send_json(200, STATE.stop("manual_stop"))
                return
            if path == "/api/control/archive":
                self._send_json(200, STATE.force_archive())
                return
            self._send_json(404, {"error": "Not found"})
        except Exception as error:
            self._send_json(400, {"error": str(error)})

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[{now_iso()}] {self.address_string()} {fmt % args}")


def handle_signal(signum: int, _frame: Any) -> None:
    print(f"[{now_iso()}] Signal {signum} received, stopping bridge")
    STATE.stop("service_signal")
    raise SystemExit(0)


def main() -> None:
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    if DEFAULT_MATCH_URL:
        try:
            STATE.set_url(DEFAULT_MATCH_URL)
        except Exception as error:
            print(f"[WARN] Default URL ignored: {error}")
    if os.environ.get("REO_AUTOSTART", "1") != "0" and STATE.snapshot().get("currentUrl"):
        try:
            STATE.start()
        except Exception as error:
            print(f"[WARN] Autostart failed: {error}")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"[{now_iso()}] REO Match Bridge listening on {HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
