"""
Provider selector - orchestrates fetch strategies with fallback logic.

Strategies:
  - soccerdata_first: try soccerdata, fallback to direct_big5
  - direct_big5_first: try direct, fallback to soccerdata
  - soccerdata_only: soccerdata only
  - direct_only: direct Big5 only
  - manual_only: local CSV/JSON only

Usage:
  python -m providers.provider_selector --strategy soccerdata_first --season 2025-26 --cache-dir .cache/fbref
"""

import sys
import json
import argparse
from datetime import datetime, timezone
from pathlib import Path

from .base_provider import get_logger
from .fbref_soccerdata_provider import FBrefSoccerdataProvider
from .fbref_big5_direct_provider import FBrefBig5DirectProvider
from .manual_csv_provider import ManualCSVProvider
from .coverage_utils import (
    ALL_SAFE_STAT_GROUPS,
    REQUIRED_STAT_GROUPS,
    build_columns_manifest,
    build_coverage_summary,
    build_metric_availability,
    canonical_stat_group,
    resolve_stat_groups,
)

logger = get_logger("provider_selector")

# Default stat groups to fetch (covers soccerdata + direct)
DEFAULT_STAT_GROUPS_SOCCERDATA = ["standard", "shooting", "playing_time", "misc", "keeper"]
DEFAULT_STAT_GROUPS_DIRECT = REQUIRED_STAT_GROUPS + ["keeper_adv"]
DEFAULT_STAT_GROUPS_MANUAL = ["standard", "shooting", "passing", "defense", "misc"]

VALID_STRATEGIES = [
    "soccerdata_first",
    "direct_big5_first",
    "soccerdata_only",
    "direct_only",
    "manual_only",
]


def _update_last_updated(cache_dir, provider_results, season="2025-26"):
    """Write last_updated.json with results summary."""
    cache_path = Path(cache_dir)
    cache_path.mkdir(parents=True, exist_ok=True)

    # Always regenerate the manifest from real cached files so column names are
    # discovered from output, not guessed from docs/examples.
    columns_manifest = build_columns_manifest(cache_path)
    inferred_season = _infer_season(provider_results) or season
    coverage = build_coverage_summary(cache_path, inferred_season, provider_results)
    metric_availability = build_metric_availability(cache_path, inferred_season)

    summary = {
        **coverage,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "columnsManifest": str(cache_path / "columns-manifest.json"),
        "metricsAvailability": metric_availability,
        "providers": []
    }

    for pr in provider_results:
        provider_summary = {
            "provider": pr["provider"],
            "total_ok": pr["total_ok"],
            "total_failed": pr["total_failed"],
            "stat_groups": {}
        }
        for sg_name, sg_result in pr["results"].items():
            provider_summary["stat_groups"][sg_name] = {
                "ok": sg_result.ok,
                "player_count": sg_result.player_count,
                "error": sg_result.error,
            }
        summary["providers"].append(provider_summary)

    filepath = cache_path / "last_updated.json"
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    logger.info("[OK] last_updated.json written")
    logger.info("[INFO] Coverage: %s | available=%s | missing=%s",
                coverage["coverage"],
                ",".join(coverage["availableStatGroups"]),
                ",".join(coverage["missingStatGroups"]))
    for sg, info in columns_manifest.get("statGroups", {}).items():
        logger.info("[INFO] Columns manifest %s: %s", sg, ", ".join(info.get("columns", [])))


def _infer_season(provider_results):
    for pr in provider_results:
        for sg_result in pr.get("results", {}).values():
            season = getattr(sg_result, "season", None)
            if season:
                return season
    return None


def run_strategy(strategy, season, cache_dir, headless=True, soccerdata_dir=None, stat_groups_override=None, next_missing_count=1):
    """
    Run the selected fetch strategy.

    Args:
        stat_groups_override: If provided, use these stat groups instead of defaults.

    Returns:
        dict: {
            "strategy": str,
            "total_ok": int,
            "total_failed": int,
            "provider_results": list,
            "success": bool,
        }
    """
    if strategy not in VALID_STRATEGIES:
        logger.error("[FAIL] Unknown strategy: %s", strategy)
        logger.info("[INFO] Valid strategies: %s", ", ".join(VALID_STRATEGIES))
        return {"strategy": strategy, "total_ok": 0, "total_failed": 0, "provider_results": [], "success": False}

    logger.info("=" * 55)
    logger.info("  FBref Smart Agent - Provider Selector")
    logger.info("=" * 55)
    logger.info("[INFO] Strategy: %s", strategy)
    logger.info("[INFO] Season: %s", season)
    logger.info("[INFO] Cache: %s", cache_dir)
    logger.info("")

    provider_results = []
    total_ok = 0

    # Determine stat groups. Defaults are intentionally conservative:
    # fetch only missing required groups instead of re-fetching successful files.
    resolved_groups = resolve_stat_groups(stat_groups_override or "missing", cache_dir, season, next_missing_count)
    sd_groups = [sg for sg in resolved_groups if sg in DEFAULT_STAT_GROUPS_SOCCERDATA]
    direct_groups = [sg for sg in resolved_groups if sg in DEFAULT_STAT_GROUPS_DIRECT]
    manual_groups = [sg for sg in resolved_groups if sg in DEFAULT_STAT_GROUPS_MANUAL]

    logger.info("[INFO] Requested stat groups: %s", ", ".join(stat_groups_override or ["missing"]))
    logger.info("[INFO] Missing/selected stat groups to fetch: %s", ", ".join(resolved_groups) if resolved_groups else "(none)")

    if not resolved_groups:
        _update_last_updated(cache_dir, provider_results, season)
        return {
            "strategy": strategy,
            "total_ok": 0,
            "total_failed": 0,
            "provider_results": provider_results,
            "success": len(build_coverage_summary(cache_dir, season)["availableStatGroups"]) > 0,
        }

    if strategy == "soccerdata_first":
        # Try soccerdata
        logger.info("[INFO] === Phase 1: soccerdata ===")
        sd_provider = FBrefSoccerdataProvider(
            data_dir=soccerdata_dir, headless=headless
        )
        if sd_groups:
            r1 = sd_provider.fetch(sd_groups, season, cache_dir)
            provider_results.append(r1)
            total_ok += r1["total_ok"]
        else:
            r1 = {"total_ok": 0}

        remaining_direct = resolve_stat_groups(direct_groups, cache_dir, season, next_missing_count)
        if remaining_direct:
            logger.info("")
            logger.info("[INFO] === Phase 2: Fallback to direct_big5 ===")
            d_provider = FBrefBig5DirectProvider()
            r2 = d_provider.fetch(remaining_direct, season, cache_dir)
            provider_results.append(r2)
            total_ok += r2["total_ok"]

    elif strategy == "direct_big5_first":
        logger.info("[INFO] === Phase 1: direct_big5 ===")
        d_provider = FBrefBig5DirectProvider()
        if direct_groups:
            r1 = d_provider.fetch(direct_groups, season, cache_dir)
            provider_results.append(r1)
            total_ok += r1["total_ok"]
        else:
            r1 = {"total_ok": 0}

        remaining_sd = resolve_stat_groups(sd_groups, cache_dir, season, next_missing_count)
        if remaining_sd:
            logger.info("")
            logger.info("[INFO] === Phase 2: Fallback to soccerdata ===")
            sd_provider = FBrefSoccerdataProvider(
                data_dir=soccerdata_dir, headless=headless
            )
            r2 = sd_provider.fetch(remaining_sd, season, cache_dir)
            provider_results.append(r2)
            total_ok += r2["total_ok"]

    elif strategy == "soccerdata_only":
        sd_provider = FBrefSoccerdataProvider(
            data_dir=soccerdata_dir, headless=headless
        )
        r = sd_provider.fetch(sd_groups, season, cache_dir)
        provider_results.append(r)
        total_ok += r["total_ok"]

    elif strategy == "direct_only":
        d_provider = FBrefBig5DirectProvider()
        r = d_provider.fetch(direct_groups, season, cache_dir)
        provider_results.append(r)
        total_ok += r["total_ok"]

    elif strategy == "manual_only":
        m_provider = ManualCSVProvider()
        r = m_provider.fetch(manual_groups, season, cache_dir)
        provider_results.append(r)
        total_ok += r["total_ok"]

    # Write last_updated.json
    _update_last_updated(cache_dir, provider_results, season)

    # Summary
    total_failed = sum(pr["total_failed"] for pr in provider_results)
    coverage = build_coverage_summary(cache_dir, season, provider_results)
    success = coverage["ok"]

    logger.info("")
    logger.info("=" * 55)
    logger.info("  Results: %d OK, %d FAILED", total_ok, total_failed)
    if success:
        logger.info("  [OK] Cache ready for validation")
    else:
        logger.info("  [FAIL] All providers failed - no cache to upload")
    logger.info("=" * 55)

    return {
        "strategy": strategy,
        "total_ok": total_ok,
        "total_failed": total_failed,
        "provider_results": provider_results,
        "success": success,
    }


def main():
    parser = argparse.ArgumentParser(description="FBref Smart Agent - Provider Selector")
    parser.add_argument("--strategy", default="soccerdata_first", choices=VALID_STRATEGIES)
    parser.add_argument("--season", default="2025-26")
    parser.add_argument("--cache-dir", default=".cache/fbref")
    parser.add_argument("--headless", default="true", choices=["true", "false"])
    parser.add_argument("--soccerdata-dir", default=None, help="Custom data_dir for soccerdata cache")
    parser.add_argument("--stat-groups", default="missing", help="standard | missing | next-missing | all-safe | comma-separated stat groups")
    parser.add_argument("--next-missing-count", type=int, default=1, help="How many missing groups to fetch in next-missing mode")
    args = parser.parse_args()

    headless = args.headless.lower() == "true"
    stat_groups_override = None
    if args.stat_groups:
        if args.stat_groups in ("missing", "next-missing", "all-safe"):
            stat_groups_override = [args.stat_groups]
        else:
            stat_groups_override = [canonical_stat_group(s.strip()) for s in args.stat_groups.split(",") if s.strip()]

    result = run_strategy(
        strategy=args.strategy,
        season=args.season,
        cache_dir=args.cache_dir,
        headless=headless,
        soccerdata_dir=args.soccerdata_dir,
        stat_groups_override=stat_groups_override,
        next_missing_count=args.next_missing_count,
    )

    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
