"""
REO Data Fabric — Export Player Intel V2 Preview samples.

Reads master summary files from:
    deploy/reo-datafabric/reports/player_intel_master/*.master.summary.json

Copies them (small, ~3 KB each) and writes a small index to:
    public/player-intel-v2-samples/{slug}.master.summary.json
    public/player-intel-v2-samples/index.json

Master full files (1+ MB) are NOT copied — they stay gitignored as runtime data.
The Preview Lab can load full master JSON via paste only.
"""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).parent.parent.parent.parent
MASTER_DIR = (
    Path(__file__).parent.parent / "reports" / "player_intel_master"
)
PUBLIC_OUT = ROOT_DIR / "public" / "player-intel-v2-samples"


def _safe_get(d: Any, *keys: str, default: Any = None) -> Any:
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
    return cur if cur is not None else default


def main() -> int:
    if not MASTER_DIR.exists():
        print(f"  [FAIL] master dir not found: {MASTER_DIR}")
        return 1

    summaries = sorted(MASTER_DIR.glob("*.master.summary.json"))
    if not summaries:
        print(f"  [FAIL] no master summary files in {MASTER_DIR}")
        return 1

    PUBLIC_OUT.mkdir(parents=True, exist_ok=True)

    index_players: list[dict] = []
    for src in summaries:
        slug = src.name.replace(".master.summary.json", "")
        try:
            data = json.loads(src.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  [WARN] cannot parse {src.name}: {e}")
            continue

        # Copy summary as-is
        dst = PUBLIC_OUT / src.name
        shutil.copyfile(src, dst)

        # Build index entry
        index_players.append({
            "slug": slug,
            "summaryFile": src.name,
            "player": data.get("player"),
            "club": data.get("club"),
            "season": data.get("season"),
            "position": data.get("position"),
            "schemaVersion": data.get("schemaVersion"),
            "generatedAt": data.get("generatedAt"),
            "metricsCount": _safe_get(data, "counts", "mergedMetrics"),
            "fotmobMetrics": _safe_get(data, "counts", "fotmobMetrics"),
            "fbrefRawColumns": _safe_get(data, "counts", "fbrefRawColumns"),
            "broadcastCardsCount": _safe_get(data, "counts", "broadcastCards"),
            "broadcastCardsItemTotal": _safe_get(data, "counts", "broadcastCardsItemTotal"),
            "topAvailableCards": data.get("topAvailableCards") or [],
            "qualityWarnings": data.get("qualityWarnings") or [],
            "fbrefGroupsMatched": data.get("fbrefGroupsMatched") or [],
            "fbrefGroupsMissingPlayer": data.get("fbrefGroupsMissingPlayer") or [],
            "sources": data.get("sources") or {},
        })
        print(f"  [OK] {src.name} -> {dst.name}")

    index = {
        "schemaVersion": "player-intel-v2-samples-index-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(index_players),
        "players": index_players,
    }
    index_path = PUBLIC_OUT / "index.json"
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print()
    print("=" * 60)
    print(f"  Exported {len(index_players)} player(s)")
    print(f"  Index: {index_path}")
    print(f"  Out dir: {PUBLIC_OUT}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
