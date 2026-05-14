#!/usr/bin/env python3
"""REO Match Bridge cloud controller.

Runs a small authenticated HTTP service around the WhoScored extractor. The
service keeps one polling worker, persists the selected match URL, backs off on
errors, and stops automatically when the match reaches a final status.
"""

from __future__ import annotations

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
from urllib.parse import parse_qs, urlparse

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
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "REO_ALLOWED_ORIGINS",
        "https://barcelona-elections-2026.vercel.app,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

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
                self.status["hasData"] = False
                self.status["match"] = None
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
        status_value = str((payload.get("match") or {}).get("status") or "").strip().lower()
        return bool(status_value and status_value in FINAL_STATUS_VALUES)

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

                if self._should_stop_for_final(data):
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
            self._send_json(200, STATE.snapshot())
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
