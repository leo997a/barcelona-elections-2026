"""
Coverage helpers for the REO FBref cache.

This module keeps the worker honest:
- `standard` is only one stat group, never full coverage.
- missing groups are represented explicitly in `last_updated.json`.
- column discovery writes `.cache/fbref/columns-manifest.json` from real cache output.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


STAGE_1_GROUPS = ["standard"]
STAGE_2_GROUPS = ["shooting", "passing", "gca"]
STAGE_3_GROUPS = ["defense", "possession", "pass_types"]
STAGE_4_GROUPS = ["playing_time", "misc", "keeper"]
OPTIONAL_GROUPS = ["keeper_adv"]

REQUIRED_STAT_GROUPS = STAGE_1_GROUPS + STAGE_2_GROUPS + STAGE_3_GROUPS + STAGE_4_GROUPS
ALL_SAFE_STAT_GROUPS = REQUIRED_STAT_GROUPS + OPTIONAL_GROUPS

MIN_PLAYER_COUNT_BY_GROUP = {
    "standard": 500,
    "shooting": 500,
    "passing": 500,
    "gca": 500,
    "defense": 500,
    "possession": 500,
    "pass_types": 500,
    "playing_time": 500,
    "misc": 500,
    "keeper": 40,
    "keeper_adv": 40,
}

STAT_GROUP_ALIASES = {
    "standard_stats": "standard",
    "passing_types": "pass_types",
    "playingtime": "playing_time",
    "keepers": "keeper",
    "keepers_adv": "keeper_adv",
}

PARTIAL_WARNING = "Only partial FBref stat coverage is available. Advanced metrics may be unavailable."


def canonical_stat_group(stat_group: str) -> str:
    """Normalize provider-specific stat group names to the public cache contract."""
    sg = str(stat_group or "").strip()
    return STAT_GROUP_ALIASES.get(sg, sg)


def cache_file_for(cache_dir: str | Path, stat_group: str, season: str) -> Path:
    return Path(cache_dir) / f"fbref-{canonical_stat_group(stat_group)}-{season}.json"


def min_player_count_for(stat_group: str) -> int:
    """Minimum row count required before a stat group can be called available."""
    return MIN_PLAYER_COUNT_BY_GROUP.get(canonical_stat_group(stat_group), 500)


def read_cache_group_status(cache_dir: str | Path, season: str) -> dict:
    """
    Read existing cache status without modifying files.

    A group counts as available only when its JSON is ok and has at least one player.
    """
    cache_path = Path(cache_dir)
    status = {}
    for sg in ALL_SAFE_STAT_GROUPS:
        path = cache_file_for(cache_path, sg, season)
        item = {"available": False, "player_count": 0, "file": path.name}
        if path.exists() and path.stat().st_size > 50:
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                players = data.get("players") if isinstance(data, dict) else None
                count = data.get("player_count") if isinstance(data, dict) else 0
                if not isinstance(count, int):
                    count = len(players) if isinstance(players, list) else 0
                min_count = min_player_count_for(sg)
                available = data.get("ok", True) is not False and count >= min_count
                item.update(
                    {
                        "available": available,
                        "player_count": count,
                        "min_player_count": min_count,
                        "availability_reason": "ok" if available else f"below_min_player_count:{count}<{min_count}",
                        "fetched_at": data.get("fetched_at"),
                        "source": data.get("source"),
                    }
                )
            except Exception as exc:  # keep bad files visible, but unavailable
                item["error"] = str(exc)
        status[sg] = item
    return status


def available_stat_groups(cache_dir: str | Path, season: str) -> list[str]:
    status = read_cache_group_status(cache_dir, season)
    return [sg for sg in ALL_SAFE_STAT_GROUPS if status.get(sg, {}).get("available")]


def missing_required_stat_groups(cache_dir: str | Path, season: str) -> list[str]:
    available = set(available_stat_groups(cache_dir, season))
    return [sg for sg in REQUIRED_STAT_GROUPS if sg not in available]


def resolve_stat_groups(
    requested: str | Iterable[str] | None,
    cache_dir: str | Path,
    season: str,
    next_missing_count: int = 1,
) -> list[str]:
    """
    Resolve CLI modes:
    - standard: standard only, unless already available.
    - missing: required groups that are not currently available.
    - next-missing: first N missing required groups, controlled by next_missing_count.
    - all-safe: all required/optional groups that are not currently available.
    - comma list: requested groups, skipping already available groups.
    """
    if requested is None:
        requested_groups = ["missing"]
    elif isinstance(requested, str):
        value = requested.strip()
        if value == "missing":
            return missing_required_stat_groups(cache_dir, season)
        if value == "next-missing":
            limit = max(1, int(next_missing_count or 1))
            return missing_required_stat_groups(cache_dir, season)[:limit]
        if value == "all-safe":
            available = set(available_stat_groups(cache_dir, season))
            return [sg for sg in ALL_SAFE_STAT_GROUPS if sg not in available]
        requested_groups = [part.strip() for part in value.split(",") if part.strip()]
    else:
        requested_groups = [str(part).strip() for part in requested if str(part).strip()]
        if len(requested_groups) == 1 and requested_groups[0] in ("missing", "next-missing", "all-safe"):
            return resolve_stat_groups(requested_groups[0], cache_dir, season, next_missing_count)

    available = set(available_stat_groups(cache_dir, season))
    normalized = [canonical_stat_group(sg) for sg in requested_groups]
    return [sg for sg in normalized if sg not in available]


def build_columns_manifest(cache_dir: str | Path, season: str | None = None) -> dict:
    """Discover columns from existing cache JSON files and save columns-manifest.json."""
    cache_path = Path(cache_dir)
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "season": season,
        "statGroups": {},
    }
    for path in sorted(cache_path.glob("fbref-*.json")):
        if path.name == "last_updated.json":
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            stat_group = canonical_stat_group(data.get("stat_group") or path.name.split("-")[1])
            players = data.get("players") or []
            first_player = players[0] if players else {}
            columns = list(first_player.keys()) if isinstance(first_player, dict) else []
            manifest["statGroups"][stat_group] = {
                "file": path.name,
                "ok": data.get("ok", True) is not False,
                "available": data.get("ok", True) is not False and data.get("player_count", len(players)) >= min_player_count_for(stat_group),
                "playerCount": data.get("player_count", len(players)),
                "minPlayerCount": min_player_count_for(stat_group),
                "source": data.get("source"),
                "columns": columns,
            }
        except Exception as exc:
            manifest["statGroups"][path.name] = {"file": path.name, "ok": False, "error": str(exc), "columns": []}

    out = cache_path / "columns-manifest.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def build_coverage_summary(cache_dir: str | Path, season: str, provider_results: list | None = None) -> dict:
    """Build the public coverage block for last_updated.json."""
    status = read_cache_group_status(cache_dir, season)
    available = [sg for sg in ALL_SAFE_STAT_GROUPS if status.get(sg, {}).get("available")]
    missing = [sg for sg in REQUIRED_STAT_GROUPS if sg not in available]
    optional_missing = [sg for sg in OPTIONAL_GROUPS if sg not in available]
    player_counts = [status[sg].get("player_count", 0) for sg in available]
    failed = {}
    if provider_results:
        for pr in provider_results:
            for sg_name, sg_result in pr.get("results", {}).items():
                sg = canonical_stat_group(sg_name)
                if not getattr(sg_result, "ok", False):
                    failed[sg] = getattr(sg_result, "error", None) or "failed"

    coverage = "full_or_near_full" if not missing else "partial"
    return {
        "ok": len(available) > 0,
        "coverage": coverage,
        "availableStatGroups": available,
        "missingStatGroups": missing,
        "optionalMissingStatGroups": optional_missing,
        "failedStatGroups": failed,
        "playerCount": max(player_counts) if player_counts else 0,
        "warning": None if coverage == "full_or_near_full" else PARTIAL_WARNING,
        "minPlayerCountByGroup": MIN_PLAYER_COUNT_BY_GROUP,
    }


def _load_metrics_coverage(worker_dir: str | Path | None, cache_dir: str | Path) -> dict:
    candidates = []
    if worker_dir:
        candidates.append(Path(worker_dir) / "metrics_coverage.json")
    candidates.append(Path(cache_dir).parent.parent / "metrics_coverage.json")
    for path in candidates:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                return {}
    return {}


def build_metric_availability(cache_dir: str | Path, season: str, worker_dir: str | Path | None = None) -> dict:
    """
    Validate every metric sourceColumn against columns-manifest.

    A metric is available only if:
    - its required stat group is available by minPlayerCountByGroup, and
    - its sourceColumn exists in that group's discovered columns.
    """
    cache_path = Path(cache_dir)
    manifest = build_columns_manifest(cache_path, season)
    coverage = build_coverage_summary(cache_path, season)
    available_groups = set(coverage["availableStatGroups"])
    metrics = _load_metrics_coverage(worker_dir, cache_path)
    output = {}
    for metric_key, metric in metrics.items():
        stat_group = canonical_stat_group(metric.get("statGroup"))
        source_column = metric.get("sourceColumn")
        group_manifest = manifest.get("statGroups", {}).get(stat_group, {})
        columns = set(group_manifest.get("columns", []))
        base = {
            "label": metric.get("label"),
            "labelAr": metric.get("labelAr"),
            "category": metric.get("category"),
            "requiredStatGroup": stat_group,
            "sourceColumn": source_column,
        }
        if stat_group not in available_groups:
            output[metric_key] = {
                **base,
                "status": "unavailable",
                "reason": "stat_group_not_available",
                "availableStatGroups": coverage["availableStatGroups"],
            }
        elif source_column not in columns:
            output[metric_key] = {
                **base,
                "status": "unavailable",
                "reason": "unavailable_column_missing",
                "availableColumns": sorted(columns),
            }
        else:
            output[metric_key] = {**base, "status": "available"}
    return output
