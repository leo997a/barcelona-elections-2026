"""
REO Data Fabric — Player Intel Master Profile Builder

Merges:
  - FotMob Mega Profile (deploy/reo-datafabric/reports/player_fotmob_mega/{slug}.json)
  - FBref advanced cache  (deploy/reo-datafootball-worker/.cache/fbref/fbref-{group}-{season}.json)

Principle: NO DATA LOSS.
  - Every flattened FotMob metric is preserved.
  - Every FBref column for the matched player row is preserved.
  - Anything we cannot map cleanly goes into unknownButPreserved.

Outputs:
  deploy/reo-datafabric/reports/player_intel_master/{slug}.master.json
  deploy/reo-datafabric/reports/player_intel_master/{slug}.master.summary.json

Usage:
  python deploy/reo-datafabric/tools/build_player_intel_master_profile.py \
         --player "Lamine Yamal" --club "Barcelona" --season "2025-26"

Does NOT modify VPS, bridge, /api/player-stats, FBref cache, or Player Stats Lab.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Optional

SCHEMA_VERSION = "player-intel-master-v1"

ROOT_DIR = Path(__file__).parent.parent
FOTMOB_MEGA_DIR = ROOT_DIR / "reports" / "player_fotmob_mega"

# Try local worker cache first; fall back to /opt-style data cache mirror locally
FBREF_CACHE_CANDIDATES = [
    Path(__file__).parent.parent.parent / "reo-datafootball-worker" / ".cache" / "fbref",
    Path(__file__).parent.parent.parent / "reo-data-cache" / "fbref",
]

OUTPUT_DIR = ROOT_DIR / "reports" / "player_intel_master"

FBREF_STAT_GROUPS = [
    "standard", "shooting", "passing", "pass_types", "gca",
    "defense", "possession", "playing_time", "misc", "keeper",
]

CLUB_ALIASES = {
    "barcelona": ["barcelona", "fc barcelona", "barça", "barca"],
    "chelsea": ["chelsea", "chelsea fc"],
    "manchester city": ["manchester city", "man city", "mcfc"],
    "real madrid": ["real madrid", "real madrid cf"],
    "atletico madrid": ["atletico madrid", "atlético madrid", "atletico de madrid"],
    "manchester united": ["manchester united", "man united", "man utd"],
    "bayern munich": ["bayern munich", "bayern münchen", "fc bayern"],
    "psg": ["psg", "paris saint-germain", "paris s-g", "paris saint germain"],
    "liverpool": ["liverpool", "liverpool fc"],
    "arsenal": ["arsenal", "arsenal fc"],
    "tottenham": ["tottenham", "tottenham hotspur", "spurs"],
    "inter": ["inter", "inter milan", "internazionale"],
    "milan": ["milan", "ac milan"],
    "juventus": ["juventus", "juve"],
    "napoli": ["napoli", "ssc napoli"],
    "borussia dortmund": ["borussia dortmund", "bvb", "dortmund"],
}

# Arabic labels for common metrics (used in metricCatalog)
ARABIC_LABELS = {
    "goals": "الأهداف",
    "assists": "التمريرات الحاسمة",
    "minutes": "الدقائق",
    "minutes_played": "الدقائق",
    "matches": "المباريات",
    "appearances": "المباريات",
    "rating": "التقييم",
    "shots": "التسديدات",
    "xg": "الأهداف المتوقعة",
    "expected_goals": "الأهداف المتوقعة",
    "xa": "التمريرات المتوقعة",
    "expected_assists": "التمريرات المتوقعة",
    "key_passes": "التمريرات المفتاحية",
    "progressive_passes": "التمريرات التقدمية",
    "tackles": "الافتكاكات",
    "interceptions": "الاعتراضات",
    "touches": "اللمسات",
    "progressive_carries": "الحمل التقدمي",
    "crosses": "العرضيات",
    "yellow_cards": "البطاقات الصفراء",
    "red_cards": "البطاقات الحمراء",
    "starts": "المباريات الأساسية",
    "shots_on_target": "التسديدات على المرمى",
    "dribbles": "المراوغات",
    "blocks": "الاعتراضات الجسدية",
    "clearances": "التشتيتات",
    "aerial_duels_won": "المبارزات الهوائية الفائزة",
    "saves": "التصديات",
    "clean_sheets": "الشِباك النظيفة",
    "fouls": "الأخطاء",
    "fouled": "الأخطاء عليه",
    "offsides": "حالات التسلل",
    "penalties_scored": "الركلات المسجلة",
    "shot_creating_actions": "أعمال صناعة التسديدات",
    "goal_creating_actions": "أعمال صناعة الأهداف",
    "chances_created": "الفرص المصنوعة",
    "accurate_passes": "التمريرات الدقيقة",
    "duels_won": "المبارزات الفائزة",
    "dribble_success_rate": "نسبة نجاح المراوغة",
}


# ─── Utilities ─────────────────────────────────────────────────────────────────

def _slugify(name: str) -> str:
    s = (name or "").lower().strip()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "player"


def _strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", s or "")
        if not unicodedata.combining(c)
    )


def _normalize_name(s: str) -> str:
    s = _strip_accents(s or "").lower().strip()
    s = re.sub(r"\s+", " ", s)
    return s


def _safe_metric_key(group: str, column: str) -> str:
    """Convert FBref column like 'pass types_crs' to 'fbref_passing_pass_types_crs'.

    Preserves '%', '+' and '-' as suffix-encoded tokens so we never collide:
      'standard_sot'   -> 'fbref_shooting_standard_sot'
      'standard_sot%'  -> 'fbref_shooting_standard_sot_pct'
      'tkl+int'        -> 'fbref_defense_tkl_plus_int'
      'team success_+/-90' -> 'fbref_playing_time_team_success_plus_minus_90'
    """
    col = column.lower().strip()
    col = col.replace("%", "_pct")
    col = col.replace("+/-", "_plus_minus_")
    col = col.replace("+", "_plus_")
    col = col.replace("-", "_minus_")
    col = col.replace("/", "_per_")
    col = re.sub(r"[^a-z0-9]+", "_", col)
    col = re.sub(r"_+", "_", col).strip("_")
    return f"fbref_{group}_{col}"


def _to_float(v: Any) -> Optional[float]:
    if v is None or v == "" or (isinstance(v, str) and v.lower() == "matches"):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _to_int(v: Any) -> Optional[int]:
    f = _to_float(v)
    if f is None:
        return None
    try:
        return int(f)
    except (TypeError, ValueError):
        return None


def _is_empty(v: Any) -> bool:
    if v is None:
        return True
    if isinstance(v, (list, dict, str)) and len(v) == 0:
        return True
    return False


# ─── FBref cache loader ────────────────────────────────────────────────────────

def _resolve_fbref_dir() -> Optional[Path]:
    for cand in FBREF_CACHE_CANDIDATES:
        if cand.exists() and any(cand.glob("fbref-*.json")):
            return cand
    return None


def _load_fbref_groups(fbref_dir: Path, season_slug: str) -> dict[str, dict]:
    """Returns {group: {raw_payload, players, columns, file}}."""
    out: dict[str, dict] = {}
    for g in FBREF_STAT_GROUPS:
        path = fbref_dir / f"fbref-{g}-{season_slug}.json"
        if not path.exists():
            continue
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            out[g] = {"loadError": f"{type(e).__name__}: {e}", "file": str(path)}
            continue
        players = raw.get("players") or []
        columns: list[str] = []
        if players and isinstance(players[0], dict):
            columns = list(players[0].keys())
        out[g] = {
            "ok": raw.get("ok"),
            "source": raw.get("source"),
            "strategy": raw.get("strategy"),
            "season": raw.get("season"),
            "fetched_at": raw.get("fetched_at"),
            "playerCount": raw.get("player_count") or len(players),
            "players": players,
            "columns": columns,
            "file": str(path),
        }
    return out


# ─── Player matcher ────────────────────────────────────────────────────────────

def _club_aliases(club: Optional[str]) -> set[str]:
    if not club:
        return set()
    norm = _normalize_name(club)
    aliases = {norm}
    for canonical, alts in CLUB_ALIASES.items():
        if norm in [_normalize_name(a) for a in alts] or norm == canonical:
            for a in alts:
                aliases.add(_normalize_name(a))
            aliases.add(canonical)
            break
    return aliases


def _row_player_name(row: dict) -> str:
    return str(row.get("player") or row.get("name") or row.get("Player") or "").strip()


def _row_team_name(row: dict) -> str:
    return str(
        row.get("team") or row.get("squad") or row.get("Squad") or row.get("Team") or ""
    ).strip()


def _name_score(player_norm: str, row_norm: str) -> float:
    if not player_norm or not row_norm:
        return 0.0
    if player_norm == row_norm:
        return 1.0
    # token overlap
    p_tokens = set(player_norm.split())
    r_tokens = set(row_norm.split())
    overlap = len(p_tokens & r_tokens)
    if overlap == 0:
        return SequenceMatcher(None, player_norm, row_norm).ratio() * 0.6
    coverage = overlap / max(1, len(p_tokens))
    seq = SequenceMatcher(None, player_norm, row_norm).ratio()
    return min(1.0, 0.6 * coverage + 0.4 * seq)


def match_fbref_player_rows(
    player_name: str,
    club_name: Optional[str],
    fbref_groups: dict[str, dict],
) -> dict[str, dict]:
    """For each loaded group, find the best-matching row.

    Returns {group: {row, score, candidates[]}} or {group: {row: None, ...}}.
    """
    player_norm = _normalize_name(player_name)
    aliases = _club_aliases(club_name)

    matched: dict[str, dict] = {}
    for group, content in fbref_groups.items():
        if "loadError" in content or not content.get("players"):
            matched[group] = {"row": None, "score": 0.0, "candidates": [], "error": content.get("loadError")}
            continue

        scored: list[tuple[float, dict]] = []
        for row in content["players"]:
            name = _row_player_name(row)
            if not name:
                continue
            row_norm = _normalize_name(name)
            base_score = _name_score(player_norm, row_norm)
            if base_score < 0.5:
                continue
            club_bonus = 0.0
            row_team = _normalize_name(_row_team_name(row))
            if aliases and row_team:
                if row_team in aliases or any(a in row_team for a in aliases):
                    club_bonus = 0.2
            scored.append((base_score + club_bonus, row))

        scored.sort(key=lambda t: t[0], reverse=True)
        best_row = scored[0][1] if scored else None
        best_score = scored[0][0] if scored else 0.0
        candidates = [
            {
                "name": _row_player_name(r),
                "team": _row_team_name(r),
                "score": round(s, 3),
            }
            for s, r in scored[:5]
        ]
        matched[group] = {
            "row": best_row,
            "score": round(best_score, 3),
            "candidates": candidates,
            "matched": best_row is not None and best_score >= 0.7,
        }
    return matched


# ─── FBref column → metric extraction ──────────────────────────────────────────

# Identity columns we don't push as metrics (they're context, not numbers)
FBREF_IDENTITY_COLUMNS = {
    "rk", "league", "season", "team", "squad", "player", "name", "nation",
    "pos", "age", "born", "comp", "matches",
}

# Category hints based on stat group
FBREF_GROUP_CATEGORY = {
    "standard": "summary",
    "shooting": "shooting",
    "passing": "passing",
    "pass_types": "passing",
    "gca": "creation",
    "defense": "defense",
    "possession": "possession",
    "playing_time": "minutes",
    "misc": "discipline",
    "keeper": "goalkeeping",
}


def _build_fbref_metrics(matched: dict[str, dict]) -> dict[str, dict]:
    """Convert every FBref column for the matched player into a metric record."""
    metrics: dict[str, dict] = {}
    for group, info in matched.items():
        row = info.get("row")
        if not isinstance(row, dict):
            continue
        category = FBREF_GROUP_CATEGORY.get(group, "unknown_fbref")
        for col, val in row.items():
            if col in FBREF_IDENTITY_COLUMNS:
                continue
            key = _safe_metric_key(group, col)
            metrics[key] = {
                "value": val,
                "source": "fbref",
                "sourceGroup": group,
                "rawColumn": col,
                "normalizedKey": key,
                "category": category,
                "confidence": 1.0,
                "raw": val,
            }
    return metrics


# ─── FotMob → master metrics ───────────────────────────────────────────────────

def _build_fotmob_metrics(mega: dict) -> dict[str, dict]:
    """Take FotMob flattenedMetrics and decorate with source/category info."""
    out: dict[str, dict] = {}
    flat = mega.get("flattenedMetrics") or {}
    for key, m in flat.items():
        if not isinstance(m, dict):
            continue
        category = m.get("category") or "fotmob"
        out[f"fotmob_{key}"] = {
            "value": m.get("value"),
            "source": "fotmob",
            "sourceGroup": m.get("sourceSection") or "",
            "label": m.get("label"),
            "rawKey": m.get("rawKey"),
            "normalizedKey": f"fotmob_{key}",
            "category": category,
            "per90": m.get("per90"),
            "percentileRank": m.get("percentileRank"),
            "confidence": 0.9,
            "raw": m,
        }
    return out


# ─── Unified canonical metrics (FotMob + FBref) ────────────────────────────────

# canonical key → {fotmob: candidate flattened keys, fbref: candidate normalized keys}
CANONICAL_METRIC_MAP: dict[str, dict] = {
    "goals": {
        "label": "Goals",
        "category": "attack",
        "fotmob": ["main_league_goals", "top_goals", "shooting_goals"],
        "fbref": ["fbref_standard_performance_gls", "fbref_shooting_standard_gls"],
    },
    "assists": {
        "label": "Assists",
        "category": "chance_creation",
        "fotmob": ["main_league_assists", "top_assists", "passing_assists"],
        "fbref": ["fbref_standard_performance_ast"],
    },
    "matches": {
        "label": "Matches",
        "category": "summary",
        "fotmob": ["main_league_matches"],
        "fbref": ["fbref_standard_playing_time_mp", "fbref_playing_time_playing_time_mp"],
    },
    "minutes": {
        "label": "Minutes",
        "category": "summary",
        "fotmob": ["main_league_minutes_played"],
        "fbref": ["fbref_standard_playing_time_min", "fbref_playing_time_playing_time_min"],
    },
    "rating": {
        "label": "Rating",
        "category": "summary",
        "fotmob": ["main_league_rating", "top_rating"],
        "fbref": [],
    },
    "yellow_cards": {
        "label": "Yellow Cards",
        "category": "discipline",
        "fotmob": ["main_league_yellow_cards", "discipline_yellow_cards"],
        "fbref": ["fbref_standard_performance_crdy", "fbref_misc_performance_crdy"],
    },
    "red_cards": {
        "label": "Red Cards",
        "category": "discipline",
        "fotmob": ["main_league_red_cards", "discipline_red_cards"],
        "fbref": ["fbref_standard_performance_crdr", "fbref_misc_performance_crdr"],
    },
    "shots": {
        "label": "Shots",
        "category": "shooting",
        "fotmob": ["shooting_shots"],
        "fbref": ["fbref_shooting_standard_sh"],
    },
    "shots_on_target": {
        "label": "Shots on Target",
        "category": "shooting",
        "fotmob": ["shooting_ShotsOnTarget", "shooting_shots_on_target"],
        "fbref": ["fbref_shooting_standard_sot"],
    },
    "xg": {
        "label": "Expected Goals",
        "category": "shooting",
        "fotmob": ["shooting_expected_goals", "top_expected_goals"],
        "fbref": [],  # only in advanced expected stat group when available
    },
    "xa": {
        "label": "Expected Assists",
        "category": "chance_creation",
        "fotmob": ["passing_expected_assists", "top_expected_assists"],
        "fbref": [],
    },
    "key_passes": {
        "label": "Key Passes",
        "category": "chance_creation",
        "fotmob": ["passing_chances_created", "passing_big_chances_created"],
        "fbref": [],
    },
    "progressive_passes": {
        "label": "Progressive Passes",
        "category": "passing",
        "fotmob": [],
        "fbref": [],  # would be in passing if present
    },
    "tackles": {
        "label": "Tackles",
        "category": "defense",
        "fotmob": ["defending_tackles"],
        "fbref": ["fbref_defense_tackles_tkl"],
    },
    "interceptions": {
        "label": "Interceptions",
        "category": "defense",
        "fotmob": ["defending_interceptions"],
        "fbref": ["fbref_defense_int", "fbref_misc_performance_int"],
    },
    "touches": {
        "label": "Touches",
        "category": "possession",
        "fotmob": ["possession_touches"],
        "fbref": ["fbref_possession_touches_touches"],
    },
    "progressive_carries": {
        "label": "Progressive Carries",
        "category": "possession",
        "fotmob": [],
        "fbref": ["fbref_possession_carries_prgdist"],
    },
    "crosses": {
        "label": "Crosses",
        "category": "passing",
        "fotmob": [],
        "fbref": ["fbref_passing_pass_types_crs", "fbref_pass_types_pass_types_crs", "fbref_misc_performance_crs"],
    },
    "fouls_committed": {
        "label": "Fouls Committed",
        "category": "discipline",
        "fotmob": [],
        "fbref": ["fbref_misc_performance_fls"],
    },
    "fouls_drawn": {
        "label": "Fouls Drawn",
        "category": "discipline",
        "fotmob": [],
        "fbref": ["fbref_misc_performance_fld"],
    },
    "offsides": {
        "label": "Offsides",
        "category": "discipline",
        "fotmob": [],
        "fbref": ["fbref_misc_performance_off"],
    },
    "shot_creating_actions": {
        "label": "Shot-Creating Actions",
        "category": "creation",
        "fotmob": [],
        "fbref": ["fbref_gca_sca_sca"],
    },
    "goal_creating_actions": {
        "label": "Goal-Creating Actions",
        "category": "creation",
        "fotmob": [],
        "fbref": ["fbref_gca_gca_gca"],
    },
    "blocks": {
        "label": "Blocks",
        "category": "defense",
        "fotmob": ["defending_blocks"],
        "fbref": ["fbref_defense_blocks_blocks"],
    },
    "starts": {
        "label": "Starts",
        "category": "summary",
        "fotmob": [],
        "fbref": ["fbref_standard_playing_time_starts", "fbref_playing_time_starts_starts"],
    },
    "tackles_won": {
        "label": "Tackles Won",
        "category": "defense",
        "fotmob": [],
        "fbref": ["fbref_defense_tackles_tklw", "fbref_misc_performance_tklw"],
    },
    "saves": {
        "label": "Saves",
        "category": "goalkeeping",
        "fotmob": [],
        "fbref": ["fbref_keeper_performance_saves"],
    },
    "clean_sheets": {
        "label": "Clean Sheets",
        "category": "goalkeeping",
        "fotmob": [],
        "fbref": ["fbref_keeper_performance_cs"],
    },
}


def _build_canonical_merged(
    fotmob_metrics: dict[str, dict],
    fbref_metrics: dict[str, dict],
) -> tuple[dict[str, dict], list[dict]]:
    """For every canonical metric, gather values from both sources.

    Returns (canonical_metrics, source_conflicts).
    """
    canonical: dict[str, dict] = {}
    conflicts: list[dict] = []

    for canon, spec in CANONICAL_METRIC_MAP.items():
        sources: dict[str, dict] = {}
        # FotMob candidates
        for cand in spec.get("fotmob", []) or []:
            full_key = f"fotmob_{cand}"
            if full_key in fotmob_metrics:
                sources["fotmob"] = fotmob_metrics[full_key]
                break
        # FBref candidates
        for cand in spec.get("fbref", []) or []:
            if cand in fbref_metrics:
                sources["fbref"] = fbref_metrics[cand]
                break

        if not sources:
            continue

        # Pick primary value: prefer FotMob (has percentile + per90)
        if "fotmob" in sources:
            primary_value = sources["fotmob"].get("value")
            primary_source = "fotmob"
        else:
            primary_value = sources["fbref"].get("value")
            primary_source = "fbref"

        canonical[canon] = {
            "primaryValue": primary_value,
            "primarySource": primary_source,
            "label": spec.get("label"),
            "category": spec.get("category"),
            "sources": sources,
        }

        # Detect conflicts when both sources differ significantly (numeric)
        if "fotmob" in sources and "fbref" in sources:
            f_val = _to_float(sources["fotmob"].get("value"))
            b_val = _to_float(sources["fbref"].get("value"))
            if f_val is not None and b_val is not None:
                diff = abs(f_val - b_val)
                base = max(abs(f_val), abs(b_val), 1.0)
                if diff / base > 0.25 and diff > 1.0:
                    conflicts.append({
                        "metric": canon,
                        "fotmobValue": f_val,
                        "fbrefValue": b_val,
                        "diff": round(diff, 3),
                        "diffPercent": round((diff / base) * 100.0, 2),
                    })

    return canonical, conflicts


# ─── Metric Catalog ────────────────────────────────────────────────────────────

def _build_metric_catalog(merged: dict[str, dict]) -> dict[str, dict]:
    """Compact index of every metric available in mergedMetrics."""
    catalog: dict[str, dict] = {}
    for key, m in merged.items():
        if not isinstance(m, dict):
            continue
        # Determine label
        label = m.get("label") or m.get("rawColumn") or key
        # Look up Arabic; try canonical first, then heuristics
        label_ar = ARABIC_LABELS.get(key)
        if not label_ar:
            # Try to derive from primarySource label or keys
            for pat, ar in ARABIC_LABELS.items():
                if pat in key.lower():
                    label_ar = ar
                    break
        # If this is a canonical merged metric (has primaryValue), source = merged; else read m["source"]
        if "primarySource" in m:
            source = "merged"
        else:
            source = m.get("source") or "unknown"
        category = m.get("category") or "unknown"
        # value type detection
        v = m.get("primaryValue") if "primaryValue" in m else m.get("value")
        if isinstance(v, bool):
            value_type = "bool"
        elif isinstance(v, (int, float)):
            value_type = "number"
        elif isinstance(v, str) and v.endswith("%"):
            value_type = "percent"
        elif isinstance(v, str):
            value_type = "string"
        else:
            value_type = "raw"
        catalog[key] = {
            "key": key,
            "label": label,
            "labelAr": label_ar,
            "source": source,
            "category": category,
            "group": m.get("sourceGroup"),
            "available": v is not None and v != "",
            "valueType": value_type,
            "recommendedFor": [],
        }
    return catalog


# ─── Broadcast Cards ───────────────────────────────────────────────────────────

BROADCAST_CARDS_DEF = {
    "attacker": {
        "title": "Attacker Card",
        "metrics": ["goals", "assists", "xg", "shots", "shots_on_target", "rating"],
        "fotmob_extras": ["fotmob_recent_goals", "fotmob_recent_avg_rating"],
    },
    "playmaker": {
        "title": "Playmaker Card",
        "metrics": ["assists", "xa", "key_passes", "progressive_passes",
                    "shot_creating_actions", "goal_creating_actions"],
        "fotmob_extras": ["fotmob_passing_chances_created", "fotmob_passing_accurate_passes"],
    },
    "winger": {
        "title": "Winger Card",
        "metrics": ["assists", "crosses", "progressive_carries", "shot_creating_actions"],
        "fotmob_extras": [
            "fotmob_possession_dribbles_succeeded",
            "fotmob_possession_dribbles",
            "fotmob_possession_touches",
        ],
    },
    "defender": {
        "title": "Defender Card",
        "metrics": ["tackles", "tackles_won", "interceptions", "blocks"],
        "fotmob_extras": [
            "fotmob_defending_defensive_actions",
            "fotmob_defending_aerial_duels_won",
            "fotmob_defending_clearances",
        ],
    },
    "complete_report": {
        "title": "Complete Report",
        "metrics": ["goals", "assists", "matches", "minutes", "rating",
                    "yellow_cards", "red_cards", "shots", "key_passes",
                    "tackles", "interceptions"],
        "fotmob_extras": [],
    },
    "form_report": {
        "title": "Form Report (recent)",
        "metrics": [],
        "fotmob_extras": [
            "fotmob_recent_matches_count",
            "fotmob_recent_goals",
            "fotmob_recent_assists",
            "fotmob_recent_minutes",
            "fotmob_recent_avg_rating",
            "fotmob_recent_player_of_match_count",
            "fotmob_recent_yellow_cards",
            "fotmob_recent_red_cards",
        ],
    },
    "market_report": {
        "title": "Market Report",
        "metrics": [],
        "fotmob_extras": [
            "fotmob_market_currentValue",
            "fotmob_market_highestValue",
            "fotmob_market_lowestValue",
            "fotmob_market_firstValue",
            "fotmob_market_growthFromFirstPercent",
        ],
    },
    "season_report": {
        "title": "Season Report",
        "metrics": ["goals", "assists", "matches", "minutes", "rating",
                    "shots_on_target", "tackles", "interceptions", "touches"],
        "fotmob_extras": ["fotmob_recent_matches_count"],
    },
}


def _build_broadcast_cards(merged_canonical: dict[str, dict], all_metrics: dict[str, dict]) -> dict:
    """Pick metrics per card; only include those that have a value."""
    cards: dict[str, dict] = {}
    for card_key, spec in BROADCAST_CARDS_DEF.items():
        items: list[dict] = []
        # canonical metrics
        for m_key in spec["metrics"]:
            if m_key in merged_canonical:
                m = merged_canonical[m_key]
                if m.get("primaryValue") not in (None, ""):
                    items.append({
                        "key": m_key,
                        "label": m.get("label"),
                        "labelAr": ARABIC_LABELS.get(m_key),
                        "value": m.get("primaryValue"),
                        "source": m.get("primarySource"),
                        "category": m.get("category"),
                    })
        # fotmob extras (granular flattened metrics)
        for ek in spec["fotmob_extras"]:
            if ek in all_metrics:
                m = all_metrics[ek]
                v = m.get("value")
                if v is not None and v != "":
                    items.append({
                        "key": ek,
                        "label": m.get("label"),
                        "labelAr": None,
                        "value": v,
                        "source": "fotmob",
                        "category": m.get("category"),
                        "per90": m.get("per90"),
                        "percentileRank": m.get("percentileRank"),
                    })
        cards[card_key] = {
            "title": spec["title"],
            "items": items,
            "itemsCount": len(items),
        }
    return cards


# ─── Master profile builder ────────────────────────────────────────────────────

def _season_slug(season: str) -> str:
    """Convert '2025-26' or '2025/2026' to '2025-26' (cache filename style)."""
    if not season:
        return "2025-26"
    s = season.strip().replace("/", "-").replace(" ", "")
    if "-" in s:
        parts = s.split("-")
        if len(parts) == 2 and len(parts[1]) == 4:
            # e.g. 2025-2026 -> 2025-26
            return f"{parts[0]}-{parts[1][2:]}"
    return s


def _load_fotmob_mega_for(player_name: str) -> Optional[dict]:
    slug = _slugify(player_name)
    p = FOTMOB_MEGA_DIR / f"{slug}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  [WARN] could not parse FotMob mega: {e}")
        return None


def _build_unknown_preserved(
    fotmob_mega: Optional[dict],
    matched: dict[str, dict],
) -> dict:
    """Capture sections we did NOT explicitly extract."""
    out: dict[str, Any] = {}
    # Anything in FotMob mega rawColumns.dataKeys that is non-empty but we did not
    # already touch via explicit sections is logged for traceability.
    if isinstance(fotmob_mega, dict):
        out["fotmob_unknownButPreserved"] = fotmob_mega.get("unknownButPreserved") or {}
    # FBref candidates that were close but not matched (could indicate alias issues)
    fbref_unmatched_candidates: dict[str, list] = {}
    for group, info in matched.items():
        if not info.get("matched") and info.get("candidates"):
            fbref_unmatched_candidates[group] = info["candidates"]
    if fbref_unmatched_candidates:
        out["fbref_unmatchedTopCandidates"] = fbref_unmatched_candidates
    return out


def _build_quality_report(
    fotmob_metrics: dict,
    fbref_metrics: dict,
    matched: dict,
    fbref_groups: dict,
    canonical: dict,
    catalog: dict,
    cards: dict,
    conflicts: list[dict],
) -> dict:
    available_groups = list(fbref_groups.keys())
    matched_groups = [g for g, v in matched.items() if v.get("matched")]
    missing_player_groups = [g for g, v in matched.items() if not v.get("matched")]

    rep = {
        "fotmobMetricsCount": len(fotmob_metrics),
        "fbrefGroupsAvailable": available_groups,
        "fbrefGroupsMatched": matched_groups,
        "fbrefGroupsMissingPlayer": missing_player_groups,
        "fbrefRawColumnsCount": len(fbref_metrics),
        "canonicalMetricsCount": len(canonical),
        "mergedMetricsCount": len(fotmob_metrics) + len(fbref_metrics) + len(canonical),
        "metricCatalogCount": len(catalog),
        "broadcastCardsCount": len(cards),
        "broadcastCardsItemTotal": sum((c.get("itemsCount") or 0) for c in cards.values()),
        "sourceConflicts": conflicts,
        "duplicateMetrics": [],
        "warnings": [],
    }

    if rep["fotmobMetricsCount"] < 100:
        rep["warnings"].append("LOW_FOTMOB_METRIC_COUNT")
    if len(matched_groups) < 5:
        rep["warnings"].append("LOW_FBREF_GROUPS_MATCHED")
    if rep["mergedMetricsCount"] < 250:
        rep["warnings"].append("LOW_MERGED_METRICS_COUNT")
    if not matched_groups:
        rep["warnings"].append("FBREF_PLAYER_NOT_FOUND_IN_ANY_GROUP")
    if conflicts:
        rep["warnings"].append("SOURCE_CONFLICTS_DETECTED")

    return rep


def build_master_profile(
    player_name: str,
    club_name: Optional[str],
    season: str,
) -> Optional[dict]:
    """Master entry point — loads FotMob mega + FBref cache, merges everything."""
    season_slug = _season_slug(season)

    # Load FotMob mega (REQUIRED for full data; if missing we still continue with FBref)
    mega = _load_fotmob_mega_for(player_name)
    if mega is None:
        print(f"  [WARN] FotMob mega profile not found for slug={_slugify(player_name)}")

    # Resolve FBref dir
    fbref_dir = _resolve_fbref_dir()
    if fbref_dir is None:
        print("  [WARN] FBref cache directory not found in any candidate path:")
        for c in FBREF_CACHE_CANDIDATES:
            print(f"          - {c}")

    fbref_groups: dict[str, dict] = {}
    if fbref_dir is not None:
        fbref_groups = _load_fbref_groups(fbref_dir, season_slug)

    matched = match_fbref_player_rows(player_name, club_name, fbref_groups)

    fotmob_metrics = _build_fotmob_metrics(mega) if mega else {}
    fbref_metrics = _build_fbref_metrics(matched)

    # Merge: every flattened metric kept; canonical merged on top
    merged_metrics: dict[str, dict] = {}
    merged_metrics.update(fotmob_metrics)
    merged_metrics.update(fbref_metrics)
    canonical, conflicts = _build_canonical_merged(fotmob_metrics, fbref_metrics)
    # Add canonical metrics to mergedMetrics with their canonical key (no collision)
    for k, v in canonical.items():
        merged_metrics[k] = v

    catalog = _build_metric_catalog(merged_metrics)
    cards = _build_broadcast_cards(canonical, merged_metrics)
    unknown = _build_unknown_preserved(mega, matched)
    qr = _build_quality_report(
        fotmob_metrics, fbref_metrics, matched, fbref_groups,
        canonical, catalog, cards, conflicts,
    )

    # Source files reference
    source_files = {
        "fotmobMega": str(FOTMOB_MEGA_DIR / f"{_slugify(player_name)}.json") if mega else None,
        "fbrefDir": str(fbref_dir) if fbref_dir else None,
        "fbrefGroupsLoaded": list(fbref_groups.keys()),
    }

    # Identity from FotMob mega if available
    if mega:
        fotmob_identity = (mega.get("identity") or {})
        position = fotmob_identity.get("primaryPositionLabel")
        normalized_club = fotmob_identity.get("primaryTeamName") or club_name
    else:
        fotmob_identity = {}
        position = None
        normalized_club = club_name

    profile: dict = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "player": {
            "name": player_name,
            "club": normalized_club,
            "season": season,
            "position": position,
        },
        "identity": {
            "name": player_name,
            "fotmobId": fotmob_identity.get("id"),
            "fotmobClub": fotmob_identity.get("primaryTeamName"),
            "fotmobPosition": fotmob_identity.get("primaryPositionLabel"),
            "fotmobPositionKey": fotmob_identity.get("primaryPositionKey"),
            "queryClub": club_name,
            "queryName": player_name,
        },
        "sourceCoverage": {
            "fotmob": mega is not None,
            "fbref": fbref_dir is not None,
            "fbrefGroupsAvailable": list(fbref_groups.keys()),
            "fbrefGroupsMatched": [g for g, v in matched.items() if v.get("matched")],
        },
        "sourceFiles": source_files,
        "fotmob": {
            "fullProfile": mega,  # entire mega profile preserved
        },
        "fbref": {
            "statGroups": {
                g: {
                    "matched": info.get("matched"),
                    "score": info.get("score"),
                    "row": info.get("row"),
                    "columns": fbref_groups.get(g, {}).get("columns", []),
                    "playerCount": fbref_groups.get(g, {}).get("playerCount"),
                    "fetched_at": fbref_groups.get(g, {}).get("fetched_at"),
                    "candidates": info.get("candidates"),
                }
                for g, info in matched.items()
            },
        },
        "rawRows": {
            "fbref": {
                g: info.get("row") for g, info in matched.items() if info.get("row")
            },
        },
        "rawMetrics": {
            "fotmob": fotmob_metrics,
            "fbref": fbref_metrics,
        },
        "mergedMetrics": merged_metrics,
        "canonicalMetrics": canonical,
        "metricCatalog": catalog,
        "broadcastCards": cards,
        "unknownButPreserved": unknown,
        "qualityReport": qr,
    }
    return profile


def build_master_summary(profile: dict) -> dict:
    qr = profile.get("qualityReport") or {}
    cards = profile.get("broadcastCards") or {}
    canonical = profile.get("canonicalMetrics") or {}

    top_cards = sorted(
        [
            {"key": k, "title": v.get("title"), "itemsCount": v.get("itemsCount", 0)}
            for k, v in cards.items()
        ],
        key=lambda c: c["itemsCount"],
        reverse=True,
    )

    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": profile.get("generatedAt"),
        "player": profile.get("player", {}).get("name"),
        "club": profile.get("player", {}).get("club"),
        "season": profile.get("player", {}).get("season"),
        "position": profile.get("player", {}).get("position"),
        "sources": {
            "fotmob": (profile.get("sourceCoverage") or {}).get("fotmob"),
            "fbref": (profile.get("sourceCoverage") or {}).get("fbref"),
        },
        "counts": {
            "fotmobMetrics": qr.get("fotmobMetricsCount", 0),
            "fbrefRawColumns": qr.get("fbrefRawColumnsCount", 0),
            "canonicalMetrics": qr.get("canonicalMetricsCount", 0),
            "mergedMetrics": qr.get("mergedMetricsCount", 0),
            "metricCatalog": qr.get("metricCatalogCount", 0),
            "broadcastCards": qr.get("broadcastCardsCount", 0),
            "broadcastCardsItemTotal": qr.get("broadcastCardsItemTotal", 0),
        },
        "fbrefGroupsMatched": qr.get("fbrefGroupsMatched", []),
        "fbrefGroupsMissingPlayer": qr.get("fbrefGroupsMissingPlayer", []),
        "topAvailableCards": top_cards,
        "canonicalKeys": list(canonical.keys()),
        "qualityWarnings": qr.get("warnings", []),
        "sourceConflicts": qr.get("sourceConflicts", []),
        "paths": profile.get("sourceFiles") or {},
    }


# ─── CLI runner ────────────────────────────────────────────────────────────────

def run(player_name: str, club_name: Optional[str], season: str,
        output_dir: Optional[Path] = None) -> Optional[dict]:
    profile = build_master_profile(player_name, club_name, season)
    if profile is None:
        return None

    out_dir = output_dir or OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = _slugify(player_name)

    full_path = out_dir / f"{slug}.master.json"
    summary_path = out_dir / f"{slug}.master.summary.json"
    full_path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = build_master_summary(profile)
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    qr = profile.get("qualityReport") or {}
    print()
    print("=" * 70)
    print(f"  Master Profile built: {slug}")
    print("=" * 70)
    print(f"  Player:                      {player_name}")
    print(f"  Club:                        {profile.get('player', {}).get('club')}")
    print(f"  Position:                    {profile.get('player', {}).get('position')}")
    print(f"  Season:                      {season}")
    print()
    print(f"  fotmobMetricsCount:          {qr.get('fotmobMetricsCount')}")
    print(f"  fbrefGroupsAvailable({len(qr.get('fbrefGroupsAvailable') or [])}): {qr.get('fbrefGroupsAvailable')}")
    print(f"  fbrefGroupsMatched({len(qr.get('fbrefGroupsMatched') or [])}):    {qr.get('fbrefGroupsMatched')}")
    print(f"  fbrefGroupsMissing({len(qr.get('fbrefGroupsMissingPlayer') or [])}): {qr.get('fbrefGroupsMissingPlayer')}")
    print(f"  fbrefRawColumnsCount:        {qr.get('fbrefRawColumnsCount')}")
    print(f"  canonicalMetricsCount:       {qr.get('canonicalMetricsCount')}")
    print(f"  mergedMetricsCount:          {qr.get('mergedMetricsCount')}")
    print(f"  metricCatalogCount:          {qr.get('metricCatalogCount')}")
    print(f"  broadcastCards:              {qr.get('broadcastCardsCount')} (items total: {qr.get('broadcastCardsItemTotal')})")
    print(f"  sourceConflicts:             {len(qr.get('sourceConflicts') or [])}")
    print(f"  warnings:                    {qr.get('warnings')}")
    print(f"  Output (full):               {full_path}")
    print(f"  Output (summary):            {summary_path}")
    print()
    return profile


def main() -> None:
    parser = argparse.ArgumentParser(description="Player Intel Master Profile builder")
    parser.add_argument("--player", required=True, help="Player name")
    parser.add_argument("--club", default=None, help="Club name (helps FBref matching)")
    parser.add_argument("--season", default="2025-26", help="Season (default: 2025-26)")
    parser.add_argument("--output-dir", default=None)
    args = parser.parse_args()

    out_dir = Path(args.output_dir) if args.output_dir else None
    profile = run(args.player, args.club, args.season, out_dir)
    if profile is None:
        sys.exit(1)


if __name__ == "__main__":
    main()
