"""
Manual FBref HTML/CSV Import Provider.

Reads locally-saved FBref pages (HTML or CSV) from:
    <worker_dir>/.manual/fbref/

Supported file names:
    passing.html | passing.csv
    gca.html     | gca.csv
    defense.html | defense.csv
    possession.html | possession.csv
    pass_types.html | pass_types.csv
    (also: standard.html, shooting.html, etc. — any stat group)

Output: same JSON format as other providers (fbref-{group}-{season}.json).

No internet required. No scraping. Pure offline conversion.
"""

import traceback
from pathlib import Path

import pandas as pd

from .base_provider import BaseProvider, StatGroupResult, get_logger
from .coverage_utils import canonical_stat_group

logger = get_logger("manual_fbref_provider")

MANUAL_DIR_NAME = ".manual/fbref"

# FBref table IDs used in saved HTML pages (same as direct_big5 provider).
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


def _safe_native(value):
    """Convert pandas/numpy scalar to JSON-safe Python native."""
    if value is None:
        return None
    try:
        is_na = pd.isna(value)
    except (TypeError, ValueError):
        is_na = False
    if isinstance(is_na, bool) and is_na:
        return None
    item = getattr(value, "item", None)
    if callable(item):
        try:
            return item()
        except (TypeError, ValueError):
            pass
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _flatten_columns(df):
    """Flatten MultiIndex columns to lowercase strings."""
    if isinstance(df.columns, pd.MultiIndex):
        new_cols = []
        for col in df.columns:
            parts = [str(c) for c in col if c and str(c).strip() and "Unnamed" not in str(c)]
            new_cols.append("_".join(parts).lower() if parts else str(col).lower())
        df.columns = new_cols
    else:
        df.columns = [str(c).lower() for c in df.columns]
    return df


def _remove_header_rows(df):
    """Remove repeated header rows that FBref injects inside the table."""
    if "player" in df.columns:
        df = df[df["player"] != "Player"]
    elif "rk" in df.columns:
        df = df[df["rk"] != "Rk"]
    return df.reset_index(drop=True)


def _df_to_players(df):
    """Convert DataFrame to list of player dicts using safe native conversion."""
    players = []
    column_keys = list(df.columns)
    for row_tuple in df.itertuples(index=False, name=None):
        player = {}
        for idx, key in enumerate(column_keys):
            player[key] = _safe_native(row_tuple[idx])
        players.append(player)
    return players


def _parse_html(html_path, stat_group):
    """Parse a saved FBref HTML page and extract the stats table."""
    html_text = html_path.read_text(encoding="utf-8", errors="replace")

    # Try to find the specific table by ID first.
    table_id = TABLE_IDS.get(stat_group, "")
    df = None

    if table_id:
        try:
            tables = pd.read_html(html_text, attrs={"id": table_id})
            if tables:
                df = tables[0]
        except Exception:
            pass

    # Fallback: find the largest table on the page.
    if df is None or len(df) == 0:
        try:
            tables = pd.read_html(html_text)
            if tables:
                df = max(tables, key=lambda t: len(t))
        except Exception as e:
            return None, f"No tables found in HTML: {e}"

    if df is None or len(df) < 5:
        return None, "Table too small or not found"

    df = _flatten_columns(df)
    df = _remove_header_rows(df)
    return df, None


def _parse_csv(csv_path):
    """Parse a CSV file exported from FBref."""
    try:
        df = pd.read_csv(csv_path, encoding="utf-8")
    except UnicodeDecodeError:
        df = pd.read_csv(csv_path, encoding="latin-1")

    if df is None or len(df) < 5:
        return None, "CSV too small or empty"

    df = _flatten_columns(df)
    df = _remove_header_rows(df)
    return df, None


class ManualFBrefProvider(BaseProvider):
    """
    Offline provider that reads locally-saved FBref HTML/CSV files.

    Usage:
        python -m providers.provider_selector --strategy manual_fbref --stat-groups passing,gca,defense,possession,pass_types
    """

    def __init__(self, manual_dir=None):
        self._manual_dir = manual_dir

    @property
    def name(self):
        return "manual_fbref"

    @property
    def source(self):
        return "manual_fbref"

    def supported_stat_groups(self):
        return list(TABLE_IDS.keys())

    def fetch(self, stat_groups, season, cache_dir):
        results = {}
        total_ok = 0
        total_failed = 0

        manual_dir = Path(self._manual_dir) if self._manual_dir else Path(MANUAL_DIR_NAME)

        if not manual_dir.exists():
            logger.warning("[WARN] Manual FBref directory not found: %s", manual_dir)
            logger.info("[INFO] Create it and place HTML/CSV files inside:")
            logger.info("[INFO]   %s/passing.html (or .csv)", manual_dir)
            for sg in stat_groups:
                r = StatGroupResult(sg, self.source, self.name, season)
                r.error = f"Manual directory not found: {manual_dir}"
                results[sg] = r
                total_failed += 1
            return {"provider": self.name, "results": results, "total_ok": 0, "total_failed": total_failed}

        for sg in stat_groups:
            sg = canonical_stat_group(sg)
            result = StatGroupResult(sg, self.source, self.name, season)

            # Look for matching file (HTML preferred, then CSV).
            html_path = manual_dir / f"{sg}.html"
            csv_path = manual_dir / f"{sg}.csv"

            if html_path.exists():
                logger.info("[INFO] Parsing HTML: %s", html_path.name)
                df, error = _parse_html(html_path, sg)
            elif csv_path.exists():
                logger.info("[INFO] Parsing CSV: %s", csv_path.name)
                df, error = _parse_csv(csv_path)
            else:
                result.error = f"No file found: {sg}.html or {sg}.csv in {manual_dir}"
                results[sg] = result
                total_failed += 1
                logger.info("[INFO] No manual file for: %s", sg)
                continue

            if error or df is None:
                result.error = error or "Failed to parse file"
                results[sg] = result
                total_failed += 1
                logger.warning("[FAIL] %s: %s", sg, result.error)
                continue

            try:
                players = _df_to_players(df)

                if len(players) == 0:
                    result.error = "No players after conversion"
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
                logger.info("[OK] %s: %d players from manual file", sg, len(players))

            except Exception as e:
                result.error = str(e)[:300]
                results[sg] = result
                total_failed += 1
                logger.error("[FAIL] %s: %s", sg, str(e)[:200])
                logger.debug(traceback.format_exc())

        logger.info("[INFO] manual_fbref results: %d OK, %d FAILED out of %d", total_ok, total_failed, len(stat_groups))
        return {"provider": self.name, "results": results, "total_ok": total_ok, "total_failed": total_failed}
