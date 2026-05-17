"""
Base provider interface for FBref data fetching strategies.
All providers must implement this interface.
"""

import json
import os
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path

from .coverage_utils import build_columns_manifest, canonical_stat_group


def get_logger(name):
    """Create ASCII-safe logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s %(message)s", "%H:%M:%S"))
        # Force UTF-8 encoding to avoid cp1256 issues
        import sys
        import io
        if hasattr(sys.stdout, 'buffer'):
            handler.stream = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


class StatGroupResult:
    """Result from fetching a single stat group."""

    def __init__(self, stat_group, source, strategy, season, league_scope="Big 5 European Leagues Combined"):
        self.ok = False
        self.source = source
        self.strategy = strategy
        self.stat_group = stat_group
        self.season = season
        self.league_scope = league_scope
        self.player_count = 0
        self.players = []
        self.error = None
        self.fetched_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self):
        return {
            "ok": self.ok,
            "source": self.source,
            "strategy": self.strategy,
            "stat_group": self.stat_group,
            "season": self.season,
            "league_scope": self.league_scope,
            "player_count": self.player_count,
            "fetched_at": self.fetched_at,
            "players": self.players,
            "error": self.error,
        }

    def save(self, cache_dir):
        """Save result to cache directory as JSON."""
        cache_path = Path(cache_dir)
        cache_path.mkdir(parents=True, exist_ok=True)
        self.stat_group = canonical_stat_group(self.stat_group)
        filename = f"fbref-{self.stat_group}-{self.season}.json"
        filepath = cache_path / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)
        build_columns_manifest(cache_path, self.season)
        return filepath


class BaseProvider(ABC):
    """Abstract base for all FBref data providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identifier."""
        ...

    @property
    @abstractmethod
    def source(self) -> str:
        """Source identifier for cache metadata."""
        ...

    @abstractmethod
    def fetch(self, stat_groups: list, season: str, cache_dir: str) -> dict:
        """
        Fetch player stats for given stat groups.

        Args:
            stat_groups: List of stat group names to fetch
            season: Season string e.g. "2025-26"
            cache_dir: Directory to save cache JSON files

        Returns:
            dict: {
                "provider": str,
                "results": {stat_group: StatGroupResult},
                "total_ok": int,
                "total_failed": int,
            }
        """
        ...

    @abstractmethod
    def supported_stat_groups(self) -> list:
        """Return list of stat groups this provider supports."""
        ...
