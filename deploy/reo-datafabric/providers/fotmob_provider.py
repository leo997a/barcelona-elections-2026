"""
REO Data Fabric — FotMob Provider

Fetches player, team, and match data from FotMob's public API endpoints.
Uses simple requests.Session with rate limiting and local file cache.

Endpoints (from pseudo-r/Public-FotMob-API):
  - /api/search/suggest?term=...
  - /api/playerData?id=...
  - /api/teams?id=...
  - /api/matches?date=YYYYMMDD
  - /api/matchDetails?matchId=...

Does NOT use:
  - FlareSolverr
  - SeleniumBase / Selenium
  - ScraperAPI
  - buildId / _next/data (unless explicitly needed later)

Safety:
  - Max 2 retries per request
  - 3-second delay between requests
  - 30-second timeout
  - Local JSON cache with TTL
  - Graceful 403/429 handling (SOURCE_BLOCKED_OR_RATE_LIMITED)
"""

import json
import hashlib
import time
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

import requests

# ─── Configuration ────────────────────────────────────────────────────────────

BASE_URL = "https://www.fotmob.com/api"
CACHE_TTL_HOURS = 6
MAX_RETRIES = 2
REQUEST_TIMEOUT = 30
DELAY_BETWEEN_REQUESTS = 3.0

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.fotmob.com/",
    "Origin": "https://www.fotmob.com",
}

logger = logging.getLogger("reo.fotmob")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s %(message)s", "%H:%M:%S"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# ─── Cache ────────────────────────────────────────────────────────────────────

_DEFAULT_CACHE_DIR = Path(__file__).parent.parent / "cache" / "fotmob"


def _cache_key(endpoint: str, params: dict) -> str:
    raw = f"{endpoint}:{json.dumps(params, sort_keys=True)}"
    return hashlib.md5(raw.encode()).hexdigest()


def _cache_path(cache_dir: Path, key: str) -> Path:
    return cache_dir / f"{key}.json"


def _read_cache(cache_dir: Path, key: str, ttl_hours: float = CACHE_TTL_HOURS) -> Optional[dict]:
    path = _cache_path(cache_dir, key)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        cached_at = data.get("_cached_at")
        if cached_at:
            age = datetime.now(timezone.utc) - datetime.fromisoformat(cached_at)
            if age > timedelta(hours=ttl_hours):
                return None  # Expired
        return data.get("payload")
    except Exception:
        return None


def _write_cache(cache_dir: Path, key: str, payload: Any) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    path = _cache_path(cache_dir, key)
    data = {
        "_cached_at": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ─── Source Health ────────────────────────────────────────────────────────────

_source_health = {
    "last_success": None,
    "last_failure": None,
    "consecutive_failures": 0,
    "blocked": False,
}


def get_source_health() -> dict:
    return dict(_source_health)


def _record_success():
    _source_health["last_success"] = datetime.now(timezone.utc).isoformat()
    _source_health["consecutive_failures"] = 0
    _source_health["blocked"] = False


def _record_failure(reason: str):
    _source_health["last_failure"] = datetime.now(timezone.utc).isoformat()
    _source_health["consecutive_failures"] += 1
    if _source_health["consecutive_failures"] >= 3:
        _source_health["blocked"] = True
    logger.warning("[FAIL] %s (consecutive: %d)", reason, _source_health["consecutive_failures"])


# ─── HTTP Client ──────────────────────────────────────────────────────────────

_last_request_time = 0.0


class FotMobProvider:
    """FotMob public API provider with caching and rate limiting."""

    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or _DEFAULT_CACHE_DIR
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def _rate_limit(self):
        global _last_request_time
        elapsed = time.time() - _last_request_time
        if elapsed < DELAY_BETWEEN_REQUESTS:
            time.sleep(DELAY_BETWEEN_REQUESTS - elapsed)
        _last_request_time = time.time()

    def _get(self, endpoint: str, params: dict, use_cache: bool = True) -> Optional[dict]:
        """
        GET request with cache, retry, and rate limiting.
        Returns parsed JSON or None on failure.
        """
        if _source_health["blocked"]:
            logger.warning("[BLOCKED] Source is marked blocked. Skipping request.")
            return None

        cache_key = _cache_key(endpoint, params)

        # Check cache first
        if use_cache:
            cached = _read_cache(self.cache_dir, cache_key)
            if cached is not None:
                logger.info("[CACHE] %s %s", endpoint, params)
                return cached

        url = f"{BASE_URL}/{endpoint}"

        for attempt in range(1, MAX_RETRIES + 1):
            self._rate_limit()
            try:
                logger.info("[GET] %s %s (attempt %d)", endpoint, params, attempt)
                resp = self.session.get(url, params=params, timeout=REQUEST_TIMEOUT)

                if resp.status_code == 200:
                    try:
                        data = resp.json()
                    except ValueError:
                        logger.warning("[PARSE_ERROR] Non-JSON response for %s", endpoint)
                        _record_failure(f"Non-JSON response for {endpoint}")
                        return None
                    _write_cache(self.cache_dir, cache_key, data)
                    _record_success()
                    return data

                if resp.status_code in (403, 404, 429):
                    _record_failure(f"HTTP {resp.status_code} on {endpoint}")
                    logger.error("[%d] SOURCE_BLOCKED_OR_RATE_LIMITED: %s", resp.status_code, endpoint)
                    return None

                logger.warning("[%d] Unexpected status for %s", resp.status_code, endpoint)

            except requests.exceptions.Timeout:
                logger.warning("[TIMEOUT] %s attempt %d", endpoint, attempt)
            except requests.exceptions.ConnectionError as e:
                logger.warning("[CONN_ERROR] %s: %s", endpoint, str(e)[:100])
            except Exception as e:
                logger.error("[ERROR] %s: %s", endpoint, str(e)[:150])

            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)

        _record_failure(f"All retries failed for {endpoint}")
        return None

    # ─── Public API Methods ───────────────────────────────────────────────────

    def search_player(self, term: str) -> Optional[dict]:
        """Search for players/teams/matches by name."""
        return self._get("search/suggest", {"term": term})

    def get_player_data(self, player_id: int) -> Optional[dict]:
        """Get full player profile and stats."""
        return self._get("playerData", {"id": str(player_id)})

    def get_team(self, team_id: int) -> Optional[dict]:
        """Get team info, squad, and recent results."""
        return self._get("teams", {"id": str(team_id)})

    def get_matches(self, date: str) -> Optional[dict]:
        """Get matches for a specific date (format: YYYYMMDD)."""
        return self._get("matches", {"date": date})

    def get_match_details(self, match_id: int) -> Optional[dict]:
        """Get detailed match info including lineups and events."""
        return self._get("matchDetails", {"matchId": str(match_id)})

    # ─── Player Report Builder ────────────────────────────────────────────────

    def build_player_report(self, player_id: int, output_dir: Optional[Path] = None) -> Optional[dict]:
        """
        Build a structured player report from FotMob data.
        Saves to reports/player_fotmob/{slug}.json.
        """
        data = self.get_player_data(player_id)
        if not data:
            return None

        # Extract key fields safely
        name = data.get("name", "Unknown")
        slug = name.lower().replace(" ", "_").replace("'", "")

        report = {
            "source": "fotmob",
            "player_id": player_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "identity": {
                "name": name,
                "id": player_id,
                "birth_date": data.get("birthDate", {}).get("utcTime"),
                "nationality": None,
                "height": None,
                "preferred_foot": None,
            },
            "current_club": {
                "name": data.get("primaryTeam", {}).get("teamName"),
                "id": data.get("primaryTeam", {}).get("teamId"),
            },
            "position": {
                "main": data.get("positionDescription", {}).get("primaryPosition"),
                "label": data.get("positionDescription", {}).get("label"),
            },
            "bio": None,
            "recent_matches": [],
            "season_stats": {},
            "ratings": {},
            "raw_payload_keys": list(data.keys()) if isinstance(data, dict) else [],
        }

        # Extract nationality
        if "playerInformation" in data:
            for info in data.get("playerInformation", []):
                if info.get("title") == "Country":
                    report["identity"]["nationality"] = info.get("value", {}).get("fallback")
                elif info.get("title") == "Height":
                    report["identity"]["height"] = info.get("value", {}).get("fallback")
                elif info.get("title") == "Preferred foot":
                    report["identity"]["preferred_foot"] = info.get("value", {}).get("fallback")

        # Extract recent matches
        recent = data.get("recentMatches")
        if isinstance(recent, list):
            for match in recent[:10]:
                report["recent_matches"].append({
                    "match_id": match.get("matchId"),
                    "opponent": match.get("opponentTeamName"),
                    "date": match.get("matchDate", {}).get("utcTime") if isinstance(match.get("matchDate"), dict) else match.get("matchDate"),
                    "rating": match.get("rating"),
                    "goals": match.get("goals"),
                    "assists": match.get("assists"),
                    "minutes_played": match.get("minutesPlayed"),
                })

        # Extract season stats (mainLeague)
        main_league = data.get("mainLeague")
        if isinstance(main_league, dict):
            stats = main_league.get("stats")
            if isinstance(stats, list):
                for stat_block in stats:
                    title = stat_block.get("title", "")
                    items = stat_block.get("stats", [])
                    for item in items:
                        key = item.get("key", item.get("title", ""))
                        val = item.get("stat", {}).get("value") if isinstance(item.get("stat"), dict) else item.get("stat")
                        if key and val is not None:
                            report["season_stats"][key] = val

        # Save report
        out_dir = output_dir or (Path(__file__).parent.parent / "reports" / "player_fotmob")
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{slug}.json"
        out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[OK] Player report saved: %s", out_path.name)

        return report
