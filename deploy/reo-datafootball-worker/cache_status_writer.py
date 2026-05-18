"""
cache_status_writer.py — Write/read .cache/reo_cache_status.json

Usage:
  python cache_status_writer.py <mode> <exit_code>     # write after a run
  python cache_status_writer.py --show-report          # display last run report

Modes: daily_safe_sync | manual_bundle_import | upload_only
"""

import json
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
CACHE_DIR = SCRIPT_DIR / ".cache"
STATUS_FILE = CACHE_DIR / "reo_cache_status.json"
FBREF_CACHE = CACHE_DIR / "fbref"
VPS_PATH = "/opt/reo-data-cache/fbref"


def _read_status():
    if STATUS_FILE.exists():
        try:
            return json.loads(STATUS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _read_last_updated():
    lu = FBREF_CACHE / "last_updated.json"
    if lu.exists():
        try:
            return json.loads(lu.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def write_status(mode, exit_code):
    """Write status after a run."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    prev = _read_status()
    lu = _read_last_updated()

    now = datetime.now(timezone.utc)
    started_at = prev.get("_startedAt")
    duration = 0
    if started_at:
        try:
            start = datetime.fromisoformat(started_at)
            duration = int((now - start).total_seconds())
        except Exception:
            pass

    result = "success" if exit_code == 0 else "failed"
    if exit_code == 0 and lu.get("missingStatGroups"):
        result = "partial"

    status = {
        "lastRunAt": now.isoformat(),
        "lastDurationSeconds": duration,
        "lastMode": mode,
        "lastResult": result,
        "availableStatGroups": lu.get("availableStatGroups", []),
        "missingStatGroups": lu.get("missingStatGroups", []),
        "failedStatGroups": lu.get("failedStatGroups", {}),
        "uploadedToVps": exit_code == 0 and mode != "check_status",
        "vpsPath": VPS_PATH,
        "nextRecommendedRun": _recommend_next(now, lu),
    }
    STATUS_FILE.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")


def mark_start():
    """Mark the start time (called implicitly by write_status reading prev)."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    prev = _read_status()
    prev["_startedAt"] = datetime.now(timezone.utc).isoformat()
    STATUS_FILE.write_text(json.dumps(prev, ensure_ascii=False, indent=2), encoding="utf-8")


def _recommend_next(now, lu):
    available = lu.get("availableStatGroups", [])
    missing = lu.get("missingStatGroups", [])
    if len(available) >= 10 and not missing:
        return "Cache complete. Update after new matchday only."
    if missing:
        return "Prepare fbref_manual_bundle.zip for missing groups, then use Import."
    return "Run daily safe sync tomorrow."


def show_report():
    status = _read_status()
    lu = _read_last_updated()

    if not status.get("lastRunAt"):
        print("  No previous run recorded.")
        print("  Run 'Daily safe sync' or 'Import manual bundle' first.")
        return

    last_run = status.get("lastRunAt", "?")
    duration = status.get("lastDurationSeconds", 0)
    mode = status.get("lastMode", "?")
    result = status.get("lastResult", "?")
    available = status.get("availableStatGroups", [])
    missing = status.get("missingStatGroups", [])
    failed = status.get("failedStatGroups", {})
    uploaded = status.get("uploadedToVps", False)

    # Time since last run
    hours_ago = 0
    try:
        last_dt = datetime.fromisoformat(last_run)
        hours_ago = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
    except Exception:
        pass

    print("")
    print("  ===================================================")
    print("  LAST RUN REPORT")
    print("  ===================================================")
    print("")
    print(f"  Last run:      {last_run[:19]} UTC ({hours_ago:.1f}h ago)")
    print(f"  Duration:      {duration}s ({duration // 60}m {duration % 60}s)")
    print(f"  Mode:          {mode}")
    print(f"  Result:        {result}")
    print(f"  Uploaded VPS:  {'Yes' if uploaded else 'No'}")
    print("")
    print(f"  Available groups ({len(available)}/10):")
    if available:
        print(f"    {', '.join(available)}")
    else:
        print("    (none)")
    print(f"  Missing groups ({len(missing)}):")
    if missing:
        print(f"    {', '.join(missing)}")
    else:
        print("    (none - full coverage!)")
    if failed:
        print(f"  Failed groups:")
        for g, reason in failed.items():
            print(f"    {g}: {reason[:60]}")
    print("")

    # Recommendation
    print("  --- RECOMMENDATION ---")
    if hours_ago < 12:
        print("  No need to run now unless you have an important broadcast.")
    elif hours_ago < 24:
        print("  You can run 'Daily safe sync' to refresh available groups.")
    else:
        print("  Recommended: run 'Daily safe sync' to update the cache.")

    if missing:
        print(f"  To complete missing groups ({', '.join(missing)}):")
        print("    1. Save FBref pages from browser")
        print("    2. Put them in .manual/fbref/ (or as fbref_manual_bundle.zip)")
        print("    3. Use option 3: Import manual FBref bundle")

    if not missing:
        print("  Cache is complete! Update only after new matchday results.")

    print("")


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--show-report":
        show_report()
        return

    if len(sys.argv) >= 3:
        mode = sys.argv[1]
        try:
            exit_code = int(sys.argv[2])
        except ValueError:
            exit_code = 1
        write_status(mode, exit_code)
        return

    # If called with no args, just mark start time
    mark_start()


if __name__ == "__main__":
    main()
