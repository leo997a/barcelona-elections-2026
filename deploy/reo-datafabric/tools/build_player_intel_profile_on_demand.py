"""
REO Data Fabric — On-Demand Player Intel Profile Builder

Pipeline:
  1. Resolve query (Arabic or English) -> player name + club
  2. Search FotMob via existing search_player provider
  3. Build mega profile (Phase X.5)
  4. Build master profile (Phase X.6)
  5. Export broadcast.json to public/player-intel-v2-samples/
  6. Update index.json

Does NOT use FlareSolverr, SeleniumBase, or aggressive scraping.
Reuses existing FotMob provider with rate limiting.

Usage:
  python deploy/reo-datafabric/tools/build_player_intel_profile_on_demand.py \
         --query "ليفاندوفسكي برشلونة" --season "2025-26"
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).parent.parent.parent.parent
TOOLS = Path(__file__).parent
PYTHON = sys.executable

ARABIC_PLAYER_MAP = {
    'يامال': 'Lamine Yamal',
    'لامين': 'Lamine Yamal',
    'لامين يامال': 'Lamine Yamal',
    'ليفاندوفسكي': 'Robert Lewandowski',
    'ليفاندوفسكى': 'Robert Lewandowski',
    'ليفا': 'Robert Lewandowski',
    'روبرت ليفاندوفسكي': 'Robert Lewandowski',
    'بالمر': 'Cole Palmer',
    'كول بالمر': 'Cole Palmer',
    'كول': 'Cole Palmer',
    'مبابي': 'Kylian Mbappe',
    'بيدري': 'Pedri',
    'غافي': 'Gavi',
    'رافينيا': 'Raphinha',
    'دي يونغ': 'Frenkie de Jong',
    'فيرمين': 'Fermin Lopez',
    'ديمبيلي': 'Ousmane Dembele',
    'هالاند': 'Erling Haaland',
    'فينيسيوس': 'Vinicius Junior',
    'بيلينغهام': 'Jude Bellingham',
    'صلاح': 'Mohamed Salah',
    'محمد صلاح': 'Mohamed Salah',
}

ARABIC_CLUB_MAP = {
    'برشلونة': 'Barcelona',
    'برشلونه': 'Barcelona',
    'تشيلسي': 'Chelsea',
    'تشيلسى': 'Chelsea',
    'ريال مدريد': 'Real Madrid',
    'ريال': 'Real Madrid',
    'باريس': 'Paris Saint-Germain',
    'باريس سان جيرمان': 'Paris Saint-Germain',
    'مانشستر سيتي': 'Manchester City',
    'مان سيتي': 'Manchester City',
    'مانشستر يونايتد': 'Manchester United',
    'ليفربول': 'Liverpool',
    'بايرن': 'Bayern Munich',
    'بايرن ميونخ': 'Bayern Munich',
    'دورتموند': 'Borussia Dortmund',
    'يوفنتوس': 'Juventus',
    'ميلان': 'AC Milan',
    'انتر': 'Inter',
    'إنتر': 'Inter',
    'نابولي': 'Napoli',
    'أرسنال': 'Arsenal',
    'ارسنال': 'Arsenal',
    'توتنهام': 'Tottenham',
    'اتلتيكو': 'Atletico Madrid',
}


def _normalize_arabic(s: str) -> str:
    s = re.sub(r'[\u064B-\u065F\u0670]', '', s)  # tashkeel
    s = s.replace('\u0640', '')  # tatweel
    s = re.sub(r'[\u0622\u0623\u0625]', '\u0627', s)  # alef
    s = s.replace('\u0649', '\u064A')  # yaa
    s = re.sub(r'[\u0624\u0626]', '\u0621', s)  # hamza
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def _resolve_query(query: str) -> tuple[Optional[str], Optional[str]]:
    """Translate Arabic tokens to English player + club names."""
    norm = _normalize_arabic(query)
    player = None
    club = None

    # Match player (longest first)
    for ar, en in sorted(ARABIC_PLAYER_MAP.items(), key=lambda x: -len(x[0])):
        ar_norm = _normalize_arabic(ar)
        if ar_norm in norm:
            player = en
            break

    # Match club
    for ar, en in sorted(ARABIC_CLUB_MAP.items(), key=lambda x: -len(x[0])):
        ar_norm = _normalize_arabic(ar)
        if ar_norm in norm:
            club = en
            break

    # If no Arabic match, try the text itself (might already be English)
    if not player:
        # Heuristic: split into words, treat first 2-3 words as name
        tokens = [t for t in norm.split() if not _normalize_arabic(t) in [_normalize_arabic(c) for c in ARABIC_CLUB_MAP]]
        if tokens:
            player = ' '.join(tokens[:3]).title()

    return player, club


def _slugify(name: str) -> str:
    s = name.lower().strip()
    import unicodedata
    s = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return re.sub(r'-+', '-', s).strip('-') or 'player'


def main() -> int:
    parser = argparse.ArgumentParser(description='On-demand Player Intel profile builder')
    parser.add_argument('--query', required=True, help='Player query (Arabic or English)')
    parser.add_argument('--club', default=None, help='Override club name')
    parser.add_argument('--season', default='2025-26')
    parser.add_argument('--player-id', type=int, default=None, help='Skip search if FotMob ID is known')
    args = parser.parse_args()

    print(f"  [QUERY] {args.query}")
    player_name, club_name = _resolve_query(args.query)
    if args.club:
        club_name = args.club
    print(f"  [RESOLVED] player='{player_name}' club='{club_name}'")

    if not player_name:
        print("  [FAIL] could not resolve player name from query")
        return 1

    slug = _slugify(player_name)

    # Step 1: Build FotMob mega profile (requires player ID)
    if args.player_id:
        print(f"  [STEP 1/4] Building FotMob mega profile (id={args.player_id})...")
        r = subprocess.run([
            PYTHON,
            str(TOOLS / 'build_fotmob_mega_profile.py'),
            '--player-id', str(args.player_id),
            '--name', player_name,
        ], cwd=str(ROOT))
        if r.returncode != 0:
            print(f"  [WARN] fotmob mega step returned {r.returncode}")
    else:
        print("  [STEP 1/4] No --player-id provided. Searching FotMob...")
        # Use the FotMob CLI to search
        r = subprocess.run([
            PYTHON,
            str(TOOLS / 'reo_fotmob_cli.py'),
            'search-player',
            '--name', player_name,
        ], cwd=str(ROOT), capture_output=True, text=True)
        print(r.stdout[:500] if r.stdout else '')
        print("  [INFO] Re-run with --player-id <ID> from search results above.")
        print("  [INFO] Alternatively, search returned matches will be auto-resolved in future iteration.")
        return 2

    # Step 2: Build master profile
    print(f"  [STEP 2/4] Building master profile...")
    r = subprocess.run([
        PYTHON,
        str(TOOLS / 'build_player_intel_master_profile.py'),
        '--player', player_name,
        '--club', club_name or '',
        '--season', args.season,
    ], cwd=str(ROOT))
    if r.returncode != 0:
        print(f"  [FAIL] master profile build returned {r.returncode}")
        return r.returncode

    # Step 3: Update public registry
    print(f"  [STEP 3/4] Updating public registry...")
    r = subprocess.run([
        PYTHON,
        str(TOOLS / 'build_player_intel_public_registry.py'),
    ], cwd=str(ROOT))
    if r.returncode != 0:
        print(f"  [FAIL] registry update returned {r.returncode}")
        return r.returncode

    # Step 4: Verify broadcast file size
    print(f"  [STEP 4/4] Verifying output...")
    out_path = ROOT / 'public' / 'player-intel-v2-samples' / f'{slug}.broadcast.json'
    if out_path.exists():
        size_kb = out_path.stat().st_size // 1024
        print(f"  [OK] {out_path.name} ({size_kb} KB)")
        if size_kb > 200:
            print(f"  [WARN] file > 200 KB. Consider compact mode in registry builder.")
    else:
        print(f"  [WARN] expected output not found: {out_path}")

    print()
    print("=" * 60)
    print(f"  Profile ready for: {player_name}")
    print(f"  Slug: {slug}")
    print(f"  Run `npm run build` next.")
    print("=" * 60)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
