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
    print(f"  Endpoint: /api/search/suggest?term={args.name}\n")

    result = provider.search_player(args.name)
    if not result:
        print("  [FAIL] No results or source blocked.")
        return

    # Extract player suggestions
    suggestions = result.get("squadMemberSuggestions") or result.get("suggestions") or []
    if isinstance(suggestions, list) and suggestions:
        print(f"  Found {len(suggestions)} player suggestions:\n")
        for i, s in enumerate(suggestions[:10], 1):
            name = s.get("name") or s.get("title") or "?"
            pid = s.get("id") or s.get("playerId") or "?"
            team = s.get("teamName") or s.get("subtitle") or ""
            print(f"    {i}. {name} (ID: {pid}) — {team}")
        print()
    else:
        print("  Raw response:")
        print_json(result)


def cmd_player(args):
    provider = FotMobProvider()
    print(f"\n  Fetching player data: ID={args.id}")
    print(f"  Endpoint: /api/playerData?id={args.id}\n")

    # Build full report
    report = provider.build_player_report(args.id)
    if not report:
        print("  [FAIL] Could not fetch player data.")
        return

    print(f"  Name:     {report['identity']['name']}")
    print(f"  Club:     {report['current_club']['name']}")
    print(f"  Position: {report['position']['main']} ({report['position']['label']})")
    print(f"  Country:  {report['identity']['nationality']}")
    print(f"  Height:   {report['identity']['height']}")
    print(f"  Foot:     {report['identity']['preferred_foot']}")
    print()

    if report["season_stats"]:
        print("  Season Stats:")
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


def cmd_team(args):
    provider = FotMobProvider()
    print(f"\n  Fetching team data: ID={args.id}")
    print(f"  Endpoint: /api/teams?id={args.id}\n")

    result = provider.get_team(args.id)
    if not result:
        print("  [FAIL] Could not fetch team data.")
        return

    name = result.get("details", {}).get("name") or result.get("name") or "?"
    print(f"  Team: {name}")

    squad = result.get("squad")
    if isinstance(squad, list):
        print(f"  Squad sections: {len(squad)}")
        for section in squad[:4]:
            title = section.get("title", "?")
            members = section.get("members", [])
            print(f"    {title}: {len(members)} players")
            for p in members[:5]:
                pname = p.get("name") or "?"
                pid = p.get("id") or "?"
                print(f"      - {pname} (ID: {pid})")
    print()


def cmd_matches(args):
    provider = FotMobProvider()
    print(f"\n  Fetching matches for date: {args.date}")
    print(f"  Endpoint: /api/matches?date={args.date}\n")

    result = provider.get_matches(args.date)
    if not result:
        print("  [FAIL] Could not fetch matches.")
        return

    leagues = result.get("leagues") or []
    print(f"  Leagues with matches: {len(leagues)}")
    for league in leagues[:8]:
        lname = league.get("name") or "?"
        matches = league.get("matches") or []
        print(f"    {lname}: {len(matches)} matches")
        for m in matches[:3]:
            home = m.get("home", {}).get("name") or "?"
            away = m.get("away", {}).get("name") or "?"
            mid = m.get("id") or "?"
            status = m.get("status", {}).get("reason", {}).get("short") or m.get("status", {}).get("scoreStr") or ""
            print(f"      {home} vs {away} (ID: {mid}) {status}")
    print()


def cmd_match(args):
    provider = FotMobProvider()
    print(f"\n  Fetching match details: ID={args.id}")
    print(f"  Endpoint: /api/matchDetails?matchId={args.id}\n")

    result = provider.get_match_details(args.id)
    if not result:
        print("  [FAIL] Could not fetch match details.")
        return

    general = result.get("general") or result.get("header") or {}
    home = general.get("homeTeam", {}).get("name") or result.get("home", {}).get("name") or "?"
    away = general.get("awayTeam", {}).get("name") or result.get("away", {}).get("name") or "?"
    print(f"  Match: {home} vs {away}")
    print(f"  Top-level keys: {list(result.keys())[:15]}")
    print()


def main():
    parser = argparse.ArgumentParser(description="REO FotMob CLI — Data Fabric")
    subparsers = parser.add_subparsers(dest="command")

    sp = subparsers.add_parser("search-player", help="Search for a player by name")
    sp.add_argument("--name", required=True, help="Player name to search")

    sp = subparsers.add_parser("player", help="Get player data by FotMob ID")
    sp.add_argument("--id", type=int, required=True, help="FotMob player ID")

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
