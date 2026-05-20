"""
REO Data Fabric — FotMob Mega Player Profile Builder

Reads cached _next/data raw JSON for a player and builds a comprehensive
"Mega Profile" with NO data loss. Captures every section, every metric,
every recent match, every career season, every market value point, every
trait, every trophy, plus shotmap/heatmap, plus a flattened metric index
for fast lookup.

Output:
  deploy/reo-datafabric/reports/player_fotmob_mega/{slug}.json
  deploy/reo-datafabric/reports/player_fotmob_mega/{slug}.summary.json

Usage:
  python deploy/reo-datafabric/tools/build_fotmob_mega_profile.py \
         --player-id 1467236 --name "Lamine Yamal"

Does NOT modify VPS, bridge, /api/player-stats, or FBref cache.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# Allow importing the provider for fallback fetch
sys.path.insert(0, str(Path(__file__).parent.parent))

SCHEMA_VERSION = "player-intel-mega-v1"

CACHE_DIR = Path(__file__).parent.parent / "cache" / "fotmob" / "player_next_data"
OUTPUT_DIR = Path(__file__).parent.parent / "reports" / "player_fotmob_mega"

# Knowledge of which sections we expect (used for missingSections report)
EXPECTED_SECTIONS = [
    "id", "name", "birthDate", "contractEnd", "primaryTeam",
    "positionDescription", "injuryInformation", "internationalDuty",
    "playerInformation", "mainLeague", "trophies", "recentMatches",
    "careerHistory", "traits", "coachStats", "statSeasons",
    "firstSeasonStats", "marketValues", "relatedLinksData", "nextMatch",
    "meta", "status",
]

# Sections we have explicit extractors for. Anything else discovered in
# pageProps.data that is non-empty goes into unknownButPreserved.
EXPLICIT_SECTIONS = set(EXPECTED_SECTIONS) | {
    "isCoach", "isCaptain", "gender", "dataProvider", "ssr",
}


# ─── Utilities ─────────────────────────────────────────────────────────────────

def _slugify(name: str) -> str:
    s = (name or "").lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "player"


def _is_empty(v: Any) -> bool:
    if v is None:
        return True
    if isinstance(v, (list, dict, str)) and len(v) == 0:
        return True
    return False


def _safe_get(d: Any, *keys: str, default: Any = None) -> Any:
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
    return cur if cur is not None else default


def _first(d: dict, *keys: str) -> Any:
    """Return first non-None value from candidate keys."""
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None


def _to_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _to_int(v: Any) -> Optional[int]:
    if v is None:
        return None
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


# ─── Loading ───────────────────────────────────────────────────────────────────

def _load_or_fetch_raw(player_id: int, name: Optional[str]) -> Optional[dict]:
    """Read cached raw JSON; if missing, fetch via provider once."""
    path = CACHE_DIR / f"{player_id}.json"
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  [WARN] failed to parse cache: {e}")

    print(f"  [INFO] cache miss for id={player_id}, fetching once via provider...")
    try:
        from providers.fotmob_provider import FotMobProvider  # type: ignore
    except Exception as e:
        print(f"  [FAIL] cannot import provider: {e}")
        return None

    provider = FotMobProvider()
    data = provider.get_player_next_data(player_id, name=name)
    if data is None:
        print("  [FAIL] provider could not fetch player.")
        return None
    return data


# ─── Section extractors (Mega) ─────────────────────────────────────────────────

def _ext_player_root(data: dict) -> dict:
    """Top-level identity flags before deeper bio."""
    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "gender": data.get("gender"),
        "isCoach": data.get("isCoach"),
        "isCaptain": data.get("isCaptain"),
        "status": data.get("status"),
        "dataProvider": data.get("dataProvider"),
        "ssr": data.get("ssr"),
    }


def _ext_identity(data: dict) -> dict:
    pt = data.get("primaryTeam") or {}
    pos_desc = data.get("positionDescription") or {}
    primary_pos = pos_desc.get("primaryPosition") if isinstance(pos_desc, dict) else None
    pos_label = primary_pos.get("label") if isinstance(primary_pos, dict) else None
    pos_key = primary_pos.get("key") if isinstance(primary_pos, dict) else None
    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "primaryTeamId": pt.get("teamId"),
        "primaryTeamName": pt.get("teamName"),
        "onLoan": pt.get("onLoan"),
        "primaryPositionLabel": pos_label,
        "primaryPositionKey": pos_key,
    }


def _ext_bio(data: dict) -> dict:
    """Normalized bio from playerInformation list + birthDate + status."""
    info_list = data.get("playerInformation") or []
    info_map: dict[str, Any] = {}
    info_raw: list[dict] = []
    for item in info_list:
        if not isinstance(item, dict):
            continue
        info_raw.append(item)
        key = item.get("translationKey") or item.get("title")
        val = item.get("value")
        norm: Any = None
        if isinstance(val, dict):
            norm = (
                val.get("fallback")
                or val.get("numberValue")
                or val.get("dateValue")
                or val.get("key")
            )
        else:
            norm = val
        if key:
            info_map[key] = norm

    birth = data.get("birthDate") or {}
    contract = data.get("contractEnd") or {}
    injury = data.get("injuryInformation") or {}

    return {
        "age": info_map.get("age_sentencecase") or info_map.get("age"),
        "height": info_map.get("height_sentencecase") or info_map.get("height"),
        "preferredFoot": info_map.get("preferred_foot"),
        "country": info_map.get("country_sentencecase") or info_map.get("country"),
        "shirt": info_map.get("shirt") or info_map.get("shirt_number"),
        "transferValue": info_map.get("transfer_value"),
        "birthDateUtc": birth.get("utcTime") if isinstance(birth, dict) else birth,
        "contractEndUtc": contract.get("utcTime") if isinstance(contract, dict) else contract,
        "injury": {
            "name": injury.get("name") if isinstance(injury, dict) else None,
            "key": injury.get("key") if isinstance(injury, dict) else None,
            "expectedReturn": injury.get("expectedReturn") if isinstance(injury, dict) else None,
            "lastUpdated": injury.get("lastUpdated") if isinstance(injury, dict) else None,
        },
        "internationalDuty": data.get("internationalDuty"),
        "playerInformationMap": info_map,
        "playerInformationRaw": info_raw,
    }


def _ext_club(data: dict) -> dict:
    pt = data.get("primaryTeam") or {}
    return {
        "teamId": pt.get("teamId"),
        "teamName": pt.get("teamName"),
        "onLoan": pt.get("onLoan"),
        "teamColors": pt.get("teamColors") or {},
    }


def _ext_position(data: dict) -> dict:
    pd = data.get("positionDescription") or {}
    primary = pd.get("primaryPosition") if isinstance(pd, dict) else None
    nonprimary = pd.get("nonPrimaryPositions") if isinstance(pd, dict) else None
    positions_list = pd.get("positions") if isinstance(pd, dict) else None

    def _pos_to_dict(p: Any) -> dict:
        if not isinstance(p, dict):
            return {}
        sp = p.get("strPos") or {}
        return {
            "label": sp.get("label") if isinstance(sp, dict) else p.get("label"),
            "key": p.get("key") or (sp.get("key") if isinstance(sp, dict) else None),
            "isMainPosition": p.get("isMainPosition"),
            "occurences": p.get("occurences"),
        }

    return {
        "primaryLabel": primary.get("label") if isinstance(primary, dict) else None,
        "primaryKey": primary.get("key") if isinstance(primary, dict) else None,
        "nonPrimary": [
            (np.get("label") if isinstance(np, dict) else np)
            for np in (nonprimary or [])
        ] if isinstance(nonprimary, list) else nonprimary,
        "allPositions": [_pos_to_dict(p) for p in (positions_list or [])] if isinstance(positions_list, list) else [],
        "raw": pd,
    }


def _ext_contract(data: dict) -> dict:
    ce = data.get("contractEnd") or {}
    bd = data.get("birthDate") or {}
    return {
        "contractEndUtc": ce.get("utcTime") if isinstance(ce, dict) else ce,
        "contractEndTimezone": ce.get("timezone") if isinstance(ce, dict) else None,
        "birthDateUtc": bd.get("utcTime") if isinstance(bd, dict) else bd,
        "birthDateTimezone": bd.get("timezone") if isinstance(bd, dict) else None,
    }


def _ext_market_values(data: dict) -> dict:
    mv = data.get("marketValues") or {}
    values_raw = mv.get("values") if isinstance(mv, dict) else None
    if not isinstance(values_raw, list):
        return {"count": 0, "values": [], "summary": {}}

    out_vals: list[dict] = []
    for v in values_raw:
        if not isinstance(v, dict):
            continue
        out_vals.append({
            "date": v.get("date"),
            "value": v.get("value"),
            "currency": v.get("currency"),
            "lowerBound": v.get("lowerBound"),
            "upperBound": v.get("upperBound"),
            "source": v.get("source"),
            "teamId": v.get("teamId"),
            "teamName": v.get("teamName"),
            "isPeriodStart": v.get("isPeriodStart"),
            "raw": v,
        })

    summary: dict = {}
    if out_vals:
        first = out_vals[0]
        last = out_vals[-1]
        numeric_values = [v["value"] for v in out_vals if isinstance(v.get("value"), (int, float))]
        highest = max(numeric_values) if numeric_values else None
        lowest = min(numeric_values) if numeric_values else None
        first_v = first.get("value") if isinstance(first.get("value"), (int, float)) else None
        last_v = last.get("value") if isinstance(last.get("value"), (int, float)) else None
        growth = None
        if first_v and last_v and first_v > 0:
            growth = round(((last_v - first_v) / first_v) * 100.0, 2)
        summary = {
            "currentValue": last_v,
            "currentCurrency": last.get("currency"),
            "currentDate": last.get("date"),
            "highestValue": highest,
            "lowestValue": lowest,
            "firstValue": first_v,
            "firstDate": first.get("date"),
            "growthFromFirstPercent": growth,
            "lastUpdated": last.get("date"),
        }

    return {"count": len(out_vals), "values": out_vals, "summary": summary}


def _ext_main_league(data: dict) -> dict:
    ml = data.get("mainLeague") or {}
    if not isinstance(ml, dict):
        return {}
    stats_raw = ml.get("stats") or []
    stats_norm: list[dict] = []
    if isinstance(stats_raw, list):
        for s in stats_raw:
            if not isinstance(s, dict):
                continue
            stats_norm.append({
                "key": s.get("localizedTitleId") or s.get("title"),
                "title": s.get("title"),
                "value": s.get("value"),
                "sourcePath": "pageProps.data.mainLeague.stats[]",
                "raw": s,
            })
    return {
        "leagueId": ml.get("leagueId"),
        "leagueName": ml.get("leagueName"),
        "season": ml.get("season"),
        "stats": stats_norm,
        "statsCount": len(stats_norm),
    }


def _ext_top_stat_card(data: dict) -> list[dict]:
    fss = data.get("firstSeasonStats") or {}
    tsc = fss.get("topStatCard") if isinstance(fss, dict) else None
    if not isinstance(tsc, dict):
        return []
    items = tsc.get("items") or []
    if not isinstance(items, list):
        return []
    out: list[dict] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        out.append({
            "key": it.get("localizedTitleId") or it.get("title"),
            "title": it.get("title"),
            "statValue": it.get("statValue"),
            "statFormat": it.get("statFormat"),
            "per90": it.get("per90"),
            "percentileRank": it.get("percentileRank"),
            "percentileRankPer90": it.get("percentileRankPer90"),
            "sourcePath": "pageProps.data.firstSeasonStats.topStatCard.items[]",
            "raw": it,
        })
    return out


def _ext_stats_sections(data: dict) -> dict:
    """
    statsSection has nested structure:
      statsSection (root)
        items: [
          { title: 'Shooting', items: [ ...metrics ] },
          { title: 'Passing',  items: [ ...metrics ] },
          ...
        ]
    Returns dict keyed by lowercased section title.
    """
    fss = data.get("firstSeasonStats") or {}
    ss = fss.get("statsSection") if isinstance(fss, dict) else None
    if not isinstance(ss, dict):
        return {}

    out: dict[str, dict] = {}
    items = ss.get("items") or []
    if not isinstance(items, list):
        return out

    for sub in items:
        if not isinstance(sub, dict):
            continue
        section_title = sub.get("title") or sub.get("localizedTitleId") or "unknown"
        section_key = (sub.get("localizedTitleId") or section_title).lower().replace(" ", "_")
        section_items = sub.get("items") or []
        metrics: list[dict] = []
        if isinstance(section_items, list):
            for m in section_items:
                if not isinstance(m, dict):
                    continue
                metrics.append({
                    "key": m.get("localizedTitleId") or m.get("title"),
                    "title": m.get("title"),
                    "statValue": m.get("statValue"),
                    "statFormat": m.get("statFormat"),
                    "per90": m.get("per90"),
                    "percentileRank": m.get("percentileRank"),
                    "percentileRankPer90": m.get("percentileRankPer90"),
                    "sourcePath": f"pageProps.data.firstSeasonStats.statsSection.items[{section_key}].items[]",
                    "raw": m,
                })
        out[section_key] = {
            "title": section_title,
            "localizedTitleId": sub.get("localizedTitleId"),
            "type": sub.get("type"),
            "display": sub.get("display"),
            "metrics": metrics,
            "metricsCount": len(metrics),
        }
    return out


def _ext_recent_matches(data: dict) -> list[dict]:
    """Return ALL recent matches with full normalized fields + raw."""
    rm = data.get("recentMatches") or []
    if not isinstance(rm, list):
        return []
    out: list[dict] = []
    for m in rm:
        if not isinstance(m, dict):
            continue
        md = m.get("matchDate")
        date_utc = md.get("utcTime") if isinstance(md, dict) else md
        rp = m.get("ratingProps") or {}
        rating = rp.get("rating") if isinstance(rp, dict) else None
        is_top = rp.get("isTopRating") if isinstance(rp, dict) else None
        out.append({
            "matchId": m.get("id") or m.get("matchId"),
            "matchDate": date_utc,
            "matchPageUrl": m.get("matchPageUrl"),
            "teamId": m.get("teamId"),
            "teamName": m.get("teamName"),
            "opponentTeamId": m.get("opponentTeamId"),
            "opponentTeamName": m.get("opponentTeamName"),
            "isHomeTeam": m.get("isHomeTeam"),
            "leagueId": m.get("leagueId"),
            "leagueName": m.get("leagueName"),
            "stage": m.get("stage"),
            "homeScore": m.get("homeScore"),
            "awayScore": m.get("awayScore"),
            "minutesPlayed": m.get("minutesPlayed"),
            "goals": m.get("goals"),
            "assists": m.get("assists"),
            "yellowCards": m.get("yellowCards"),
            "redCards": m.get("redCards"),
            "rating": rating,
            "isTopRating": is_top,
            "playerOfTheMatch": m.get("playerOfTheMatch"),
            "onBench": m.get("onBench"),
            "raw": m,
        })
    return out


def _ext_career_history(data: dict) -> dict:
    """Full career: keep raw plus build careerBySeason + careerByTeam."""
    ch = data.get("careerHistory") or {}
    if not isinstance(ch, dict):
        return {"raw": {}, "careerBySeason": [], "careerByTeam": []}

    items = ch.get("careerItems") or {}
    season_rows: list[dict] = []
    team_rows: list[dict] = []

    if isinstance(items, dict):
        for category, content in items.items():
            if not isinstance(content, dict):
                continue
            # seasonEntries: per-season rows
            for e in (content.get("seasonEntries") or []):
                if not isinstance(e, dict):
                    continue
                rating = e.get("rating")
                if isinstance(rating, dict):
                    rating_v = rating.get("rating")
                else:
                    rating_v = rating
                ts = e.get("tournamentStats") or []
                tournament_breakdown = []
                if isinstance(ts, list):
                    for t in ts:
                        if not isinstance(t, dict):
                            continue
                        t_rating = t.get("rating")
                        if isinstance(t_rating, dict):
                            t_rating = t_rating.get("rating")
                        tournament_breakdown.append({
                            "tournamentId": t.get("tournamentId"),
                            "leagueId": t.get("leagueId"),
                            "leagueName": t.get("leagueName"),
                            "seasonName": t.get("seasonName"),
                            "isFriendly": t.get("isFriendly"),
                            "appearances": t.get("appearances"),
                            "goals": t.get("goals"),
                            "assists": t.get("assists"),
                            "rating": t_rating,
                        })
                season_rows.append({
                    "category": category,
                    "seasonName": e.get("seasonName"),
                    "team": e.get("team"),
                    "teamId": e.get("teamId"),
                    "teamGender": e.get("teamGender"),
                    "transferType": e.get("transferType"),
                    "appearances": e.get("appearances"),
                    "goals": e.get("goals"),
                    "assists": e.get("assists"),
                    "minutes": e.get("minutes"),
                    "yellowCards": e.get("yellowCards"),
                    "redCards": e.get("redCards"),
                    "rating": rating_v,
                    "tournamentBreakdown": tournament_breakdown,
                    "raw": e,
                })
            # teamEntries: aggregate per team
            for t in (content.get("teamEntries") or []):
                if not isinstance(t, dict):
                    continue
                team_rows.append({
                    "category": category,
                    "teamId": t.get("teamId"),
                    "team": t.get("team"),
                    "teamGender": t.get("teamGender"),
                    "transferType": t.get("transferType"),
                    "startDate": t.get("startDate"),
                    "endDate": t.get("endDate"),
                    "active": t.get("active"),
                    "role": t.get("role"),
                    "appearances": t.get("appearances"),
                    "goals": t.get("goals"),
                    "assists": t.get("assists"),
                    "hasUncertainData": t.get("hasUncertainData"),
                    "raw": t,
                })

    return {
        "showFootnote": ch.get("showFootnote"),
        "fullCareer": ch.get("fullCareer"),
        "careerBySeason": season_rows,
        "careerByTeam": team_rows,
        "careerSeasonCount": len(season_rows),
        "careerTeamCount": len(team_rows),
        "raw": ch,
    }


def _ext_stat_seasons(data: dict) -> list[dict]:
    seasons = data.get("statSeasons") or []
    if not isinstance(seasons, list):
        return []
    out: list[dict] = []
    for s in seasons:
        if not isinstance(s, dict):
            continue
        tournaments = s.get("tournaments") or []
        norm_tournaments = []
        if isinstance(tournaments, list):
            for t in tournaments:
                if not isinstance(t, dict):
                    continue
                norm_tournaments.append({
                    "tournamentId": t.get("tournamentId"),
                    "name": t.get("name"),
                    "localizedName": t.get("localizedName"),
                    "entryId": t.get("entryId"),
                    "hasDeepStats": t.get("hasDeepStats"),
                    "stats": t.get("stats"),
                    "raw": t,
                })
        out.append({
            "seasonName": s.get("seasonName"),
            "tournamentCount": len(norm_tournaments),
            "tournaments": norm_tournaments,
            "raw": s,
        })
    return out


def _ext_traits(data: dict) -> list[dict]:
    tr = data.get("traits") or {}
    items = tr.get("items") if isinstance(tr, dict) else None
    if not isinstance(items, list):
        return []
    out: list[dict] = []
    for t in items:
        if not isinstance(t, dict):
            continue
        out.append({
            "key": t.get("key"),
            "title": t.get("title"),
            "value": t.get("value"),
            "raw": t,
        })
    return out


def _ext_trophies(data: dict) -> dict:
    tro = data.get("trophies") or {}
    if not isinstance(tro, dict):
        return {"playerTrophies": [], "coachTrophies": []}

    def _normalize(group: Any) -> list[dict]:
        if not isinstance(group, list):
            return []
        out: list[dict] = []
        for entry in group:
            if not isinstance(entry, dict):
                continue
            tournaments = entry.get("tournaments") or []
            for t in tournaments:
                if not isinstance(t, dict):
                    continue
                won = t.get("seasonsWon") or []
                ru = t.get("seasonsRunnerUp") or []
                out.append({
                    "ccode": t.get("ccode") or entry.get("ccode"),
                    "leagueId": t.get("leagueId"),
                    "leagueName": t.get("leagueName"),
                    "competition": t.get("leagueName"),
                    "country": t.get("ccode") or entry.get("ccode"),
                    "teamId": entry.get("teamId"),
                    "teamName": entry.get("teamName"),
                    "seasonsWon": won if isinstance(won, list) else [],
                    "seasonsRunnerUp": ru if isinstance(ru, list) else [],
                    "wonCount": len(won) if isinstance(won, list) else 0,
                    "runnerUpCount": len(ru) if isinstance(ru, list) else 0,
                    "raw": t,
                })
        return out

    return {
        "playerTrophies": _normalize(tro.get("playerTrophies")),
        "coachTrophies": _normalize(tro.get("coachTrophies")),
        "rawTopKeys": list(tro.keys()),
    }


def _ext_shotmap(data: dict) -> dict:
    fss = data.get("firstSeasonStats") or {}
    shots = fss.get("shotmap") if isinstance(fss, dict) else None
    if not isinstance(shots, list):
        return {"available": False, "shots": [], "summary": {}}

    total = len(shots)
    on_target = sum(1 for s in shots if isinstance(s, dict) and s.get("isOnTarget"))
    blocked = sum(1 for s in shots if isinstance(s, dict) and s.get("isBlocked"))
    inside_box = sum(1 for s in shots if isinstance(s, dict) and s.get("isFromInsideBox"))
    goals = sum(1 for s in shots if isinstance(s, dict) and s.get("eventType") == "Goal")
    own_goals = sum(1 for s in shots if isinstance(s, dict) and s.get("isOwnGoal"))
    xg_total = 0.0
    xgot_total = 0.0
    avg_x = 0.0
    avg_y = 0.0
    n_xy = 0
    for s in shots:
        if not isinstance(s, dict):
            continue
        xg_total += _to_float(s.get("expectedGoals")) or 0.0
        xgot_total += _to_float(s.get("expectedGoalsOnTarget")) or 0.0
        x = _to_float(s.get("x"))
        y = _to_float(s.get("y"))
        if x is not None and y is not None:
            avg_x += x
            avg_y += y
            n_xy += 1
    summary = {
        "totalShots": total,
        "goals": goals,
        "ownGoals": own_goals,
        "shotsOnTarget": on_target,
        "shotsBlocked": blocked,
        "shotsInsideBox": inside_box,
        "shotsOutsideBox": total - inside_box,
        "xG": round(xg_total, 3),
        "xGOT": round(xgot_total, 3),
        "averageX": round(avg_x / n_xy, 2) if n_xy else None,
        "averageY": round(avg_y / n_xy, 2) if n_xy else None,
    }
    return {"available": True, "count": total, "shots": shots, "summary": summary}


def _ext_heatmap(data: dict) -> dict:
    fss = data.get("firstSeasonStats") or {}
    hm = fss.get("heatmap") if isinstance(fss, dict) else None
    if not isinstance(hm, dict):
        return {"available": False, "summary": {}}
    coords = hm.get("coordinates") or []
    if not isinstance(coords, list):
        return {"available": False, "summary": {}}
    avg_x = 0.0
    avg_y = 0.0
    n = 0
    for c in coords:
        if not isinstance(c, dict):
            continue
        x = _to_float(c.get("x"))
        y = _to_float(c.get("y"))
        if x is not None and y is not None:
            avg_x += x
            avg_y += y
            n += 1
    return {
        "available": n > 0,
        "count": len(coords),
        "coordinates": coords,
        "summary": {
            "points": n,
            "averageX": round(avg_x / n, 2) if n else None,
            "averageY": round(avg_y / n, 2) if n else None,
        },
    }


def _ext_keeper_shotmap(data: dict) -> dict:
    fss = data.get("firstSeasonStats") or {}
    ks = fss.get("keeperShotmap") if isinstance(fss, dict) else None
    if not ks:
        return {"available": False}
    return {"available": True, "raw": ks}


def _ext_next_match(data: dict) -> dict:
    nm = data.get("nextMatch") or {}
    if not isinstance(nm, dict):
        return {}
    md = nm.get("matchDate")
    return {
        "matchId": nm.get("matchId"),
        "homeId": nm.get("homeId"),
        "homeName": nm.get("homeName"),
        "awayId": nm.get("awayId"),
        "awayName": nm.get("awayName"),
        "leagueId": nm.get("leagueId"),
        "statusId": nm.get("statusId"),
        "matchDate": md.get("utcTime") if isinstance(md, dict) else md,
        "raw": nm,
    }


def _ext_related_links(data: dict) -> dict:
    rl = data.get("relatedLinksData") or {}
    if not isinstance(rl, dict):
        return {}
    return {
        "teammatesCount": len(rl.get("teammates", []) or []) if isinstance(rl.get("teammates"), list) else 0,
        "teammates": rl.get("teammates") or [],
        "mensNationalTeam": rl.get("mensNationalTeam"),
        "womensNationalTeam": rl.get("womensNationalTeam"),
    }


# ─── Flattened metrics + role hints ────────────────────────────────────────────

def _build_flattened_metrics(profile: dict) -> dict:
    """Flatten every numeric metric into a single fast-lookup dict."""
    flat: dict[str, dict] = {}

    # mainLeague.stats
    for s in (profile.get("mainLeague", {}).get("stats") or []):
        key = s.get("key") or s.get("title")
        if not key:
            continue
        flat[f"main_league_{key}"] = {
            "value": s.get("value"),
            "label": s.get("title"),
            "category": "mainLeague",
            "sourceSection": "mainLeague.stats",
            "rawKey": key,
        }

    # topStatCard
    for it in (profile.get("topStatCard") or []):
        key = it.get("key")
        if not key:
            continue
        flat[f"top_{key}"] = {
            "value": it.get("statValue"),
            "label": it.get("title"),
            "category": "seasonTop",
            "sourceSection": "firstSeasonStats.topStatCard",
            "rawKey": key,
            "per90": it.get("per90"),
            "percentileRank": it.get("percentileRank"),
        }
        if it.get("per90") is not None:
            flat[f"top_{key}_per90"] = {
                "value": it.get("per90"),
                "label": f"{it.get('title')} per 90",
                "category": "seasonTop",
                "sourceSection": "firstSeasonStats.topStatCard",
                "rawKey": key,
            }
        if it.get("percentileRank") is not None:
            flat[f"top_{key}_pct_rank"] = {
                "value": it.get("percentileRank"),
                "label": f"{it.get('title')} percentile rank",
                "category": "seasonTopRank",
                "sourceSection": "firstSeasonStats.topStatCard",
                "rawKey": key,
            }

    # statsSections.metrics
    for section_key, section in (profile.get("statsSections") or {}).items():
        for m in section.get("metrics", []):
            mkey = m.get("key")
            if not mkey:
                continue
            flat[f"{section_key}_{mkey}"] = {
                "value": m.get("statValue"),
                "label": m.get("title"),
                "category": section_key,
                "sourceSection": f"statsSections.{section_key}",
                "rawKey": mkey,
                "per90": m.get("per90"),
                "percentileRank": m.get("percentileRank"),
            }
            if m.get("per90") is not None:
                flat[f"{section_key}_{mkey}_per90"] = {
                    "value": m.get("per90"),
                    "label": f"{m.get('title')} per 90",
                    "category": section_key,
                    "sourceSection": f"statsSections.{section_key}",
                    "rawKey": mkey,
                }
            if m.get("percentileRank") is not None:
                flat[f"{section_key}_{mkey}_pct_rank"] = {
                    "value": m.get("percentileRank"),
                    "label": f"{m.get('title')} percentile rank",
                    "category": f"{section_key}Rank",
                    "sourceSection": f"statsSections.{section_key}",
                    "rawKey": mkey,
                }

    # Recent aggregates
    rms = profile.get("recentMatches") or []
    flat["recent_matches_count"] = {"value": len(rms), "label": "Recent matches count"}
    if rms:
        goals = sum((_to_int(m.get("goals")) or 0) for m in rms)
        assists = sum((_to_int(m.get("assists")) or 0) for m in rms)
        minutes = sum((_to_int(m.get("minutesPlayed")) or 0) for m in rms)
        yellows = sum((_to_int(m.get("yellowCards")) or 0) for m in rms)
        reds = sum((_to_int(m.get("redCards")) or 0) for m in rms)
        potm = sum(1 for m in rms if m.get("playerOfTheMatch"))
        ratings = [_to_float(m.get("rating")) for m in rms]
        ratings_clean = [r for r in ratings if r is not None]
        avg_rating = round(sum(ratings_clean) / len(ratings_clean), 2) if ratings_clean else None
        flat["recent_goals"] = {"value": goals, "label": "Recent goals"}
        flat["recent_assists"] = {"value": assists, "label": "Recent assists"}
        flat["recent_minutes"] = {"value": minutes, "label": "Recent minutes"}
        flat["recent_yellow_cards"] = {"value": yellows, "label": "Recent yellow cards"}
        flat["recent_red_cards"] = {"value": reds, "label": "Recent red cards"}
        flat["recent_player_of_match_count"] = {"value": potm, "label": "Recent POTM"}
        flat["recent_avg_rating"] = {"value": avg_rating, "label": "Recent avg rating"}

    # Market value highlights
    mv = profile.get("marketValue") or {}
    summary = mv.get("summary") or {}
    if summary:
        for k in ("currentValue", "highestValue", "lowestValue", "firstValue", "growthFromFirstPercent"):
            v = summary.get(k)
            if v is not None:
                flat[f"market_{k}"] = {"value": v, "label": k, "category": "marketValue"}

    # Trophies counts
    tro = profile.get("trophies") or {}
    pt = tro.get("playerTrophies") or []
    if pt:
        won_total = sum(t.get("wonCount", 0) for t in pt)
        ru_total = sum(t.get("runnerUpCount", 0) for t in pt)
        flat["trophies_won_total"] = {"value": won_total, "label": "Trophies won (total)"}
        flat["trophies_runner_up_total"] = {"value": ru_total, "label": "Runner-up total"}
        flat["trophies_competition_count"] = {"value": len(pt), "label": "Trophy competitions"}

    # Career totals
    ch = profile.get("careerHistory") or {}
    by_season = ch.get("careerBySeason") or []
    if by_season:
        flat["career_seasons_count"] = {"value": len(by_season), "label": "Career season entries"}
    by_team = ch.get("careerByTeam") or []
    if by_team:
        flat["career_teams_count"] = {"value": len(by_team), "label": "Career team entries"}

    # Shotmap aggregates
    sm = profile.get("shotmap") or {}
    if sm.get("available"):
        for k, v in (sm.get("summary") or {}).items():
            if v is not None:
                flat[f"shotmap_{k}"] = {"value": v, "label": f"Shotmap {k}", "category": "shotmap"}

    # Heatmap
    hm = profile.get("heatmap") or {}
    if hm.get("available"):
        for k, v in (hm.get("summary") or {}).items():
            if v is not None:
                flat[f"heatmap_{k}"] = {"value": v, "label": f"Heatmap {k}", "category": "heatmap"}

    return flat


def _build_role_hints(profile: dict) -> list[str]:
    """Simple deterministic rules from traits and stats sections."""
    hints: list[str] = []
    traits = {t.get("key"): _to_float(t.get("value")) for t in (profile.get("traits") or []) if t.get("key")}

    def _high(key: str, threshold: float = 0.6) -> bool:
        v = traits.get(key)
        return v is not None and v >= threshold

    if _high("goals") or _high("shot_attempts"):
        hints.append("attacker_finisher")
    if _high("chances_created") or _high("touches"):
        hints.append("creator_winger")
    if _high("defensive_actions"):
        hints.append("defender_workrate")
    if _high("dribbles") or _high("dribbles_succeeded"):
        hints.append("dribbler")
    if _high("aerial_duels_won"):
        hints.append("aerial_threat")
    if _high("save_percent") or _high("clean_sheets"):
        hints.append("goalkeeper")
    return hints


# ─── Unknown but preserved ─────────────────────────────────────────────────────

def _build_unknown_preserved(player_data: dict) -> dict:
    """Capture any non-empty top-level field we did not explicitly extract."""
    out: dict[str, Any] = {}
    for k, v in (player_data or {}).items():
        if k in EXPLICIT_SECTIONS:
            continue
        if _is_empty(v):
            continue
        out[k] = {
            "value": v,
            "sourcePath": f"pageProps.data.{k}",
            "type": type(v).__name__,
        }
    return out


# ─── Quality report ────────────────────────────────────────────────────────────

def _build_quality_report(player_data: dict, profile: dict, raw_size_kb: float) -> dict:
    available = []
    missing = []
    for s in EXPECTED_SECTIONS:
        if _is_empty(player_data.get(s)):
            missing.append(s)
        else:
            available.append(s)

    rep = {
        "rawPayloadSizeKB": raw_size_kb,
        "availableSections": available,
        "missingSections": missing,
        "recentMatchesCount": len(profile.get("recentMatches") or []),
        "mainLeagueStatsCount": (profile.get("mainLeague") or {}).get("statsCount", 0),
        "topStatCardCount": len(profile.get("topStatCard") or []),
        "statsSectionMetricsCount": sum(
            (s.get("metricsCount") or 0)
            for s in (profile.get("statsSections") or {}).values()
        ),
        "careerSeasonEntriesCount": (profile.get("careerHistory") or {}).get("careerSeasonCount", 0),
        "careerTeamEntriesCount": (profile.get("careerHistory") or {}).get("careerTeamCount", 0),
        "marketValuePointsCount": (profile.get("marketValue") or {}).get("count", 0),
        "traitsCount": len(profile.get("traits") or []),
        "trophiesCount": len((profile.get("trophies") or {}).get("playerTrophies") or []),
        "flattenedMetricsCount": len(profile.get("flattenedMetrics") or {}),
        "shotmapShotsCount": (profile.get("shotmap") or {}).get("count", 0),
        "heatmapCoordsCount": (profile.get("heatmap") or {}).get("count", 0),
        "warnings": [],
    }

    if rep["flattenedMetricsCount"] < 50:
        rep["warnings"].append("LOW_METRIC_COUNT_CHECK_EXTRACTION")
    if rep["recentMatchesCount"] == 0 and "recentMatches" not in missing:
        rep["warnings"].append("RECENT_MATCHES_EMPTY_BUT_PRESENT")
    if rep["statsSectionMetricsCount"] == 0:
        rep["warnings"].append("STATS_SECTION_EMPTY")

    return rep


# ─── Master builder ────────────────────────────────────────────────────────────

def build_mega_profile(raw_next_data: dict, player_id: int, name: Optional[str]) -> dict:
    page_props = raw_next_data.get("pageProps") or {}
    player_data = page_props.get("data") or {}
    if not isinstance(player_data, dict):
        player_data = {}

    raw_size_kb = round(len(json.dumps(raw_next_data, ensure_ascii=False)) / 1024, 1)

    profile: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "source": "fotmob",
        "method": "next_data",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "player": _ext_player_root(player_data),
        "identity": _ext_identity(player_data),
        "bio": _ext_bio(player_data),
        "club": _ext_club(player_data),
        "position": _ext_position(player_data),
        "contract": _ext_contract(player_data),
        "marketValue": _ext_market_values(player_data),
        "images": {
            "playerImage": f"https://images.fotmob.com/image_resources/playerimages/{player_id}.png",
            "teamLogo": (
                f"https://images.fotmob.com/image_resources/logo/teamlogo/{(player_data.get('primaryTeam') or {}).get('teamId')}.png"
                if (player_data.get("primaryTeam") or {}).get("teamId") else None
            ),
        },
        "mainLeague": _ext_main_league(player_data),
        "topStatCard": _ext_top_stat_card(player_data),
        "statsSections": _ext_stats_sections(player_data),
        "recentMatches": _ext_recent_matches(player_data),
        "careerHistory": _ext_career_history(player_data),
        "statSeasons": _ext_stat_seasons(player_data),
        "trophies": _ext_trophies(player_data),
        "traits": _ext_traits(player_data),
        "shotmap": _ext_shotmap(player_data),
        "heatmap": _ext_heatmap(player_data),
        "keeperShotmap": _ext_keeper_shotmap(player_data),
        "nextMatch": _ext_next_match(player_data),
        "relatedLinks": _ext_related_links(player_data),
        "rawColumns": {
            "topLevelKeys": list(raw_next_data.keys()),
            "pagePropsKeys": list(page_props.keys()),
            "dataKeys": list(player_data.keys()),
        },
        "rawPayloadPath": str(CACHE_DIR / f"{player_id}.json"),
        "rawPayloadSizeKB": raw_size_kb,
    }

    profile["unknownButPreserved"] = _build_unknown_preserved(player_data)
    profile["flattenedMetrics"] = _build_flattened_metrics(profile)
    profile["roleHints"] = _build_role_hints(profile)
    profile["qualityReport"] = _build_quality_report(player_data, profile, raw_size_kb)

    return profile


def build_summary(profile: dict) -> dict:
    """Compact summary for fast UI consumption."""
    flat = profile.get("flattenedMetrics") or {}
    qr = profile.get("qualityReport") or {}
    bio = profile.get("bio") or {}
    identity = profile.get("identity") or {}
    ml = profile.get("mainLeague") or {}

    # Top metrics by percentile rank
    top_ranks = []
    for key, m in flat.items():
        pct = m.get("percentileRank") if isinstance(m, dict) else None
        if pct is not None:
            top_ranks.append((key, m.get("label"), m.get("value"), pct))
    top_ranks.sort(key=lambda x: x[3] if x[3] is not None else 0, reverse=True)

    return {
        "schemaVersion": SCHEMA_VERSION,
        "source": "fotmob",
        "generatedAt": profile.get("generatedAt"),
        "player": {
            "id": identity.get("id"),
            "name": identity.get("name"),
            "club": identity.get("primaryTeamName"),
            "position": identity.get("primaryPositionLabel"),
            "country": bio.get("country"),
            "age": bio.get("age"),
            "preferredFoot": bio.get("preferredFoot"),
            "height": bio.get("height"),
            "shirt": bio.get("shirt"),
            "transferValue": bio.get("transferValue"),
        },
        "mainLeague": {
            "leagueName": ml.get("leagueName"),
            "season": ml.get("season"),
            "stats": [
                {"title": s.get("title"), "value": s.get("value")}
                for s in (ml.get("stats") or [])
            ],
        },
        "headlineMetrics": [
            {"key": k, "label": label, "value": v, "percentileRank": pct}
            for k, label, v, pct in top_ranks[:12]
        ],
        "roleHints": profile.get("roleHints") or [],
        "qualityReport": qr,
        "imageUrl": (profile.get("images") or {}).get("playerImage"),
        "rawPayloadPath": profile.get("rawPayloadPath"),
        "rawPayloadSizeKB": profile.get("rawPayloadSizeKB"),
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def run(player_id: int, name: Optional[str], output_dir: Optional[Path] = None) -> Optional[dict]:
    raw = _load_or_fetch_raw(player_id, name)
    if raw is None:
        return None

    profile = build_mega_profile(raw, player_id, name)
    summary = build_summary(profile)

    out_dir = output_dir or OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = _slugify(name or (profile.get("identity") or {}).get("name") or f"player-{player_id}")

    full_path = out_dir / f"{slug}.json"
    summary_path = out_dir / f"{slug}.summary.json"
    full_path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    qr = profile.get("qualityReport") or {}
    print()
    print("=" * 70)
    print(f"  Mega Profile built: {slug}")
    print("=" * 70)
    print(f"  Player:                 {(profile.get('identity') or {}).get('name')}")
    print(f"  Club:                   {(profile.get('identity') or {}).get('primaryTeamName')}")
    print(f"  Position:               {(profile.get('identity') or {}).get('primaryPositionLabel')}")
    print(f"  RawPayloadSizeKB:       {qr.get('rawPayloadSizeKB')}")
    print(f"  recentMatchesCount:     {qr.get('recentMatchesCount')}")
    print(f"  mainLeagueStatsCount:   {qr.get('mainLeagueStatsCount')}")
    print(f"  topStatCardCount:       {qr.get('topStatCardCount')}")
    print(f"  statsSectionMetrics:    {qr.get('statsSectionMetricsCount')}")
    print(f"  careerSeasonEntries:    {qr.get('careerSeasonEntriesCount')}")
    print(f"  careerTeamEntries:      {qr.get('careerTeamEntriesCount')}")
    print(f"  marketValuePoints:      {qr.get('marketValuePointsCount')}")
    print(f"  traitsCount:            {qr.get('traitsCount')}")
    print(f"  trophiesCount:          {qr.get('trophiesCount')}")
    print(f"  shotmapShotsCount:      {qr.get('shotmapShotsCount')}")
    print(f"  heatmapCoordsCount:     {qr.get('heatmapCoordsCount')}")
    print(f"  flattenedMetricsCount:  {qr.get('flattenedMetricsCount')}")
    print(f"  warnings:               {qr.get('warnings')}")
    print(f"  availableSections({len(qr.get('availableSections') or [])}): {qr.get('availableSections')}")
    print(f"  missingSections({len(qr.get('missingSections') or [])}): {qr.get('missingSections')}")
    print(f"  Output (full):          {full_path}")
    print(f"  Output (summary):       {summary_path}")
    print()
    return profile


def main() -> None:
    parser = argparse.ArgumentParser(description="FotMob Mega Player Profile builder")
    parser.add_argument("--player-id", type=int, required=True)
    parser.add_argument("--name", type=str, default=None)
    parser.add_argument("--output-dir", type=str, default=None)
    args = parser.parse_args()

    out_dir = Path(args.output_dir) if args.output_dir else None
    profile = run(args.player_id, args.name, out_dir)
    if profile is None:
        sys.exit(1)


if __name__ == "__main__":
    main()
