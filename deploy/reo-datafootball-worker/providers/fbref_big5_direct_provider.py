"""
Direct Big5 FBref provider.
Uses direct URLs to FBref Big 5 European Leagues Combined endpoints.
Falls back to browser-like headers + retry logic without SeleniumBase.

URLs sourced from: github.com/alexgasconn/player-recommender

Supports stat groups:
  standard, shooting, passing, pass_types, gca,
  defense, possession, playing_time, misc, keeper, keeper_adv
"""

import time
import random
import traceback
from pathlib import Path

import pandas as pd
import requests
from fake_useragent import UserAgent

from .base_provider import BaseProvider, StatGroupResult, get_logger
from .coverage_utils import canonical_stat_group

logger = get_logger("big5_direct_provider")

# Direct Big5 URLs (current season - no season in URL = latest)
BIG5_URLS = {
    "standard": "https://fbref.com/en/comps/Big5/stats/players/Big-5-European-Leagues-Stats",
    "shooting": "https://fbref.com/en/comps/Big5/shooting/players/Big-5-European-Leagues-Stats",
    "passing": "https://fbref.com/en/comps/Big5/passing/players/Big-5-European-Leagues-Stats",
    "pass_types": "https://fbref.com/en/comps/Big5/passing_types/players/Big-5-European-Leagues-Stats",
    "gca": "https://fbref.com/en/comps/Big5/gca/players/Big-5-European-Leagues-Stats",
    "defense": "https://fbref.com/en/comps/Big5/defense/players/Big-5-European-Leagues-Stats",
    "possession": "https://fbref.com/en/comps/Big5/possession/players/Big-5-European-Leagues-Stats",
    "playing_time": "https://fbref.com/en/comps/Big5/playingtime/players/Big-5-European-Leagues-Stats",
    "misc": "https://fbref.com/en/comps/Big5/misc/players/Big-5-European-Leagues-Stats",
    "keeper": "https://fbref.com/en/comps/Big5/keepers/players/Big-5-European-Leagues-Stats",
    "keeper_adv": "https://fbref.com/en/comps/Big5/keepersadv/players/Big-5-European-Leagues-Stats",
}

# Table IDs used by FBref for each stat type
TABLE_IDS = {
    "standard": "stats_standard",
    "shooting": "stats_shooting",
    "passing": "stats_passing",
    "pass_types": "stats_passing_types",
    "gca": "stats_gca",
    "defense": "stats_defense",
    "possession": "stats_possession",
    "playing_time": "stats_playing_time",
    "misc": "stats_misc",
    "keeper": "stats_keeper",
    "keeper_adv": "stats_keeper_adv",
}


def _build_headers():
    """Build browser-like HTTP headers."""
    try:
        ua = UserAgent()
        user_agent = ua.chrome
    except Exception:
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"

    return {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Upgrade-Insecure-Requests": "1",
        "Connection": "keep-alive",
    }


def _parse_html_table(html_text, stat_group):
    """Parse player stats table from HTML using pandas."""
    try:
        tables = pd.read_html(html_text, attrs={"id": TABLE_IDS.get(stat_group, "")})
        if tables and len(tables) > 0:
            return tables[0]
    except Exception:
        pass

    # Fallback: try all tables
    try:
        tables = pd.read_html(html_text)
        # Find the biggest table (likely the stats table)
        if tables:
            biggest = max(tables, key=lambda t: len(t))
            if len(biggest) > 20:
                return biggest
    except Exception:
        pass

    return None


def _df_to_players(df):
    """Convert DataFrame to list of player dicts."""
    players = []
    if df is None or len(df) == 0:
        return players

    # Flatten MultiIndex columns
    if isinstance(df.columns, pd.MultiIndex):
        new_cols = []
        for col in df.columns:
            parts = [str(c) for c in col if c and str(c) != "" and "Unnamed" not in str(c)]
            new_cols.append("_".join(parts).lower() if parts else str(col).lower())
        df.columns = new_cols
    else:
        df.columns = [str(c).lower() for c in df.columns]

    logger.info("[INFO] Columns discovered: %s", ", ".join([str(c) for c in df.columns]))

    # Remove header rows repeated in data
    if "player" in df.columns:
        df = df[df["player"] != "Player"]
    elif "rk" in df.columns:
        df = df[df["rk"] != "Rk"]

    for _, row in df.iterrows():
        player = {}
        for col in df.columns:
            val = row[col]
            if hasattr(val, 'item'):
                val = val.item()
            if val != val:  # NaN
                val = None
            player[col] = val
        players.append(player)

    return players


class FBrefBig5DirectProvider(BaseProvider):
    """Fetch FBref data via direct HTTP requests to Big5 endpoints."""

    def __init__(self, max_retries=2, base_delay=60, request_timeout=30):
        self._max_retries = max_retries
        self._base_delay = base_delay
        self._timeout = request_timeout

    @property
    def name(self):
        return "fbref_big5_direct"

    @property
    def source(self):
        return "direct_big5"

    def supported_stat_groups(self):
        return list(BIG5_URLS.keys())

    def _smoke_test(self):
        """Test standard_stats endpoint. If 403/429, abort all."""
        url = BIG5_URLS["standard"]
        headers = _build_headers()
        logger.info("[INFO] Smoke test: %s", url)

        try:
            resp = requests.get(url, headers=headers, timeout=self._timeout)
            if resp.status_code in (403, 429):
                logger.warning("[FAIL] Smoke test got HTTP %d - aborting direct strategy", resp.status_code)
                return False
            if resp.status_code == 200:
                logger.info("[OK] Smoke test passed (HTTP 200)")
                return True
            logger.warning("[WARN] Smoke test got HTTP %d", resp.status_code)
            return False
        except Exception as e:
            logger.error("[FAIL] Smoke test error: %s", str(e))
            return False

    def _fetch_url(self, url, stat_group):
        """Fetch a single URL with retry logic."""
        headers = _build_headers()

        for attempt in range(1, self._max_retries + 1):
            try:
                logger.info("[INFO] Attempt %d/%d for %s", attempt, self._max_retries, stat_group)
                resp = requests.get(url, headers=headers, timeout=self._timeout)

                if resp.status_code == 200:
                    return resp.text

                if resp.status_code in (403, 429):
                    wait = self._base_delay * attempt
                    logger.warning("[WARN] HTTP %d on attempt %d for %s. Waiting %ds...",
                                   resp.status_code, attempt, stat_group, wait)
                    if attempt < self._max_retries:
                        time.sleep(wait)
                    continue

                logger.warning("[WARN] HTTP %d for %s", resp.status_code, stat_group)

            except Exception as e:
                logger.error("[FAIL] Request error for %s: %s", stat_group, str(e))
                if attempt < self._max_retries:
                    time.sleep(10)

        return "__FBREF_BLOCKED_OR_CAPTCHA__"

    def fetch(self, stat_groups, season, cache_dir):
        """Fetch player stats via direct Big5 URLs."""
        results = {}
        total_ok = 0
        total_failed = 0

        # Smoke test first
        if not self._smoke_test():
            logger.error("[FAIL] Smoke test failed - skipping all direct fetches")
            for sg in stat_groups:
                r = StatGroupResult(sg, self.source, self.name, season)
                r.error = "Smoke test failed (403/429)"
                results[sg] = r
                total_failed += 1
            return {"provider": self.name, "results": results, "total_ok": 0, "total_failed": total_failed}

        # Fetch each stat group
        for i, sg in enumerate(stat_groups):
            sg = canonical_stat_group(sg)
            result = StatGroupResult(sg, self.source, self.name, season)

            if sg not in BIG5_URLS:
                result.error = f"Unknown stat group: {sg}"
                results[sg] = result
                total_failed += 1
                logger.warning("[WARN] Unknown stat group: %s", sg)
                continue

            url = BIG5_URLS[sg]
            logger.info("[INFO] Fetching %s (%d/%d)...", sg, i + 1, len(stat_groups))

            try:
                html_text = self._fetch_url(url, sg)
                if html_text == "__FBREF_BLOCKED_OR_CAPTCHA__":
                    result.error = "FBref blocked request or CAPTCHA/rate-limit detected"
                    results[sg] = result
                    total_failed += 1
                    logger.warning("[WARN] %s: blocked/CAPTCHA detected; stopping direct fetches to avoid pressure", sg)
                    for remaining_sg in stat_groups[i + 1:]:
                        remaining_sg = canonical_stat_group(remaining_sg)
                        skipped = StatGroupResult(remaining_sg, self.source, self.name, season)
                        skipped.error = "Skipped after FBref block/CAPTCHA signal"
                        results[remaining_sg] = skipped
                        total_failed += 1
                    break
                if html_text is None:
                    result.error = "Failed to fetch HTML"
                    results[sg] = result
                    total_failed += 1
                    logger.warning("[FAIL] %s: no HTML returned", sg)
                    continue

                df = _parse_html_table(html_text, sg)
                if df is None or len(df) == 0:
                    result.error = "No table found in HTML"
                    results[sg] = result
                    total_failed += 1
                    logger.warning("[FAIL] %s: no table parsed", sg)
                    continue

                players = _df_to_players(df)
                if len(players) == 0:
                    result.error = "No players parsed"
                    results[sg] = result
                    total_failed += 1
                    logger.warning("[FAIL] %s: 0 players", sg)
                    continue

                result.ok = True
                result.players = players
                result.player_count = len(players)
                result.save(cache_dir)
                results[sg] = result
                total_ok += 1
                logger.info("[OK] %s: %d players", sg, len(players))

            except Exception as e:
                result.error = str(e)
                results[sg] = result
                total_failed += 1
                logger.error("[FAIL] %s: %s", sg, str(e))
                logger.debug(traceback.format_exc())

            # Rate limiting between requests (Phase F: 10-20 s random window).
            if i < len(stat_groups) - 1:
                delay = random.uniform(10, 20)
                logger.info("[INFO] Waiting %.1fs before next request...", delay)
                time.sleep(delay)

        logger.info("[INFO] direct_big5 results: %d OK, %d FAILED out of %d", total_ok, total_failed, len(stat_groups))
        return {"provider": self.name, "results": results, "total_ok": total_ok, "total_failed": total_failed}
