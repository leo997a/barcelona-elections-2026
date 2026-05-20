"""
REO Data Fabric — Player Intel Public Registry Builder

Scans all master profiles and exports broadcast-ready JSON files + index
to public/player-intel-v2-samples/ for the frontend to consume dynamically.

Usage:
  python deploy/reo-datafabric/tools/build_player_intel_public_registry.py

After running, do `npm run build` to include new files in dist/.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MASTER_DIR = Path(__file__).parent.parent / "reports" / "player_intel_master"
PUBLIC_OUT = Path(__file__).parent.parent.parent.parent / "public" / "player-intel-v2-samples"


def _safe(d: Any, *keys: str, default: Any = None) -> Any:
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
    return cur if cur is not None else default


def _build_broadcast(raw: dict) -> dict:
    """Extract broadcast-ready subset from full master profile."""
    fotmob_full = _safe(raw, "fotmob", "fullProfile") or {}
    images = fotmob_full.get("images") if isinstance(fotmob_full, dict) else None
    main_league = fotmob_full.get("mainLeague") if isinstance(fotmob_full, dict) else None

    qr = raw.get("qualityReport") or {}
    return {
        "schemaVersion": raw.get("schemaVersion"),
        "generatedAt": raw.get("generatedAt"),
        "player": raw.get("player"),
        "identity": raw.get("identity"),
        "sourceCoverage": raw.get("sourceCoverage"),
        "broadcastCards": raw.get("broadcastCards"),
        "canonicalMetrics": raw.get("canonicalMetrics"),
        "qualityReport": {
            k: v for k, v in qr.items()
            if k in (
                "fotmobMetricsCount", "fbrefRawColumnsCount", "mergedMetricsCount",
                "canonicalMetricsCount", "broadcastCardsCount", "broadcastCardsItemTotal",
                "warnings", "sourceConflicts", "fbrefGroupsMatched", "fbrefGroupsMissingPlayer",
            )
        },
        "images": images,
        "mainLeague": main_league,
    }


def _build_index_entry(slug: str, broadcast: dict) -> dict:
    player = broadcast.get("player") or {}
    sc = broadcast.get("sourceCoverage") or {}
    qr = broadcast.get("qualityReport") or {}
    sources = []
    if sc.get("fotmob"):
        sources.append("fotmob")
    if sc.get("fbref"):
        sources.append("fbref")
    cards = broadcast.get("broadcastCards") or {}
    return {
        "id": slug,
        "name": player.get("name") or slug,
        "club": player.get("club") or "",
        "season": player.get("season") or "",
        "position": player.get("position") or "",
        "file": f"{slug}.broadcast.json",
        "sources": sources,
        "metricsCount": qr.get("mergedMetricsCount") or 0,
        "cardsCount": len(cards),
    }


def main() -> int:
    if not MASTER_DIR.exists():
        print(f"  [FAIL] master dir not found: {MASTER_DIR}")
        return 1

    masters = sorted(MASTER_DIR.glob("*.master.json"))
    if not masters:
        print(f"  [FAIL] no master files in {MASTER_DIR}")
        return 1

    PUBLIC_OUT.mkdir(parents=True, exist_ok=True)
    index_players: list[dict] = []

    for p in masters:
        slug = p.name.replace(".master.json", "")
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  [WARN] cannot parse {p.name}: {e}")
            continue

        broadcast = _build_broadcast(raw)
        out_path = PUBLIC_OUT / f"{slug}.broadcast.json"
        text = json.dumps(broadcast, ensure_ascii=False, indent=2)
        out_path.write_text(text, encoding="utf-8")

        entry = _build_index_entry(slug, broadcast)
        index_players.append(entry)
        print(f"  [OK] {out_path.name} ({len(text) // 1024} KB) — {entry['name']}")

    # Write index
    index = {
        "schemaVersion": "player-intel-registry-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "playerCount": len(index_players),
        "players": index_players,
    }
    index_path = PUBLIC_OUT / "index.json"
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print("=" * 60)
    print(f"  Registry: {len(index_players)} player(s)")
    print(f"  Index: {index_path}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
