#!/usr/bin/env python3
"""
validate_cache.py - REO DataFootball Cache Validator

Validates JSON cache files BEFORE uploading to VPS.
If validation fails, upload is blocked and old cache preserved.

Checks:
  1. JSON files exist in cache dir
  2. At least 1 stat group succeeded (not all failed)
  3. ok == true in JSON
  4. player_count > 0
  5. players array exists and is non-empty
  6. Required fields: player/Player AND team/squad/Squad
  7. No empty/corrupt files
  8. Minimum players per group (per coverage_utils.MIN_PLAYER_COUNT_BY_GROUP)

Phase F: also reads .state/fbref-fetch-state.json to surface SKIP lines for
groups that were skipped today (already fresh) or are in CAPTCHA cooldown,
and FAIL/captcha lines for groups whose last attempt hit a CAPTCHA.
"""

import json
import sys
from pathlib import Path

from providers.coverage_utils import (
    build_columns_manifest,
    build_coverage_summary,
    build_metric_availability,
    canonical_stat_group,
    min_player_count_for,
    REQUIRED_STAT_GROUPS,
)
from providers import fetch_state as _fetch_state


def _has_field(player, field_names):
    """Check if player dict has any of the given field names with a non-empty value."""
    for name in field_names:
        val = player.get(name)
        if val is not None and str(val).strip() != "":
            return True
    return False


def validate_cache(cache_dir, min_players=10, worker_dir=None):
    result = {
        "valid": False,
        "total_files": 0,
        "valid_files": 0,
        "failed_files": 0,
        "total_players": 0,
        "coverage": "unknown",
        "available_stat_groups": [],
        "missing_stat_groups": [],
        "warnings": [],
        "details": [],
        "errors": [],
        "group_lines": [],          # Phase F: pre-formatted [OK]/[FAIL]/[SKIP] lines
        "skipped_stat_groups": {},  # group -> reason
        "failed_stat_groups": {},   # group -> reason
    }

    cache_path = Path(cache_dir)

    if not cache_path.exists():
        result["errors"].append("Cache directory does not exist: %s" % cache_dir)
        return result

    json_files = sorted(cache_path.glob("*.json"))
    json_files = [f for f in json_files if f.name not in ("last_updated.json", "columns-manifest.json", "metrics_coverage.json")]

    if len(json_files) == 0:
        result["errors"].append("No JSON cache files found in: %s" % cache_dir)
        return result

    result["total_files"] = len(json_files)

    # Flexible field names for player, team, minutes
    player_fields = ["player", "Player", "player_name"]
    team_fields = ["team", "squad", "Squad", "Team", "club"]
    minutes_fields = ["minutes", "Min", "90s", "min", "playing_time", "MP"]

    for json_file in json_files:
        detail = {
            "file": json_file.name,
            "status": "unknown",
            "player_count": 0,
            "size_kb": round(json_file.stat().st_size / 1024, 1),
        }

        try:
            if json_file.stat().st_size < 50:
                detail["status"] = "FAIL: file too small"
                result["errors"].append("%s: file too small (%d bytes)" % (json_file.name, json_file.stat().st_size))
                result["failed_files"] += 1
                result["details"].append(detail)
                continue

            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            if not isinstance(data, dict):
                detail["status"] = "FAIL: not a JSON object"
                result["errors"].append("%s: root is not a JSON object" % json_file.name)
                result["failed_files"] += 1
                result["details"].append(detail)
                continue

            # Check ok field (new format from providers)
            if "ok" in data and data["ok"] is False:
                detail["status"] = "FAIL: ok=false"
                result["errors"].append("%s: ok=false (%s)" % (json_file.name, data.get("error", "?")))
                result["failed_files"] += 1
                result["details"].append(detail)
                continue

            # Check player_count
            player_count = data.get("player_count", 0)
            if player_count == 0:
                detail["status"] = "FAIL: player_count = 0"
                result["errors"].append("%s: player_count is 0" % json_file.name)
                result["failed_files"] += 1
                result["details"].append(detail)
                continue

            # Check players array
            players = data.get("players")
            if not isinstance(players, list) or len(players) == 0:
                detail["status"] = "FAIL: players array missing or empty"
                result["errors"].append("%s: no players array" % json_file.name)
                result["failed_files"] += 1
                result["details"].append(detail)
                continue

            stat_group = canonical_stat_group(data.get("stat_group") or json_file.name.replace("fbref-", "").rsplit("-", 2)[0])
            required_min_players = min_player_count_for(stat_group)
            detail["min_player_count"] = required_min_players
            if len(players) < required_min_players:
                detail["status"] = "FAIL: only %d players (min: %d)" % (len(players), required_min_players)
                result["errors"].append("%s: only %d players (min %d for %s)" % (json_file.name, len(players), required_min_players, stat_group))
                result["failed_files"] += 1
                result["details"].append(detail)
                continue

            # Check required fields in first 5 players
            missing = []
            for p in players[:5]:
                if not _has_field(p, player_fields):
                    missing.append("player")
                if not _has_field(p, team_fields):
                    missing.append("team")

            if missing:
                unique_missing = list(set(missing))
                detail["status"] = "FAIL: missing fields: %s" % unique_missing
                result["errors"].append("%s: missing fields %s" % (json_file.name, unique_missing))
                result["failed_files"] += 1
                result["details"].append(detail)
                continue

            # All checks passed
            detail["status"] = "OK"
            detail["player_count"] = len(players)
            detail["source"] = data.get("source", "?")
            detail["stat_group"] = stat_group
            result["valid_files"] += 1
            result["total_players"] += len(players)

        except json.JSONDecodeError:
            detail["status"] = "FAIL: invalid JSON"
            result["errors"].append("%s: invalid JSON" % json_file.name)
            result["failed_files"] += 1
        except Exception as e:
            detail["status"] = "FAIL: %s" % str(e)
            result["errors"].append("%s: %s" % (json_file.name, str(e)))
            result["failed_files"] += 1

        result["details"].append(detail)

    # CRITICAL: At least 1 valid file required
    if result["valid_files"] == 0:
        result["errors"].append("ALL stat groups failed -- nothing to upload")
        result["valid"] = False
    else:
        result["valid"] = True

    # Coverage is a separate concept from validity. Partial cache is valid,
    # but must never be reported as full success.
    season = None
    for detail in result["details"]:
        if detail.get("status") == "OK":
            # filenames are fbref-{group}-{season}.json; fallback is safe.
            parts = detail["file"].replace(".json", "").split("-")
            if len(parts) >= 4:
                season = "-".join(parts[-2:])
            break
    season = season or "2025-26"
    manifest = build_columns_manifest(cache_path, season)
    coverage = build_coverage_summary(cache_path, season)
    metric_availability = build_metric_availability(cache_path, season)
    result["coverage"] = coverage["coverage"]
    result["available_stat_groups"] = coverage["availableStatGroups"]
    result["missing_stat_groups"] = coverage["missingStatGroups"]
    result["columns_manifest"] = str(cache_path / "columns-manifest.json")
    result["metrics_unavailable_column_missing"] = [
        key for key, value in metric_availability.items()
        if value.get("reason") == "unavailable_column_missing"
    ]
    if coverage["coverage"] != "full_or_near_full":
        result["warnings"].append("partial coverage: missing stat groups: %s" % ", ".join(coverage["missingStatGroups"]))

    # ── Phase F: per-group OK/FAIL/SKIP summary lines ────────────────
    state_groups = {}
    if worker_dir:
        try:
            state = _fetch_state.load_state(worker_dir)
            state_groups = (state.get("groups") or {})
        except Exception:
            state_groups = {}

    available_set = set(result["available_stat_groups"])
    group_status_counts = {"ok": 0, "fail": 0, "skip": 0}
    for group in REQUIRED_STAT_GROUPS:
        canonical = canonical_stat_group(group)
        manifest_entry = manifest.get("statGroups", {}).get(canonical, {})
        state_entry = state_groups.get(canonical, {})

        if canonical in available_set:
            players = manifest_entry.get("playerCount") or 0
            line = "[OK]   %-13s %d players" % (canonical, players)
            result["group_lines"].append(line)
            group_status_counts["ok"] += 1
            continue

        # Cooldown / fresh-today come from state — no fresh attempt happened.
        cooldown_until = state_entry.get("cooldownUntil")
        if cooldown_until:
            try:
                from datetime import datetime, timezone
                cooldown_iso = datetime.fromtimestamp(float(cooldown_until), tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            except (TypeError, ValueError, OSError):
                cooldown_iso = str(cooldown_until)[:19]
            line = "[SKIP] %-13s cooldown until %s" % (canonical, cooldown_iso)
            result["group_lines"].append(line)
            result["skipped_stat_groups"][canonical] = "cooldown"
            group_status_counts["skip"] += 1
            continue

        last_failure = state_entry.get("lastFailureReason")
        last_failure_at = state_entry.get("lastFailureAt")
        if last_failure:
            captcha = _fetch_state.looks_like_captcha(last_failure)
            tag = "captcha" if captcha else (last_failure[:60] if last_failure else "failed")
            line = "[FAIL] %-13s %s" % (canonical, tag)
            result["group_lines"].append(line)
            result["failed_stat_groups"][canonical] = last_failure
            group_status_counts["fail"] += 1
            continue

        # Group is missing but the state has no recent attempt info.
        line = "[FAIL] %-13s not fetched" % canonical
        result["group_lines"].append(line)
        result["failed_stat_groups"][canonical] = "not fetched"
        group_status_counts["fail"] += 1

    result["group_status_counts"] = group_status_counts
    return result


def print_summary(result):
    print("")
    print("=" * 55)
    print("  REO Cache Validation Summary")
    print("=" * 55)

    icon = "[OK]" if result["valid"] else "[FAIL]"
    label = "VALID - safe to upload" if result["valid"] else "INVALID - upload BLOCKED"
    print("  Status:  %s %s" % (icon, label))
    print("  Files:   %d/%d valid" % (result["valid_files"], result["total_files"]))
    print("  Players: %d total" % result["total_players"])
    print("  Coverage: %s" % result.get("coverage", "unknown"))
    print("  Available groups: %s" % (", ".join(result.get("available_stat_groups", [])) or "-"))
    print("  Missing groups:   %s" % (", ".join(result.get("missing_stat_groups", [])) or "-"))
    print("")

    # Phase F: per-group OK/FAIL/SKIP block.
    group_lines = result.get("group_lines") or []
    if group_lines:
        print("  Per-group status:")
        for line in group_lines:
            print("    %s" % line)
        counts = result.get("group_status_counts") or {}
        if counts:
            print("    -> %d OK, %d FAIL, %d SKIP" % (counts.get("ok", 0), counts.get("fail", 0), counts.get("skip", 0)))
        print("")

    for d in result["details"]:
        ic = "[OK]" if d["status"] == "OK" else "[FAIL]"
        pc = d.get("player_count", 0)
        sz = d.get("size_kb", 0)
        src = d.get("source", "")
        sg = d.get("stat_group", "")
        extra = ""
        if src:
            extra += " [%s]" % src
        if sg:
            extra += " %s" % sg
        print("  %s %s%s: %s (%d players, %sKB)" % (ic, d["file"], extra, d["status"], pc, sz))

    if result["errors"]:
        print("")
        print("  Errors:")
        for err in result["errors"]:
            print("    - %s" % err)

    if result.get("warnings"):
        print("")
        print("  Warnings:")
        for warn in result["warnings"]:
            print("    [WARN] %s" % warn)

    if result.get("metrics_unavailable_column_missing"):
        print("")
        print("  Metrics with unavailable_column_missing:")
        for metric_key in result["metrics_unavailable_column_missing"]:
            print("    - %s" % metric_key)

    print("")
    print("=" * 55)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate_cache.py <cache_dir> [worker_dir]")
        print("Example: python validate_cache.py .cache/fbref .")
        sys.exit(1)

    cache_dir = sys.argv[1]
    worker_dir = sys.argv[2] if len(sys.argv) >= 3 else str(Path(cache_dir).parent.parent)
    result = validate_cache(cache_dir, worker_dir=worker_dir)
    print_summary(result)
    sys.exit(0 if result["valid"] else 1)
