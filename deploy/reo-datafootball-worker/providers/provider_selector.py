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
from .manual_fbref_provider import ManualFBrefProvider
from .coverage_utils import (
    ALL_SAFE_STAT_GROUPS,
    REQUIRED_STAT_GROUPS,
    build_columns_manifest,
    build_coverage_summary,
    build_metric_availability,
    canonical_stat_group,
    resolve_stat_groups,
)
from . import fetch_state as _fetch_state

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
    "manual_fbref",
]


def _update_last_updated(cache_dir, provider_results, season="2025-26", *, fetch_state_obj=None, skipped_groups=None):
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

    # Phase F: surface skipped groups + checkpoint state in last_updated.json.
    # Frontend consumers (Editor.tsx, PlayerStatsRenderer.tsx, lab assistant)
    # only read availableStatGroups / missingStatGroups / coverage; new fields
    # here are purely additive.
    if skipped_groups:
        summary["skippedStatGroups"] = dict(skipped_groups)
    if fetch_state_obj is not None:
        try:
            summary["fetchState"] = _fetch_state.summarize_state(fetch_state_obj)
        except Exception as exc:
            logger.warning("[WARN] Failed to summarize fetch state: %s", exc)

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
    if skipped_groups:
        logger.info("[INFO] Skipped (this run): %s",
                    ", ".join(f"{g}:{r}" for g, r in skipped_groups.items()))
    for sg, info in columns_manifest.get("statGroups", {}).items():
        logger.info("[INFO] Columns manifest %s: %s", sg, ", ".join(info.get("columns", [])))


def _infer_season(provider_results):
    for pr in provider_results:
        for sg_result in pr.get("results", {}).values():
            season = getattr(sg_result, "season", None)
            if season:
                return season
    return None


def run_strategy(
    strategy,
    season,
    cache_dir,
    headless=True,
    soccerdata_dir=None,
    stat_groups_override=None,
    next_missing_count=1,
    *,
    worker_dir=None,
    force_refresh=False,
):
    """
    Run the selected fetch strategy.

    Args:
        stat_groups_override: If provided, use these stat groups instead of defaults.
        worker_dir: Root directory of the worker (where .state/ lives). Defaults
            to the parent of cache_dir.
        force_refresh: If True, ignore "already fresh today" and cooldown checks.

    Returns:
        dict: {
            "strategy": str,
            "total_ok": int,
            "total_failed": int,
            "provider_results": list,
            "success": bool,
            "skipped": dict[str, str],
        }
    """
    if strategy not in VALID_STRATEGIES:
        logger.error("[FAIL] Unknown strategy: %s", strategy)
        logger.info("[INFO] Valid strategies: %s", ", ".join(VALID_STRATEGIES))
        return {
            "strategy": strategy,
            "total_ok": 0,
            "total_failed": 0,
            "provider_results": [],
            "success": False,
            "skipped": {},
        }

    # Resolve worker_dir for state file. cache_dir = <worker_dir>/.cache/fbref by convention.
    if worker_dir is None:
        worker_dir = str(Path(cache_dir).parent.parent)
    state = _fetch_state.load_state(worker_dir)

    logger.info("=" * 55)
    logger.info("  FBref Smart Agent - Provider Selector")
    logger.info("=" * 55)
    logger.info("[INFO] Strategy: %s", strategy)
    logger.info("[INFO] Season: %s", season)
    logger.info("[INFO] Cache: %s", cache_dir)
    logger.info("[INFO] Worker dir: %s", worker_dir)
    logger.info("[INFO] Force refresh: %s", force_refresh)
    logger.info("")

    provider_results = []
    total_ok = 0

    # Determine stat groups. Defaults are intentionally conservative:
    # fetch only missing required groups instead of re-fetching successful files.
    resolved_groups = resolve_stat_groups(stat_groups_override or "missing", cache_dir, season, next_missing_count)

    # Phase F: filter resolved groups through the checkpoint state.
    # - groups that succeeded today are skipped (unless force_refresh),
    # - groups in CAPTCHA cooldown are skipped (unless force_refresh).
    decisions = _fetch_state.decide_groups(state, resolved_groups, force_refresh=force_refresh)
    fetchable_groups = [d.group for d in decisions if d.fetch]
    skipped: dict[str, str] = {d.group: d.reason for d in decisions if not d.fetch}

    if skipped:
        logger.info("[INFO] Skipped by checkpoint: %s",
                    ", ".join(f"{g}:{r}" for g, r in skipped.items()))

    sd_groups = [sg for sg in fetchable_groups if sg in DEFAULT_STAT_GROUPS_SOCCERDATA]
    direct_groups = [sg for sg in fetchable_groups if sg in DEFAULT_STAT_GROUPS_DIRECT]
    manual_groups = [sg for sg in fetchable_groups if sg in DEFAULT_STAT_GROUPS_MANUAL]

    logger.info("[INFO] Requested stat groups: %s", ", ".join(stat_groups_override or ["missing"]))
    logger.info("[INFO] Missing/selected groups: %s", ", ".join(resolved_groups) if resolved_groups else "(none)")
    logger.info("[INFO] Will fetch this run:    %s", ", ".join(fetchable_groups) if fetchable_groups else "(none)")

    if not fetchable_groups:
        # Nothing to fetch (either everything is fresh, in cooldown, or already cached).
        _fetch_state.annotate_run(state, strategy=strategy)
        _fetch_state.save_state(worker_dir, state)
        _update_last_updated(cache_dir, provider_results, season,
                             fetch_state_obj=state, skipped_groups=skipped)
        coverage = build_coverage_summary(cache_dir, season)
        return {
            "strategy": strategy,
            "total_ok": 0,
            "total_failed": 0,
            "provider_results": provider_results,
            "success": len(coverage["availableStatGroups"]) > 0,
            "skipped": skipped,
        }

    # Mark every group we are about to attempt as "attempted" so the state
    # reflects the run even if a provider crashes mid-way.
    for group in fetchable_groups:
        _fetch_state.record_attempt(state, group)

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
            _record_results_to_state(state, r1)
        else:
            r1 = {"total_ok": 0}

        # After Phase 1, anything still missing AND in the direct provider's
        # supported set gets a second attempt via direct fetcher.
        remaining_direct = [sg for sg in resolve_stat_groups(direct_groups, cache_dir, season, next_missing_count)
                            if sg not in skipped]
        if remaining_direct:
            logger.info("")
            logger.info("[INFO] === Phase 2: Fallback to direct_big5 ===")
            d_provider = FBrefBig5DirectProvider()
            r2 = d_provider.fetch(remaining_direct, season, cache_dir)
            provider_results.append(r2)
            total_ok += r2["total_ok"]
            _record_results_to_state(state, r2)

    elif strategy == "direct_big5_first":
        logger.info("[INFO] === Phase 1: direct_big5 ===")
        d_provider = FBrefBig5DirectProvider()
        if direct_groups:
            r1 = d_provider.fetch(direct_groups, season, cache_dir)
            provider_results.append(r1)
            total_ok += r1["total_ok"]
            _record_results_to_state(state, r1)
        else:
            r1 = {"total_ok": 0}

        remaining_sd = [sg for sg in resolve_stat_groups(sd_groups, cache_dir, season, next_missing_count)
                        if sg not in skipped]
        if remaining_sd:
            logger.info("")
            logger.info("[INFO] === Phase 2: Fallback to soccerdata ===")
            sd_provider = FBrefSoccerdataProvider(
                data_dir=soccerdata_dir, headless=headless
            )
            r2 = sd_provider.fetch(remaining_sd, season, cache_dir)
            provider_results.append(r2)
            total_ok += r2["total_ok"]
            _record_results_to_state(state, r2)

    elif strategy == "soccerdata_only":
        sd_provider = FBrefSoccerdataProvider(
            data_dir=soccerdata_dir, headless=headless
        )
        r = sd_provider.fetch(sd_groups, season, cache_dir)
        provider_results.append(r)
        total_ok += r["total_ok"]
        _record_results_to_state(state, r)

    elif strategy == "direct_only":
        d_provider = FBrefBig5DirectProvider()
        r = d_provider.fetch(direct_groups, season, cache_dir)
        provider_results.append(r)
        total_ok += r["total_ok"]
        _record_results_to_state(state, r)

    elif strategy == "manual_only":
        m_provider = ManualCSVProvider()
        r = m_provider.fetch(manual_groups, season, cache_dir)
        provider_results.append(r)
        total_ok += r["total_ok"]
        _record_results_to_state(state, r)

    elif strategy == "manual_fbref":
        mf_provider = ManualFBrefProvider()
        r = mf_provider.fetch(fetchable_groups, season, cache_dir)
        provider_results.append(r)
        total_ok += r["total_ok"]
        _record_results_to_state(state, r)

    # Finalize state, then write last_updated.json with state + skipped info.
    _fetch_state.annotate_run(state, strategy=strategy)
    _fetch_state.save_state(worker_dir, state)
    _update_last_updated(cache_dir, provider_results, season,
                         fetch_state_obj=state, skipped_groups=skipped)

    # Summary
    total_failed = sum(pr["total_failed"] for pr in provider_results)
    coverage = build_coverage_summary(cache_dir, season, provider_results)
    success = coverage["ok"]

    logger.info("")
    logger.info("=" * 55)
    logger.info("  Results: %d OK, %d FAILED, %d SKIPPED",
                total_ok, total_failed, len(skipped))
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
        "skipped": skipped,
    }


def _record_results_to_state(state, provider_result):
    """Record per-group success/failure into the checkpoint state."""
    for sg_name, sg_result in (provider_result.get("results") or {}).items():
        group = canonical_stat_group(sg_name)
        if getattr(sg_result, "ok", False):
            _fetch_state.record_success(
                state,
                group,
                source=getattr(sg_result, "source", None),
                player_count=getattr(sg_result, "player_count", 0) or 0,
            )
        else:
            _fetch_state.record_failure(
                state,
                group,
                reason=getattr(sg_result, "error", None),
            )


def main():
    parser = argparse.ArgumentParser(description="FBref Smart Agent - Provider Selector")
    parser.add_argument("--strategy", default="soccerdata_first", choices=VALID_STRATEGIES)
    parser.add_argument("--season", default="2025-26")
    parser.add_argument("--cache-dir", default=".cache/fbref")
    parser.add_argument("--headless", default="true", choices=["true", "false"])
    parser.add_argument("--soccerdata-dir", default=None, help="Custom data_dir for soccerdata cache")
    parser.add_argument("--stat-groups", default="missing", help="standard | missing | next-missing | all-safe | comma-separated stat groups")
    parser.add_argument("--next-missing-count", type=int, default=1, help="How many missing groups to fetch in next-missing mode")
    parser.add_argument("--worker-dir", default=None, help="Worker root (where .state/ lives). Defaults to parent of cache-dir's parent.")
    parser.add_argument("--force-refresh", action="store_true", help="Ignore fresh-today and cooldown checks; refetch every requested group.")
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
        worker_dir=args.worker_dir,
        force_refresh=args.force_refresh,
    )

    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
