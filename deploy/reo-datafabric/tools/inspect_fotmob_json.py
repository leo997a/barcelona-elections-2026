"""
REO Data Fabric — FotMob raw JSON inspector.

Reads a cached _next/data JSON for a player and prints:
  - top-level keys
  - pageProps keys
  - pageProps.data keys with type/size hints
  - keyword search (recursive) for: rating, stats, mainLeague, recentMatches,
    matchLogs, career, season, minutes, goals, assists, xG, xA, shots,
    position, team, league
  - which sections are populated vs empty

Does NOT modify any file. Pure read-only analysis.

Usage:
  python deploy/reo-datafabric/tools/inspect_fotmob_json.py --player-id 1467236
  python deploy/reo-datafabric/tools/inspect_fotmob_json.py --file path/to/raw.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

DEFAULT_CACHE = (
    Path(__file__).parent.parent / "cache" / "fotmob" / "player_next_data"
)

KEYWORDS = {
    "rating", "ratingProps", "stats", "mainLeague", "recentMatches",
    "matchLogs", "career", "careerHistory", "season", "statSeasons",
    "minutesPlayed", "goals", "assists", "xG", "xA", "shots", "shotmap",
    "position", "primaryPosition", "primaryTeam", "team", "league",
    "topStatCard", "statsSection", "marketValues", "traits", "trophies",
    "playerInformation",
}


def _walk(obj: Any, path: str = "", out: dict[str, list[str]] | None = None) -> dict[str, list[str]]:
    """Walk dict/list recursively and collect paths where keys match KEYWORDS."""
    if out is None:
        out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            full = f"{path}.{k}" if path else k
            klow = k.lower()
            for kw in KEYWORDS:
                if klow == kw.lower() or kw.lower() == klow:
                    out.setdefault(k, []).append(full)
                    break
            _walk(v, full, out)
    elif isinstance(obj, list):
        # Sample first item only to avoid blowing up on 60-match arrays
        if obj and isinstance(obj[0], (dict, list)):
            _walk(obj[0], f"{path}[0]", out)
    return out


def _describe_value(v: Any) -> str:
    if v is None:
        return "None"
    if isinstance(v, bool):
        return f"bool={v}"
    if isinstance(v, (int, float)):
        return f"{type(v).__name__}={v}"
    if isinstance(v, str):
        s = v[:60].replace("\n", " ")
        return f"str(len={len(v)}) = {s!r}"
    if isinstance(v, list):
        return f"list(len={len(v)})"
    if isinstance(v, dict):
        return f"dict({len(v)} keys)"
    return type(v).__name__


def _find_player_file(player_id: int | None, file_arg: str | None) -> Path:
    if file_arg:
        p = Path(file_arg)
        if not p.exists():
            print(f"[FAIL] File not found: {p}")
            sys.exit(1)
        return p
    if player_id:
        p = DEFAULT_CACHE / f"{player_id}.json"
        if not p.exists():
            print(f"[FAIL] Cached player not found: {p}")
            print(f"       Run first: reo_fotmob_cli.py player --id {player_id} --name 'Name'")
            sys.exit(1)
        return p
    print("[FAIL] Provide either --player-id or --file")
    sys.exit(1)


def inspect(path: Path) -> None:
    print()
    print("=" * 70)
    print(f"  FotMob raw JSON inspector: {path.name}")
    print(f"  Size: {path.stat().st_size // 1024} KB")
    print("=" * 70)
    print()

    raw = json.loads(path.read_text(encoding="utf-8"))

    # Top-level
    print("--- Top-level keys ---")
    print(f"  {list(raw.keys())}")
    print()

    pp = raw.get("pageProps")
    if not isinstance(pp, dict):
        print("  [FAIL] pageProps is not a dict")
        return

    print("--- pageProps keys ---")
    print(f"  {list(pp.keys())}")
    print()

    data = pp.get("data")
    if not isinstance(data, dict):
        print("  [WARN] pageProps.data is not a dict")
        return

    print(f"--- pageProps.data keys ({len(data)}) ---")
    populated = []
    empty = []
    for k, v in data.items():
        desc = _describe_value(v)
        flag = "  "
        if v is None or (isinstance(v, (list, dict, str)) and len(v) == 0):
            flag = "  [EMPTY] "
            empty.append(k)
        else:
            populated.append(k)
        print(f"{flag}{k}: {desc}")
    print()

    print("--- Sections summary ---")
    print(f"  Populated ({len(populated)}): {populated}")
    print(f"  Empty/None ({len(empty)}): {empty}")
    print()

    # Keyword search
    print("--- Keyword paths (first 3 each) ---")
    matches = _walk(raw)
    for k in sorted(matches.keys()):
        paths = matches[k]
        # Only show paths under pageProps.data (skip translations)
        relevant = [p for p in paths if p.startswith("pageProps.data") or p.startswith("pageProps.fallback")]
        if not relevant:
            continue
        print(f"  {k} ({len(relevant)} matches):")
        for p in relevant[:3]:
            print(f"    {p}")
    print()

    # Sample useful sections
    _sample_main_league(data)
    _sample_first_season_stats(data)
    _sample_recent_matches(data)
    _sample_career(data)
    _sample_traits(data)


def _sample_main_league(data: dict) -> None:
    ml = data.get("mainLeague")
    if not isinstance(ml, dict):
        return
    stats = ml.get("stats", [])
    print("--- mainLeague ---")
    print(f"  leagueId: {ml.get('leagueId')}, leagueName: {ml.get('leagueName')}, season: {ml.get('season')}")
    if isinstance(stats, list):
        print(f"  stats: {len(stats)} blocks")
        for s in stats[:8]:
            if isinstance(s, dict):
                print(f"    - {s.get('title')}: {s.get('value')}")
    print()


def _sample_first_season_stats(data: dict) -> None:
    fss = data.get("firstSeasonStats")
    if not isinstance(fss, dict):
        return
    print("--- firstSeasonStats ---")
    tsc = fss.get("topStatCard")
    if isinstance(tsc, dict):
        items = tsc.get("items", [])
        print(f"  topStatCard.items ({len(items)}):")
        for it in items[:10]:
            if isinstance(it, dict):
                print(f"    - {it.get('title')}: {it.get('statValue')} (per90={it.get('per90')}, rank={it.get('percentileRank')})")
    print()


def _sample_recent_matches(data: dict) -> None:
    rm = data.get("recentMatches")
    if not isinstance(rm, list) or not rm:
        return
    print(f"--- recentMatches (showing 5 of {len(rm)}) ---")
    for m in rm[:5]:
        if not isinstance(m, dict):
            continue
        rating = m.get("ratingProps", {}).get("rating") if isinstance(m.get("ratingProps"), dict) else None
        opp = m.get("opponentTeamName")
        date = m.get("matchDate", {}).get("utcTime") if isinstance(m.get("matchDate"), dict) else m.get("matchDate")
        print(f"  vs {opp}: G={m.get('goals')}, A={m.get('assists')}, min={m.get('minutesPlayed')}, rating={rating} ({date[:10] if date else '?'})")
    print()


def _sample_career(data: dict) -> None:
    ch = data.get("careerHistory")
    if not isinstance(ch, dict):
        return
    items = ch.get("careerItems")
    if not isinstance(items, dict):
        return
    print("--- careerHistory ---")
    for cat, content in items.items():
        if isinstance(content, dict):
            entries = content.get("seasonEntries", [])
            print(f"  {cat}: {len(entries) if isinstance(entries, list) else '?'} season entries")
    print()


def _sample_traits(data: dict) -> None:
    tr = data.get("traits")
    if not isinstance(tr, dict):
        return
    items = tr.get("items", [])
    if not isinstance(items, list):
        return
    print(f"--- traits ({len(items)}) ---")
    for t in items[:8]:
        if isinstance(t, dict):
            print(f"  - {t.get('title')}: {t.get('value')}")
    print()


def main() -> None:
    parser = argparse.ArgumentParser(description="FotMob raw JSON inspector")
    parser.add_argument("--player-id", type=int, default=None, help="Player ID with cached JSON")
    parser.add_argument("--file", type=str, default=None, help="Path to raw JSON file")
    args = parser.parse_args()

    path = _find_player_file(args.player_id, args.file)
    inspect(path)


if __name__ == "__main__":
    main()
