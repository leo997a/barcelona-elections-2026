"""
FBref data provider using soccerdata library.
Uses SeleniumBase (undetected Chrome) to bypass 403 blocks.
Supports Big 5 European Leagues Combined.

Stat types supported by soccerdata v1.9.0:
  - standard
  - shooting
  - playing_time
  - misc
  - keeper
"""

import traceback
import random
import time
from pathlib import Path

import pandas as pd

from .base_provider import BaseProvider, StatGroupResult, get_logger
from .coverage_utils import canonical_stat_group

logger = get_logger("soccerdata_provider")

# soccerdata stat_type -> our stat_group name mapping
STAT_TYPE_MAP = {
    "standard": "standard",
    "shooting": "shooting",
    "playing_time": "playing_time",
    "misc": "misc",
    "keeper": "keeper",
}


def _normalize_season(season_str):
    """Convert '2025-26' or '2025-2026' to soccerdata format '25-26'."""
    s = str(season_str).strip()
    if len(s) == 7 and s[4] == "-":
        # "2025-26" -> "25-26"
        return s[2:]
    if len(s) == 9 and s[4] == "-":
        # "2025-2026" -> "25-26"
        return s[2:4] + "-" + s[7:9]
    if len(s) == 5 and s[2] == "-":
        # already "25-26"
        return s
    if len(s) == 4:
        # "2025" -> keep as int
        return int(s)
    return s


def _safe_native(value):
    """
    Convert a pandas / numpy scalar (or NA / NaN / NaT) to a JSON-friendly
    Python value.

    Rules:
    - pd.NA, np.nan, NaT, None  -> None
    - numpy scalars (int64, float64, bool_) -> int / float / bool
    - strings, ints, floats, bools                 -> as-is
    - anything else                                 -> str(value)

    Designed so the result can be passed to json.dumps without raising and
    without triggering pandas' "boolean value of NA is ambiguous" error.
    """
    if value is None:
        return None
    # pd.isna handles: None, pd.NA, np.nan, pd.NaT, datetime NaT.
    # Wrap in try/except because pd.isna on lists/arrays returns an array,
    # which we then cannot use as a single boolean.
    try:
        is_na = pd.isna(value)
    except (TypeError, ValueError):
        is_na = False
    # If pd.isna returned an array (e.g. for list-like values), bool() would
    # raise. Treat the value as "not NA" in that case.
    if isinstance(is_na, bool) and is_na:
        return None
    # Numpy scalars expose .item(); use it to get a native Python type.
    item = getattr(value, "item", None)
    if callable(item):
        try:
            return item()
        except (TypeError, ValueError):
            pass
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _df_to_players(df, stat_group):
    """Convert soccerdata DataFrame to list of player dicts."""
    players = []
    try:
        # soccerdata returns MultiIndex DataFrames
        # Reset index to get league, season, team, player as columns
        df_reset = df.reset_index()

        # Flatten MultiIndex columns if present
        if hasattr(df_reset.columns, 'levels'):
            # MultiIndex columns: flatten
            new_cols = []
            for col in df_reset.columns:
                if isinstance(col, tuple):
                    parts = [str(c) for c in col if c and str(c) != "" and not str(c).startswith("Unnamed")]
                    new_cols.append("_".join(parts) if len(parts) > 1 else (parts[0] if parts else str(col)))
                else:
                    new_cols.append(str(col))
            df_reset.columns = new_cols

        # Lowercase column names once so per-row conversion is fast and safe.
        column_keys = [str(c).lower() for c in df_reset.columns]

        logger.info("[INFO] Columns discovered for %s: %s", stat_group, ", ".join(column_keys))

        # Convert to records using itertuples for speed AND deterministic
        # access by column index (avoids pandas Series boolean evaluation).
        column_count = len(column_keys)
        for row_tuple in df_reset.itertuples(index=False, name=None):
            # row_tuple is a plain Python tuple; values may still be numpy/pandas
            # scalars but never a Series, so pd.isna is safe.
            player = {}
            for idx in range(column_count):
                player[column_keys[idx]] = _safe_native(row_tuple[idx])
            players.append(player)

    except Exception as e:
        logger.error("[FAIL] Error converting DataFrame: %s", str(e))

    return players


class FBrefSoccerdataProvider(BaseProvider):
    """Fetch FBref data via soccerdata library (SeleniumBase)."""

    def __init__(self, data_dir=None, headless=True, no_cache=False, no_store=False):
        self._data_dir = Path(data_dir) if data_dir else None
        self._headless = headless
        self._no_cache = no_cache
        self._no_store = no_store

    @property
    def name(self):
        return "fbref_soccerdata"

    @property
    def source(self):
        return "soccerdata"

    def supported_stat_groups(self):
        return list(STAT_TYPE_MAP.keys())

    def fetch(self, stat_groups, season, cache_dir):
        """Fetch player stats using soccerdata library."""
        results = {}
        total_ok = 0
        total_failed = 0

        # Import soccerdata here to allow graceful failure
        try:
            import soccerdata as sd
            logger.info("[OK] soccerdata v%s loaded", sd.__version__ if hasattr(sd, '__version__') else '?')
        except ImportError as e:
            logger.error("[FAIL] soccerdata not installed: %s", str(e))
            logger.info("[INFO] Install with: pip install soccerdata")
            for sg in stat_groups:
                r = StatGroupResult(sg, self.source, self.name, season)
                r.error = "soccerdata not installed"
                results[sg] = r
                total_failed += 1
            return {"provider": self.name, "results": results, "total_ok": 0, "total_failed": total_failed}

        # Normalize season
        sd_season = _normalize_season(season)
        logger.info("[INFO] Season: %s (soccerdata format: %s)", season, sd_season)

        # Create FBref reader
        try:
            kwargs = {
                "leagues": "Big 5 European Leagues Combined",
                "seasons": sd_season,
                "no_cache": self._no_cache,
                "no_store": self._no_store,
                "headless": self._headless,
            }
            if self._data_dir:
                kwargs["data_dir"] = self._data_dir

            fbref = sd.FBref(**kwargs)
            logger.info("[OK] FBref reader initialized (headless=%s)", self._headless)
        except Exception as e:
            logger.error("[FAIL] Failed to initialize FBref reader: %s", str(e))
            for sg in stat_groups:
                r = StatGroupResult(sg, self.source, self.name, season)
                r.error = f"FBref init failed: {str(e)}"
                results[sg] = r
                total_failed += 1
            return {"provider": self.name, "results": results, "total_ok": 0, "total_failed": total_failed}

        # Fetch each stat group
        for index, sg in enumerate(stat_groups):
            sg = canonical_stat_group(sg)
            result = StatGroupResult(sg, self.source, self.name, season)

            # Phase F: pace between groups (10-20 s) to avoid CAPTCHA pressure.
            if index > 0:
                delay = random.uniform(10, 20)
                logger.info("[INFO] Waiting %.1fs before next stat group...", delay)
                time.sleep(delay)

            if sg not in STAT_TYPE_MAP:
                result.error = f"Unsupported stat type: {sg}"
                results[sg] = result
                total_failed += 1
                logger.warning("[WARN] Skipping unsupported stat type: %s", sg)
                continue

            sd_stat_type = STAT_TYPE_MAP[sg]
            logger.info("[INFO] Fetching: %s ...", sg)

            try:
                df = fbref.read_player_season_stats(stat_type=sd_stat_type)

                if df is None or len(df) == 0:
                    result.error = "Empty DataFrame returned"
                    results[sg] = result
                    total_failed += 1
                    logger.warning("[FAIL] %s: empty result", sg)
                    continue

                # Convert to player dicts
                players = _df_to_players(df, sg)

                if len(players) == 0:
                    result.error = "No players after conversion"
                    results[sg] = result
                    total_failed += 1
                    logger.warning("[FAIL] %s: no players after conversion", sg)
                    continue

                result.ok = True
                result.players = players
                result.player_count = len(players)
                result.save(cache_dir)
                results[sg] = result
                total_ok += 1
                logger.info("[OK] %s: %d players fetched and cached", sg, len(players))

            except Exception as e:
                err_str = str(e)
                lower = err_str.lower()
                # Tag known block/captcha signals so fetch_state can apply cooldown.
                if any(marker in lower for marker in (
                    "captcha", "cloudflare", "could not retrieve",
                    "just a moment", "cf-chl", "cf-turnstile", "blocked", "403", "429",
                )):
                    result.error = f"captcha_or_block: {err_str[:240]}"
                else:
                    result.error = err_str[:300]
                results[sg] = result
                total_failed += 1
                logger.error("[FAIL] %s: %s", sg, err_str[:200])
                logger.debug(traceback.format_exc())

        logger.info("[INFO] soccerdata results: %d OK, %d FAILED out of %d", total_ok, total_failed, len(stat_groups))
        return {"provider": self.name, "results": results, "total_ok": total_ok, "total_failed": total_failed}
