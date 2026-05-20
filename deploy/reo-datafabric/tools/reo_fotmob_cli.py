"""
REO Data Fabric — FotMob CLI

Usage:
  python reo_fotmob_cli.py search-player --name "Lamine Yamal"
  python reo_fotmob_cli.py player --id 1273159
  python reo_fotmob_cli.py team --id 8634
  python reo_fotmob_cli.py matches --date 20260518
  python reo_fotmob_cli.py match --id 4193490

Does NOT modify any existing system. Read-only data fetching + local cache.
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent to path so we can import providers
sys.path.insert(0, str(Path(__file__).parent.parent))

from providers.fotmob_provider import FotMobProvider, get_source_health


def print_json(data, max_lines=80):
    """Pretty-print JSON, truncated for readability."""
    if data is None:
        print("  [NO DATA] Request returned None (blocked, timeout, or not found)")
        return
    text = json.dumps(data, ensure_ascii=False, indent=2)
    lines = text.split("\n")
    if len(lines) > max_lines:
        for line in lines[:max_lines]:
            print(line)
        print(f"\n  ... ({len(lines) - max_lines} more lines, full data in cache)")
    else:
        print(text)


def cmd_search_player(args):
    provider = FotMobProvider()
    print(f"\n  Searching FotMob for: '{args.name}'")
    print(f"  Endpoint: apigw.fotmob.com/searchapi/suggest?term={args.name}&lang=en\n")

    raw = provider.search_player(args.name)
    if raw is None:
        print("  [FAIL] SOURCE_SEARCH_FAILED")
        return

    suggestions = FotMobProvider.parse_player_search(raw)
    if not suggestions:
        print("  [INFO] No player suggestions in response.")
        print("  Raw keys:", list(raw.keys()) if isinstance(raw, dict) else "(not dict)")
        return

    print(f"  Found {len(suggestions)} player suggestions:\n")
    for i, s in enumerate(suggestions[:10], 1):
        coach_tag = " [COACH]" if s.get("is_coach") else ""
        print(f"    {i}. {s['name']} (ID: {s['id']}) — {s.get('team_name') or '?'}{coach_tag}")
    print()


def cmd_player(args):
    provider = FotMobProvider()
    print(f"\n  Fetching player data: ID={args.id}")
    print(f"  Method: Next.js _next/data extraction\n")

    bid = provider.get_build_id()
    if bid:
        print(f"  buildId: {bid}")

    name = getattr(args, "name", None)
    report = provider.build_player_report(args.id, name=name)
    if not report:
        print("  [FAIL] Could not fetch player data.")
        return

    s = report["summary"]
    print(f"  Name:     {s.get('name')}")
    print(f"  Club:     {s.get('club')} (ID: {s.get('club_id')})")
    print(f"  Position: {s.get('position') or '?'}")
    print(f"  Country:  {s.get('country')}")
    print(f"  Height:   {s.get('height_cm')}")
    print(f"  Foot:     {s.get('preferred_foot')}")
    print(f"  Age:      {s.get('age')}")
    print(f"  Shirt:    #{s.get('shirt_number')}")
    print(f"  Value:    {s.get('transfer_value')}")
    print(f"  Captain:  {s.get('is_captain')}")
    print(f"  Image:    {report.get('image_url')}")
    print()

    # Top stat card
    tsc = report.get("season_top_stats") or []
    if tsc:
        print(f"  Season Top Stats ({len(tsc)}):")
        for st in tsc[:8]:
            val = st.get("value")
            rank = st.get("percentile_rank")
            rank_str = f" (rank: {round(rank)}%)" if rank is not None else ""
            print(f"    - {st.get('title')}: {val}{rank_str}")
        print()

    # Main league stats
    mls = report.get("main_league_stats") or []
    if mls:
        print(f"  Main League Stats ({len(mls)}):")
        for st in mls[:10]:
            print(f"    - {st.get('title')}: {st.get('value')}")
        print()

    # Recent matches
    rm = report.get("recent_matches") or []
    if rm:
        print(f"  Recent Matches ({len(rm)}):")
        for m in rm[:5]:
            rating = m.get("rating") or "-"
            goals = m.get("goals") or 0
            assists = m.get("assists") or 0
            mins = m.get("minutes_played") or "-"
            opp = m.get("opponent") or "?"
            print(f"    vs {opp}: rating={rating}, G={goals}, A={assists}, min={mins}")
        print()

    # Traits
    traits = report.get("traits") or []
    if traits:
        print(f"  Traits ({len(traits)}):")
        for t in traits[:6]:
            print(f"    - {t.get('title')}: {t.get('value')}")
        print()

    # Career
    ch = report.get("career_history") or []
    if ch:
        print(f"  Career History ({len(ch)} entries):")
        for c in ch[:4]:
            print(f"    - [{c.get('category')}] {c.get('season')} {c.get('team')}: G={c.get('goals')}, A={c.get('assists')}")
        print()

    # Sections summary
    avail = report.get("availableSections") or []
    miss = report.get("missingSections") or []
    print(f"  Sections: {len(avail)} available, {len(miss)} missing")
    if miss:
        print(f"  Missing: {miss}")
    print(f"  Extracted metrics: {len(report.get('extractedMetrics', []))} items")
    print(f"  Raw payload: {report.get('rawPayloadSizeKB')} KB at {report.get('rawPayloadPath')}")
    print()
    print(f"  [OK] Full report saved to: reports/player_fotmob/")


def cmd_team(args):
    provider = FotMobProvider()
    print(f"\n  Fetching team data: ID={args.id}")
    print(f"  Method: Next.js _next/data\n")

    result = provider.get_team_next_data(args.id)
    if not result:
        print("  [FAIL] Could not fetch team data.")
        return

    pp = result.get("pageProps", {})
    data = pp.get("data") or pp
    print(f"  pageProps top keys: {list(pp.keys())[:15]}")
    if isinstance(data, dict):
        print(f"  data top keys: {list(data.keys())[:15]}")
    print()


def cmd_matches(args):
    provider = FotMobProvider()
    print(f"\n  Fetching matches for date: {args.date}")
    print(f"  Method: Next.js _next/data\n")

    result = provider.get_matches_next_data(args.date)
    if not result:
        print("  [FAIL] Could not fetch matches.")
        return

    pp = result.get("pageProps", {})
    print(f"  pageProps keys: {list(pp.keys())[:15]}")
    print()


def cmd_match(args):
    provider = FotMobProvider()
    print(f"\n  Fetching match details: ID={args.id}")
    print(f"  Method: Next.js _next/data\n")

    result = provider.get_match_next_data(args.id)
    if not result:
        print("  [FAIL] Could not fetch match details.")
        return

    pp = result.get("pageProps", {})
    print(f"  pageProps top keys: {list(pp.keys())[:15]}")
    print()


def main():
    parser = argparse.ArgumentParser(description="REO FotMob CLI — Data Fabric")
    subparsers = parser.add_subparsers(dest="command")

    sp = subparsers.add_parser("search-player", help="Search for a player by name")
    sp.add_argument("--name", required=True, help="Player name to search")

    sp = subparsers.add_parser("player", help="Get player data by FotMob ID")
    sp.add_argument("--id", type=int, required=True, help="FotMob player ID")
    sp.add_argument("--name", type=str, default=None, help="Player name (for slug generation)")

    sp = subparsers.add_parser("team", help="Get team data by FotMob ID")
    sp.add_argument("--id", type=int, required=True, help="FotMob team ID")

    sp = subparsers.add_parser("matches", help="Get matches for a date")
    sp.add_argument("--date", required=True, help="Date in YYYYMMDD format")

    sp = subparsers.add_parser("match", help="Get match details by ID")
    sp.add_argument("--id", type=int, required=True, help="FotMob match ID")

    sp = subparsers.add_parser("health", help="Show source health status")

    args = parser.parse_args()

    if args.command == "search-player":
        cmd_search_player(args)
    elif args.command == "player":
        cmd_player(args)
    elif args.command == "team":
        cmd_team(args)
    elif args.command == "matches":
        cmd_matches(args)
    elif args.command == "match":
        cmd_match(args)
    elif args.command == "health":
        print(json.dumps(get_source_health(), indent=2))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
