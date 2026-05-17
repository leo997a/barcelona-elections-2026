"""
Manual CSV/JSON provider - emergency fallback.
Reads local CSV or JSON files from .manual/player_stats/.
Converts to standard cache format.
"""

import json
import csv
import traceback
from pathlib import Path

import pandas as pd

from .base_provider import BaseProvider, StatGroupResult, get_logger

logger = get_logger("manual_csv_provider")

MANUAL_DIR_NAME = ".manual/player_stats"


class ManualCSVProvider(BaseProvider):
    """Read pre-existing CSV/JSON stats files as a fallback provider."""

    def __init__(self, manual_dir=None):
        self._manual_dir = manual_dir

    @property
    def name(self):
        return "manual_csv"

    @property
    def source(self):
        return "manual_csv"

    def supported_stat_groups(self):
        return ["standard", "shooting", "passing", "defense", "misc", "playing_time", "keeper"]

    def fetch(self, stat_groups, season, cache_dir):
        results = {}
        total_ok = 0
        total_failed = 0

        manual_dir = Path(self._manual_dir) if self._manual_dir else Path(MANUAL_DIR_NAME)

        if not manual_dir.exists():
            logger.warning("[WARN] Manual directory not found: %s", manual_dir)
            for sg in stat_groups:
                r = StatGroupResult(sg, self.source, self.name, season)
                r.error = f"Manual directory not found: {manual_dir}"
                results[sg] = r
                total_failed += 1
            return {"provider": self.name, "results": results, "total_ok": 0, "total_failed": total_failed}

        for sg in stat_groups:
            result = StatGroupResult(sg, self.source, self.name, season)

            # Look for matching file
            candidates = [
                manual_dir / f"{sg}.json",
                manual_dir / f"{sg}.csv",
                manual_dir / f"fbref-{sg}-{season}.json",
                manual_dir / f"fbref-{sg}-{season}.csv",
            ]

            found = None
            for c in candidates:
                if c.exists():
                    found = c
                    break

            if found is None:
                result.error = f"No file found for {sg}"
                results[sg] = result
                total_failed += 1
                logger.info("[INFO] No manual file for: %s", sg)
                continue

            try:
                if found.suffix == ".json":
                    with open(found, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if isinstance(data, list):
                        players = data
                    elif isinstance(data, dict) and "players" in data:
                        players = data["players"]
                    else:
                        players = [data]
                elif found.suffix == ".csv":
                    df = pd.read_csv(found, encoding="utf-8")
                    players = df.to_dict(orient="records")
                else:
                    result.error = f"Unsupported file type: {found.suffix}"
                    results[sg] = result
                    total_failed += 1
                    continue

                if len(players) == 0:
                    result.error = "Empty file"
                    results[sg] = result
                    total_failed += 1
                    logger.warning("[FAIL] %s: empty file %s", sg, found.name)
                    continue

                result.ok = True
                result.players = players
                result.player_count = len(players)
                result.save(cache_dir)
                results[sg] = result
                total_ok += 1
                logger.info("[OK] %s: %d players from %s", sg, len(players), found.name)

            except Exception as e:
                result.error = str(e)
                results[sg] = result
                total_failed += 1
                logger.error("[FAIL] %s: %s", sg, str(e))

        return {"provider": self.name, "results": results, "total_ok": total_ok, "total_failed": total_failed}
