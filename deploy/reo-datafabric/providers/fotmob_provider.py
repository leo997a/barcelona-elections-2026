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
import sys
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
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s %(message)s", "%H:%M:%S"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

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
        player_data = page_props.get("data") or {}
        if not isinstance(player_data, dict):
            player_data = {}

        resolved_name = player_data.get("name") or name or f"player-{player_id}"
        slug = self._slugify(resolved_name)

        # Compute raw payload size by re-serializing once (cheap on already-loaded dict).
        try:
            raw_size_kb = round(len(json.dumps(next_data, ensure_ascii=False)) / 1024, 1)
        except Exception:
            raw_size_kb = None

        # Sections that exist in the public catalog. Used to compute available/missing.
        all_sections = [
            "id", "name", "birthDate", "contractEnd", "primaryTeam",
            "positionDescription", "injuryInformation", "internationalDuty",
            "playerInformation", "mainLeague", "trophies", "recentMatches",
            "careerHistory", "traits", "coachStats", "statSeasons",
            "firstSeasonStats", "marketValues", "relatedLinksData", "nextMatch",
        ]
        available_sections = []
        missing_sections = []
        for section in all_sections:
            v = player_data.get(section)
            if v is None or (isinstance(v, (list, dict, str)) and len(v) == 0):
                missing_sections.append(section)
            else:
                available_sections.append(section)

        report = {
            "source": "fotmob",
            "method": "next_data",
            "player_id": player_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": _extract_summary(player_data, player_id, resolved_name),
            "season_top_stats": _extract_top_stat_card(player_data),
            "main_league_stats": _extract_main_league_stats(player_data),
            "recent_matches": _extract_recent_matches(player_data),
            "career_history": _extract_career_history(player_data),
            "traits": _extract_traits(player_data),
            "trophies": _extract_trophies(player_data),
            "market_values": _extract_market_values(player_data),
            "stat_seasons_index": _extract_stat_seasons_index(player_data),
            "next_match": _extract_next_match(player_data),
            "image_url": f"https://images.fotmob.com/image_resources/playerimages/{player_id}.png",
            "availableSections": available_sections,
            "missingSections": missing_sections,
            "extractedMetrics": [],  # filled below
            "rawPayloadSizeKB": raw_size_kb,
            "rawPayloadPath": str(self.cache_dir / "player_next_data" / f"{player_id}.json"),
            "raw_top_keys": list(player_data.keys()),
        }

        # Build extractedMetrics list from all numeric fields we successfully pulled
        ext: list[str] = []
        if report["summary"].get("position"):
            ext.append("position")
        for st in report["season_top_stats"]:
            if st.get("value") is not None:
                ext.append(f"top_stat:{st['key']}")
        for st in report["main_league_stats"]:
            if st.get("value") is not None:
                ext.append(f"main_league:{st['key']}")
        if report["recent_matches"]:
            ext.append(f"recent_matches({len(report['recent_matches'])})")
        if report["career_history"]:
            ext.append(f"career_history({len(report['career_history'])})")
        if report["traits"]:
            ext.append(f"traits({len(report['traits'])})")
        if report["trophies"]:
            ext.append(f"trophies({len(report['trophies'])})")
        report["extractedMetrics"] = ext

        # Save
        out_dir = output_dir or (Path(__file__).parent.parent / "reports" / "player_fotmob")
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{slug}.json"
        out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[OK] player report saved: %s", out_path.name)

        return report


# ─── Extractor helpers (top-level so tests can import them) ────────────────────


def _safe_get(d: Any, *keys: str, default: Any = None) -> Any:
    """Safely traverse nested dicts."""
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
    return cur if cur is not None else default


def _extract_summary(player_data: dict, player_id: int, name: str) -> dict:
    """Identity + club + position + bio facts."""
    primary_team = player_data.get("primaryTeam") or {}
    position_desc = player_data.get("positionDescription") or {}
    primary_pos = position_desc.get("primaryPosition") or {}
    pos_label = primary_pos.get("label") if isinstance(primary_pos, dict) else None

    # playerInformation is a list of {translationKey, value} blocks
    info_map: dict[str, Any] = {}
    for item in (player_data.get("playerInformation") or []):
        if not isinstance(item, dict):
            continue
        key = item.get("translationKey") or item.get("title")
        val = item.get("value")
        if isinstance(val, dict):
            info_map[key] = val.get("fallback") if val.get("fallback") is not None else val.get("numberValue")
        else:
            info_map[key] = val

    birth = player_data.get("birthDate") or {}
    contract_end = player_data.get("contractEnd") or {}

    return {
        "id": player_id,
        "name": name,
        "club": primary_team.get("teamName"),
        "club_id": primary_team.get("teamId"),
        "on_loan": primary_team.get("onLoan"),
        "position": pos_label,
        "position_short": _safe_get(position_desc, "positions", default=[None])[0] if isinstance(position_desc.get("positions"), list) and position_desc["positions"] else None,
        "all_positions": [p.get("strPos", {}).get("label") for p in (position_desc.get("positions") or []) if isinstance(p, dict)],
        "country": info_map.get("country_sentencecase") or info_map.get("country"),
        "height_cm": info_map.get("height_sentencecase") or info_map.get("height"),
        "preferred_foot": info_map.get("preferred_foot"),
        "shirt_number": info_map.get("shirt"),
        "age": info_map.get("age_sentencecase") or info_map.get("age"),
        "transfer_value": info_map.get("transfer_value"),
        "birth_date": birth.get("utcTime") if isinstance(birth, dict) else birth,
        "contract_end": contract_end.get("utcTime") if isinstance(contract_end, dict) else contract_end,
        "is_captain": player_data.get("isCaptain"),
        "status": player_data.get("status"),
    }


def _extract_top_stat_card(player_data: dict) -> list[dict]:
    """firstSeasonStats.topStatCard.items — headline season stats."""
    out: list[dict] = []
    fss = player_data.get("firstSeasonStats") or {}
    tsc = fss.get("topStatCard") if isinstance(fss, dict) else None
    if not isinstance(tsc, dict):
        return out
    items = tsc.get("items") or []
    if not isinstance(items, list):
        return out
    for it in items:
        if not isinstance(it, dict):
            continue
        out.append({
            "key": it.get("localizedTitleId") or it.get("title"),
            "title": it.get("title"),
            "value": it.get("statValue"),
            "per90": it.get("per90"),
            "percentile_rank": it.get("percentileRank"),
            "percentile_rank_per90": it.get("percentileRankPer90"),
            "stat_format": it.get("statFormat"),
        })
    return out


def _extract_main_league_stats(player_data: dict) -> list[dict]:
    """mainLeague.stats — list of {title, localizedTitleId, value} blocks."""
    out: list[dict] = []
    ml = player_data.get("mainLeague") or {}
    stats = ml.get("stats") if isinstance(ml, dict) else None
    if not isinstance(stats, list):
        return out
    for s in stats:
        if not isinstance(s, dict):
            continue
        out.append({
            "key": s.get("localizedTitleId") or s.get("title"),
            "title": s.get("title"),
            "value": s.get("value"),
        })
    return out


def _extract_recent_matches(player_data: dict, limit: int = 12) -> list[dict]:
    """recentMatches — last `limit` matches with rating/goals/assists/minutes."""
    out: list[dict] = []
    rm = player_data.get("recentMatches") or []
    if not isinstance(rm, list):
        return out
    for m in rm[:limit]:
        if not isinstance(m, dict):
            continue
        match_date = m.get("matchDate")
        if isinstance(match_date, dict):
            match_date = match_date.get("utcTime")
        rating_props = m.get("ratingProps") or {}
        rating = rating_props.get("rating") if isinstance(rating_props, dict) else None
        out.append({
            "match_id": m.get("id") or m.get("matchId"),
            "date": match_date,
            "league_id": m.get("leagueId"),
            "league": m.get("leagueName"),
            "team": m.get("teamName"),
            "opponent": m.get("opponentTeamName"),
            "is_home": m.get("isHomeTeam"),
            "home_score": m.get("homeScore"),
            "away_score": m.get("awayScore"),
            "minutes_played": m.get("minutesPlayed"),
            "goals": m.get("goals"),
            "assists": m.get("assists"),
            "yellow_cards": m.get("yellowCards"),
            "red_cards": m.get("redCards"),
            "rating": rating,
            "is_top_rating": rating_props.get("isTopRating") if isinstance(rating_props, dict) else None,
            "player_of_the_match": m.get("playerOfTheMatch"),
            "on_bench": m.get("onBench"),
        })
    return out


def _extract_career_history(player_data: dict) -> list[dict]:
    """careerHistory.careerItems — flatten senior/youth/national team."""
    out: list[dict] = []
    ch = player_data.get("careerHistory") or {}
    items = ch.get("careerItems") if isinstance(ch, dict) else None
    if not isinstance(items, dict):
        return out
    for category, content in items.items():
        if not isinstance(content, dict):
            continue
        entries = content.get("seasonEntries") or []
        if not isinstance(entries, list):
            continue
        for e in entries[:8]:  # cap per category
            if not isinstance(e, dict):
                continue
            out.append({
                "category": category,
                "season": e.get("seasonName"),
                "team": e.get("teamName"),
                "team_id": e.get("teamId"),
                "appearances": e.get("appearances"),
                "goals": e.get("goals"),
                "assists": e.get("assists"),
            })
    return out


def _extract_traits(player_data: dict) -> list[dict]:
    """traits.items — playing style traits (0–1 normalized)."""
    out: list[dict] = []
    tr = player_data.get("traits") or {}
    items = tr.get("items") if isinstance(tr, dict) else None
    if not isinstance(items, list):
        return out
    for t in items:
        if not isinstance(t, dict):
            continue
        out.append({
            "key": t.get("key"),
            "title": t.get("title"),
            "value": t.get("value"),
        })
    return out


def _extract_trophies(player_data: dict) -> list[dict]:
    """trophies.playerTrophies — won/runner-up by tournament."""
    out: list[dict] = []
    tr = player_data.get("trophies") or {}
    pt = tr.get("playerTrophies") if isinstance(tr, dict) else None
    if not isinstance(pt, list):
        return out
    for entry in pt:
        if not isinstance(entry, dict):
            continue
        team = entry.get("teamName")
        for t in (entry.get("tournaments") or []):
            if not isinstance(t, dict):
                continue
            won = t.get("seasonsWon") or []
            ru = t.get("seasonsRunnerUp") or []
            out.append({
                "team": team,
                "tournament": t.get("name"),
                "won_count": len(won) if isinstance(won, list) else 0,
                "runner_up_count": len(ru) if isinstance(ru, list) else 0,
            })
    return out


def _extract_market_values(player_data: dict) -> dict:
    """marketValues.values — return latest + first + count."""
    mv = player_data.get("marketValues") or {}
    values = mv.get("values") if isinstance(mv, dict) else None
    if not isinstance(values, list) or not values:
        return {}
    first = values[0] if isinstance(values[0], dict) else {}
    last = values[-1] if isinstance(values[-1], dict) else {}
    return {
        "count": len(values),
        "first_date": first.get("date"),
        "first_value": first.get("value"),
        "first_currency": first.get("currency"),
        "latest_date": last.get("date"),
        "latest_value": last.get("value"),
        "latest_currency": last.get("currency"),
    }


def _extract_stat_seasons_index(player_data: dict) -> list[dict]:
    """Lightweight index of available seasons (full stats are huge)."""
    out: list[dict] = []
    seasons = player_data.get("statSeasons") or []
    if not isinstance(seasons, list):
        return out
    for s in seasons:
        if not isinstance(s, dict):
            continue
        tournaments = s.get("tournaments") or []
        out.append({
            "season": s.get("seasonName"),
            "tournament_count": len(tournaments) if isinstance(tournaments, list) else 0,
        })
    return out


def _extract_next_match(player_data: dict) -> Optional[dict]:
    """Lightweight next match info."""
    nm = player_data.get("nextMatch")
    if not isinstance(nm, dict):
        return None
    md = nm.get("matchDate")
    return {
        "match_id": nm.get("matchId"),
        "home": nm.get("homeName"),
        "away": nm.get("awayName"),
        "date": md.get("utcTime") if isinstance(md, dict) else md,
        "league_id": nm.get("leagueId"),
    }
