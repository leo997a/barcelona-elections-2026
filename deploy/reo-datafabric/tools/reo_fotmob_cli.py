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

    print(f"  Name:     {report['identity']['name']}")
    print(f"  Club:     {report['current_club']['name']}")
    print(f"  Position: {report['position']['main']} ({report['position']['label']})")
    print(f"  Country:  {report['identity']['nationality']}")
    print(f"  Height:   {report['identity']['height']}")
    print(f"  Foot:     {report['identity']['preferred_foot']}")
    print(f"  Top keys in raw payload: {report['raw_top_keys'][:12]}")
    print()

    if report["season_stats"]:
        print(f"  Season Stats ({len(report['season_stats'])} keys):")
        for key, val in list(report["season_stats"].items())[:15]:
            print(f"    {key}: {val}")
        print()

    if report["recent_matches"]:
        print(f"  Recent Matches ({len(report['recent_matches'])}):")
        for m in report["recent_matches"][:5]:
            rating = m.get("rating") or "-"
            goals = m.get("goals") or 0
            assists = m.get("assists") or 0
            mins = m.get("minutes_played") or "-"
            opp = m.get("opponent") or "?"
            print(f"    vs {opp}: rating={rating}, G={goals}, A={assists}, min={mins}")
        print()

    print(f"  [OK] Full report saved to: reports/player_fotmob/")
    print(f"  [OK] Raw next_data saved to: cache/fotmob/player_next_data/{args.id}.json")


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
