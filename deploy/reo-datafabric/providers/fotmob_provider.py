"""
REO Data Fabric — FotMob Provider

Working endpoints (verified 2026-05-19):
  - apigw.fotmob.com/searchapi/suggest        (player/team search, returns JSON)
  - www.fotmob.com/                            (home page, contains buildId)
  - www.fotmob.com/_next/data/{buildId}/...    (Next.js SSR data, returns JSON)

Legacy /api/* endpoints return 404 (FotMob migrated to Next.js _next/data).

Does NOT use:
  - FlareSolverr / SeleniumBase / ScraperAPI / proxy
  - 24/7 polling

Safety:
  - 3-second delay between requests
  - 30-second timeout
  - 2 retries max
  - Local JSON cache (6h TTL)
  - Health tracking with auto-block after 3 consecutive failures
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import requests

# ─── Configuration ────────────────────────────────────────────────────────────

APIGW_BASE = "https://apigw.fotmob.com"
WWW_BASE = "https://www.fotmob.com"

CACHE_TTL_HOURS = 6
MAX_RETRIES = 2
REQUEST_TIMEOUT = 30
DELAY_BETWEEN_REQUESTS = 3.0

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

JSON_HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": WWW_BASE,
    "Referer": WWW_BASE + "/",
}

HTML_HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
    "Accept-Language": "en-US,en;q=0.9",
}

logger = logging.getLogger("reo.fotmob")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s %(message)s", "%H:%M:%S"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

_DEFAULT_CACHE_DIR = Path(__file__).parent.parent / "cache" / "fotmob"

# ─── Cache helpers ────────────────────────────────────────────────────────────


def _cache_key(label: str, params: dict) -> str:
    raw = f"{label}:{json.dumps(params, sort_keys=True)}"
    return hashlib.md5(raw.encode()).hexdigest()


def _read_cache(cache_dir: Path, key: str, ttl_hours: float = CACHE_TTL_HOURS) -> Optional[Any]:
    path = cache_dir / f"{key}.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        cached_at = data.get("_cached_at")
        if cached_at:
            age = datetime.now(timezone.utc) - datetime.fromisoformat(cached_at)
            if age > timedelta(hours=ttl_hours):
                return None
        return data.get("payload")
    except Exception:
        return None


def _write_cache(cache_dir: Path, key: str, payload: Any) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    path = cache_dir / f"{key}.json"
    data = {
        "_cached_at": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ─── Source health ────────────────────────────────────────────────────────────

_source_health = {
    "last_success": None,
    "last_failure": None,
    "consecutive_failures": 0,
    "blocked": False,
    "build_id": None,
    "build_id_fetched_at": None,
}


def get_source_health() -> dict:
    return dict(_source_health)


def _record_success() -> None:
    _source_health["last_success"] = datetime.now(timezone.utc).isoformat()
    _source_health["consecutive_failures"] = 0
    _source_health["blocked"] = False


def _record_failure(reason: str) -> None:
    _source_health["last_failure"] = datetime.now(timezone.utc).isoformat()
    _source_health["consecutive_failures"] += 1
    if _source_health["consecutive_failures"] >= 3:
        _source_health["blocked"] = True
    logger.warning("[FAIL] %s (consecutive: %d)", reason, _source_health["consecutive_failures"])


# ─── Provider ─────────────────────────────────────────────────────────────────

_last_request_time = 0.0


class FotMobProvider:
    """FotMob provider using apigw search + Next.js _next/data extraction."""

    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or _DEFAULT_CACHE_DIR
        self.session = requests.Session()
        self._build_id: Optional[str] = None

    # ─── Internal HTTP ─────────────────────────────────────────────────────────

    def _rate_limit(self) -> None:
        global _last_request_time
        elapsed = time.time() - _last_request_time
        if elapsed < DELAY_BETWEEN_REQUESTS:
            time.sleep(DELAY_BETWEEN_REQUESTS - elapsed)
        _last_request_time = time.time()

    def _http_json(self, url: str, params: Optional[dict] = None) -> Optional[Any]:
        if _source_health["blocked"]:
            logger.warning("[BLOCKED] Source is marked blocked. Skipping.")
            return None

        for attempt in range(1, MAX_RETRIES + 1):
            self._rate_limit()
            try:
                logger.info("[GET] %s (attempt %d)", url[:120], attempt)
                resp = self.session.get(url, params=params, headers=JSON_HEADERS, timeout=REQUEST_TIMEOUT)
                if resp.status_code == 200:
                    try:
                        data = resp.json()
                    except ValueError:
                        _record_failure(f"Non-JSON response from {url[:80]}")
                        return None
                    _record_success()
                    return data
                if resp.status_code in (403, 404, 429):
                    _record_failure(f"HTTP {resp.status_code}: {url[:80]}")
                    if resp.status_code in (403, 429):
                        logger.error("SOURCE_BLOCKED_OR_RATE_LIMITED")
                    return None
                logger.warning("[%d] Unexpected status: %s", resp.status_code, url[:80])
            except requests.exceptions.Timeout:
                logger.warning("[TIMEOUT] attempt %d for %s", attempt, url[:80])
            except requests.exceptions.ConnectionError as e:
                logger.warning("[CONN_ERROR] %s", str(e)[:100])
            except Exception as e:
                logger.error("[ERROR] %s", str(e)[:150])

            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)

        _record_failure(f"All retries failed: {url[:80]}")
        return None

    def _http_html(self, url: str) -> Optional[str]:
        if _source_health["blocked"]:
            return None
        for attempt in range(1, MAX_RETRIES + 1):
            self._rate_limit()
            try:
                logger.info("[GET HTML] %s (attempt %d)", url[:120], attempt)
                resp = self.session.get(url, headers=HTML_HEADERS, timeout=REQUEST_TIMEOUT)
                if resp.status_code == 200:
                    _record_success()
                    return resp.text
                if resp.status_code in (403, 404, 429):
                    _record_failure(f"HTTP {resp.status_code}: {url[:80]}")
                    return None
            except Exception as e:
                logger.warning("[ERROR] HTML fetch %s: %s", url[:60], str(e)[:100])
            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)
        return None

    # ─── buildId extraction ───────────────────────────────────────────────────

    def get_build_id(self, force_refresh: bool = False) -> Optional[str]:
        """Extract Next.js buildId from FotMob home page."""
        if self._build_id and not force_refresh:
            return self._build_id

        # Cached buildId is valid for 24h (FotMob ships often but not hourly).
        cache_key = _cache_key("buildId", {})
        if not force_refresh:
            cached = _read_cache(self.cache_dir, cache_key, ttl_hours=24)
            if isinstance(cached, str):
                self._build_id = cached
                _source_health["build_id"] = cached
                _source_health["build_id_fetched_at"] = datetime.now(timezone.utc).isoformat()
                logger.info("[CACHE] buildId: %s", cached)
                return cached

        html = self._http_html(WWW_BASE + "/")
        if not html:
            logger.error("BUILD_ID_NOT_FOUND: home page fetch failed")
            return None

        m = re.search(r'"buildId":"([^"]+)"', html)
        if not m:
            logger.error("BUILD_ID_NOT_FOUND: no buildId pattern in HTML")
            # Save snapshot for inspection
            snap_path = self.cache_dir / "fotmob_home_snapshot.html"
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            snap_path.write_text(html, encoding="utf-8")
            logger.warning("[SNAPSHOT] saved: %s", snap_path)
            return None

        bid = m.group(1)
        self._build_id = bid
        _source_health["build_id"] = bid
        _source_health["build_id_fetched_at"] = datetime.now(timezone.utc).isoformat()
        _write_cache(self.cache_dir, cache_key, bid)
        logger.info("[OK] buildId extracted: %s", bid)
        return bid

    # ─── Search via apigw ─────────────────────────────────────────────────────

    def search_player(self, term: str) -> Optional[dict]:
        """Search via apigw.fotmob.com/searchapi/suggest."""
        cache_key = _cache_key("search", {"term": term, "lang": "en"})
        cached = _read_cache(self.cache_dir, cache_key)
        if cached is not None:
            logger.info("[CACHE] search: %s", term)
            return cached

        url = f"{APIGW_BASE}/searchapi/suggest"
        data = self._http_json(url, params={"term": term, "lang": "en"})
        if data is None:
            logger.error("SOURCE_SEARCH_FAILED: %s", term)
            return None

        _write_cache(self.cache_dir, cache_key, data)
        return data

    @staticmethod
    def parse_player_search(payload: dict) -> list[dict]:
        """Extract player suggestions from apigw search response."""
        out: list[dict] = []
        suggest = payload.get("squadMemberSuggest") or []
        for block in suggest:
            for opt in block.get("options", []):
                text = opt.get("text", "")
                # Format: "Name|id"
                name = text.split("|")[0] if "|" in text else text
                pid_str = text.split("|")[1] if "|" in text else ""
                payload_obj = opt.get("payload", {})
                pid = payload_obj.get("id") or pid_str
                out.append({
                    "name": name,
                    "id": int(pid) if str(pid).isdigit() else None,
                    "team_id": payload_obj.get("teamId"),
                    "team_name": payload_obj.get("teamName"),
                    "is_coach": payload_obj.get("isCoach", False),
                    "score": opt.get("score"),
                })
        return out

    # ─── Player data via _next/data ───────────────────────────────────────────

    @staticmethod
    def _slugify(name: str) -> str:
        s = name.lower().strip()
        s = re.sub(r"[^a-z0-9]+", "-", s)
        s = re.sub(r"-+", "-", s).strip("-")
        return s

    def get_player_next_data(
        self,
        player_id: int,
        slug: Optional[str] = None,
        name: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Fetch player data via Next.js _next/data endpoint.
        Returns the full pageProps payload.
        Saves raw JSON to cache/fotmob/player_next_data/{id}.json.
        """
        if slug is None and name:
            slug = self._slugify(name)
        if slug is None:
            slug = str(player_id)

        bid = self.get_build_id()
        if not bid:
            return None

        cache_key = _cache_key("player_next", {"id": player_id, "slug": slug})
        cached = _read_cache(self.cache_dir, cache_key)
        if cached is not None:
            logger.info("[CACHE] player_next: id=%s slug=%s", player_id, slug)
            return cached

        url = (
            f"{WWW_BASE}/_next/data/{bid}/en/players/{player_id}/{slug}.json"
            f"?lng=en&id={player_id}&slug={slug}"
        )
        data = self._http_json(url)

        # If 404 or stale, refresh buildId once and retry.
        if data is None and not _source_health["blocked"]:
            logger.info("[RETRY] refreshing buildId and retrying player fetch")
            new_bid = self.get_build_id(force_refresh=True)
            if new_bid and new_bid != bid:
                url = (
                    f"{WWW_BASE}/_next/data/{new_bid}/en/players/{player_id}/{slug}.json"
                    f"?lng=en&id={player_id}&slug={slug}"
                )
                data = self._http_json(url)

        if data is None:
            return None

        _write_cache(self.cache_dir, cache_key, data)

        # Also save raw JSON to player_next_data/ for downstream tools
        raw_dir = self.cache_dir / "player_next_data"
        raw_dir.mkdir(parents=True, exist_ok=True)
        raw_path = raw_dir / f"{player_id}.json"
        raw_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[OK] player_next_data saved: %s (size=%dKB)", raw_path.name, len(raw_path.read_text(encoding='utf-8')) // 1024)

        return data

    # ─── Other endpoints (for matches/teams via _next/data) ───────────────────

    def get_team_next_data(self, team_id: int, slug: Optional[str] = None) -> Optional[dict]:
        """Fetch team data via _next/data."""
        bid = self.get_build_id()
        if not bid:
            return None
        slug_part = slug or str(team_id)
        cache_key = _cache_key("team_next", {"id": team_id, "slug": slug_part})
        cached = _read_cache(self.cache_dir, cache_key)
        if cached is not None:
            return cached
        url = (
            f"{WWW_BASE}/_next/data/{bid}/en/teams/{team_id}/overview/{slug_part}.json"
            f"?lng=en&id={team_id}&tab=overview"
        )
        data = self._http_json(url)
        if data is not None:
            _write_cache(self.cache_dir, cache_key, data)
        return data

    def get_matches_next_data(self, date_yyyymmdd: str) -> Optional[dict]:
        """Fetch matches for a date via _next/data."""
        bid = self.get_build_id()
        if not bid:
            return None
        cache_key = _cache_key("matches_next", {"date": date_yyyymmdd})
        cached = _read_cache(self.cache_dir, cache_key, ttl_hours=1)
        if cached is not None:
            return cached
        url = f"{WWW_BASE}/_next/data/{bid}/en/matches.json?lng=en&date={date_yyyymmdd}"
        data = self._http_json(url)
        if data is not None:
            _write_cache(self.cache_dir, cache_key, data)
        return data

    def get_match_next_data(self, match_id: int) -> Optional[dict]:
        """Fetch match details via _next/data."""
        bid = self.get_build_id()
        if not bid:
            return None
        cache_key = _cache_key("match_next", {"id": match_id})
        cached = _read_cache(self.cache_dir, cache_key, ttl_hours=2)
        if cached is not None:
            return cached
        url = (
            f"{WWW_BASE}/_next/data/{bid}/en/matches/match.json"
            f"?lng=en&matchId={match_id}"
        )
        data = self._http_json(url)
        if data is not None:
            _write_cache(self.cache_dir, cache_key, data)
        return data

    # ─── Player report builder ────────────────────────────────────────────────

    def build_player_report(
        self,
        player_id: int,
        name: Optional[str] = None,
        output_dir: Optional[Path] = None,
    ) -> Optional[dict]:
        """
        Build a structured player report from _next/data response.
        Saves to reports/player_fotmob/{slug}.json.
        """
        next_data = self.get_player_next_data(player_id, name=name)
        if not next_data:
            return None

        page_props = next_data.get("pageProps", {})
        # Modern FotMob structure: pageProps.data
        # Older fallback: pageProps.fetchAllPlayer / pageProps.playerProps
        player_data = page_props.get("data") or page_props.get("fetchAllPlayer") or page_props.get("playerProps") or {}

        if not isinstance(player_data, dict):
            logger.warning("[WARN] player_data is not dict: %s", type(player_data).__name__)
            player_data = {}

        resolved_name = (
            player_data.get("name")
            or name
            or f"player-{player_id}"
        )
        slug = self._slugify(resolved_name)

        # Extract identity safely
        birth = player_data.get("birthDate") or {}
        primary_team = player_data.get("primaryTeam") or {}
        position_desc = player_data.get("positionDescription") or {}

        report = {
            "source": "fotmob",
            "method": "next_data",
            "player_id": player_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "identity": {
                "name": resolved_name,
                "id": player_id,
                "birth_date": birth.get("utcTime") if isinstance(birth, dict) else birth,
                "nationality": None,
                "height": None,
                "preferred_foot": None,
            },
            "current_club": {
                "name": primary_team.get("teamName"),
                "id": primary_team.get("teamId"),
            },
            "position": {
                "main": position_desc.get("primaryPosition") if isinstance(position_desc, dict) else None,
                "label": position_desc.get("label") if isinstance(position_desc, dict) else None,
            },
            "recent_matches": [],
            "season_stats": {},
            "raw_top_keys": list(player_data.keys()) if isinstance(player_data, dict) else [],
        }

        # Player information (nationality, height, foot)
        info_list = player_data.get("playerInformation") or []
        if isinstance(info_list, list):
            for info in info_list:
                if not isinstance(info, dict):
                    continue
                title = (info.get("title") or "").lower()
                value = info.get("value")
                resolved = value.get("fallback") if isinstance(value, dict) else value
                if "country" in title or "nationality" in title:
                    report["identity"]["nationality"] = resolved
                elif "height" in title:
                    report["identity"]["height"] = resolved
                elif "foot" in title:
                    report["identity"]["preferred_foot"] = resolved

        # Recent matches
        recent = player_data.get("recentMatches") or []
        if isinstance(recent, list):
            for match in recent[:10]:
                if not isinstance(match, dict):
                    continue
                match_date = match.get("matchDate")
                if isinstance(match_date, dict):
                    match_date = match_date.get("utcTime")
                report["recent_matches"].append({
                    "match_id": match.get("matchId") or match.get("id"),
                    "opponent": match.get("opponentTeamName") or match.get("opponent"),
                    "date": match_date,
                    "rating": match.get("rating"),
                    "goals": match.get("goals"),
                    "assists": match.get("assists"),
                    "minutes_played": match.get("minutesPlayed"),
                })

        # Season stats from mainLeague.stats
        main_league = player_data.get("mainLeague") or {}
        if isinstance(main_league, dict):
            stats_blocks = main_league.get("stats") or []
            if isinstance(stats_blocks, list):
                for block in stats_blocks:
                    if not isinstance(block, dict):
                        continue
                    items = block.get("stats") or []
                    if isinstance(items, list):
                        for item in items:
                            if not isinstance(item, dict):
                                continue
                            key = item.get("key") or item.get("title")
                            stat_obj = item.get("stat")
                            val = stat_obj.get("value") if isinstance(stat_obj, dict) else stat_obj
                            if key and val is not None:
                                report["season_stats"][str(key)] = val

        # Save report
        out_dir = output_dir or (Path(__file__).parent.parent / "reports" / "player_fotmob")
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{slug}.json"
        out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[OK] player report saved: %s", out_path.name)

        return report
