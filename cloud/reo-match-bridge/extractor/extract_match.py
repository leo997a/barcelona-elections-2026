"""
REO SHOW Match Stats Extractor v2.0
Extracts matchCentreData from sport360.whoscored.com
Usage: python extract_match.py [URL]
"""

import sys
import io

# Force UTF-8 output - must be first to avoid CMD encoding errors
try:
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'buffer'):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
except Exception:
    pass

import os
import json
import time
import random
import re
import argparse
import base64
import threading
import webbrowser
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional, List, Dict, Any

# ── Try undetected_chromedriver first, fall back to selenium ──────────────────
try:
    import undetected_chromedriver as uc
    USE_UC = True
    def _safe_uc_chrome_del(self):
        try:
            self.quit()
        except Exception:
            pass
    uc.Chrome.__del__ = _safe_uc_chrome_del
    print("[OK] Using undetected_chromedriver (stealth mode)")
except ImportError:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        HAS_WEBDRIVER_MANAGER = True
    except ImportError:
        HAS_WEBDRIVER_MANAGER = False
    USE_UC = False
    print("[WARN] Using standard selenium")

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
LATEST_FILE = OUTPUT_DIR / "latest_match_stats.json"

WAIT_TIMEOUT = 30
EXTRA_WAIT   = 8
MIN_DELAY    = 2
MAX_DELAY    = 4
DEFAULT_INTERVAL = 60
DEFAULT_PORT = 3005
DEFAULT_SITE_URL = "https://peachpuff-herring-712997.hostingersite.com"

LIVE_STATE: Dict[str, Any] = {
    "ok": True,
    "hasData": False,
    "currentUrl": None,
    "pollingActive": False,
    "pollIntervalMs": DEFAULT_INTERVAL * 1000,
    "lastUpdatedAt": None,
    "nextPollAt": None,
    "isFetching": False,
    "lastError": None,
    "outputFile": str(LATEST_FILE),
    "bridgePort": DEFAULT_PORT,
    "apiUrl": f"http://127.0.0.1:{DEFAULT_PORT}/api/match",
    "statusUrl": f"http://127.0.0.1:{DEFAULT_PORT}/api/status",
    "match": None,
    "eventCount": 0,
}
LIVE_DATA: Optional[Dict[str, Any]] = None
LIVE_LOCK = threading.Lock()


# ─────────────────────────────────────────────────────────────────────────────
# Driver Setup
# ─────────────────────────────────────────────────────────────────────────────
def get_stealth_driver(headless: bool = True):
    """Create a stealth Chrome driver."""
    if USE_UC:
        options = uc.ChromeOptions()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--lang=ar-SA,ar;q=0.9,en;q=0.8")
        if headless:
            options.add_argument("--headless=new")
        driver = uc.Chrome(options=options)
    else:
        options = Options()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        options.add_argument("--lang=ar-SA,ar;q=0.9,en;q=0.8")
        options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        if headless:
            options.add_argument("--headless=new")
        if HAS_WEBDRIVER_MANAGER:
            driver = webdriver.Chrome(
                service=Service(ChromeDriverManager().install()), options=options
            )
        else:
            driver = webdriver.Chrome(options=options)

    driver.execute_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )
    return driver


# ─────────────────────────────────────────────────────────────────────────────
# JSON Extraction
# ─────────────────────────────────────────────────────────────────────────────
def extract_json_from_source(page_source: str) -> Optional[Dict]:
    """Find and parse the matchCentreData JSON blob from page source."""
    soup = BeautifulSoup(page_source, "html.parser")

    for script in soup.find_all("script"):
        text = script.string or ""
        if "matchCentreData" not in text:
            continue

        print("  [OK] Found script tag with matchCentreData")
        try:
            idx = text.find("matchCentreData:")
            if idx == -1:
                continue
            json_start = text.find("{", idx)
            if json_start == -1:
                continue

            # Walk forward counting braces to find the matching closing brace
            depth = 0
            json_end = json_start
            in_string = False
            escape_next = False
            for i, ch in enumerate(text[json_start:], start=json_start):
                if escape_next:
                    escape_next = False
                    continue
                if ch == "\\":
                    escape_next = True
                    continue
                if ch == '"' and not escape_next:
                    in_string = not in_string
                if not in_string:
                    if ch == "{":
                        depth += 1
                    elif ch == "}":
                        depth -= 1
                        if depth == 0:
                            json_end = i + 1
                            break

            json_str = text[json_start:json_end]
            data = json.loads(json_str)
            print(f"  [OK] Parsed matchCentreData ({len(json_str):,} chars)")
            return data

        except Exception as e:
            print(f"  [WARN] Primary parse failed: {e}")
            try:
                _, _, after = text.partition("matchCentreData:")
                json_str = "{" + after.strip().lstrip("{ \n").split(",\n")[0]
                return json.loads(json_str)
            except Exception:
                continue

    print("  [FAIL] matchCentreData not found in any script tag")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Stats Processing
# ─────────────────────────────────────────────────────────────────────────────
def safe_float(value, fallback=0.0):
    try:
        if value is None:
            return fallback
        return float(value)
    except (TypeError, ValueError):
        return fallback


def safe_int(value, fallback=0):
    try:
        if value is None:
            return fallback
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return fallback


def team_logo_url(team_id) -> str:
    if team_id is None or str(team_id).strip() == "":
        return ""
    return f"https://d2zywfiolv4f83.cloudfront.net/img/teams/{team_id}.png"


def qualifier_names(evt: Dict) -> set:
    names = set()
    for qualifier in evt.get("qualifiers", []) or []:
        q_type = qualifier.get("type", qualifier) if isinstance(qualifier, dict) else qualifier
        if isinstance(q_type, dict):
            value = q_type.get("displayName") or q_type.get("value") or q_type.get("name")
        else:
            value = q_type
        if value:
            names.add(str(value))
    return names


def flatten_event_tokens(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, (str, int, float, bool)):
        return [str(value)]
    if isinstance(value, list):
        tokens = []
        for item in value:
            tokens.extend(flatten_event_tokens(item))
        return tokens
    if isinstance(value, dict):
        tokens = []
        for item in value.values():
            tokens.extend(flatten_event_tokens(item))
        return tokens
    return []


def is_key_pass_event(evt: Dict, etype: str, qualifiers: set) -> bool:
    if any(bool(evt.get(key)) for key in ("isKeyPass", "keyPass", "isAssist", "isGoalAssist", "goalAssist")):
        return True
    combined = " ".join(
        [etype]
        + list(qualifiers)
        + flatten_event_tokens(evt.get("satisfiedEventsTypes"))
        + flatten_event_tokens(evt.get("qualifiers"))
    ).lower()
    key_tokens = (
        "keypass",
        "key pass",
        "chancecreated",
        "chance created",
        "bigchancecreated",
        "big chance created",
        "intentionalassist",
        "intentional assist",
        "goalassist",
        "goal assist",
        "assist",
    )
    return any(token in combined for token in key_tokens)


def same_team(left, right) -> bool:
    return str(left) == str(right)


def process_events(events: List, player_dict: Dict) -> Dict:
    """Count events per team/player and return structured stats."""
    team_stats: Dict = {}
    player_stats: Dict = {}

    for evt in events:
        team_id   = evt.get("teamId")
        player_id = str(evt.get("playerId", "")) if evt.get("playerId") else None
        etype     = (evt.get("type", {}).get("displayName", "")
                     if isinstance(evt.get("type"), dict)
                     else str(evt.get("type", "")))
        outcome   = (evt.get("outcomeType", {}).get("displayName", "")
                     if isinstance(evt.get("outcomeType"), dict)
                     else str(evt.get("outcomeType", "")))

        if team_id is None:
            continue

        if team_id not in team_stats:
            team_stats[team_id] = {
                "shots": 0, "shotsOnTarget": 0, "goals": 0,
                "shotsOffTarget": 0, "blockedShots": 0, "woodwork": 0,
                "passes": 0, "passesAccurate": 0,
                "corners": 0, "fouls": 0, "offsides": 0,
                "yellowCards": 0, "redCards": 0,
                "tackles": 0, "interceptions": 0,
                "aerialWon": 0, "aerialLost": 0,
                "clearances": 0, "keyPasses": 0,
                "dribbles": 0, "saves": 0,
                "crosses": 0, "longBalls": 0, "throughBalls": 0,
                "finalThirdEntries": 0, "boxTouches": 0,
                "blocks": 0, "ballRecoveries": 0,
                "dispossessed": 0, "turnovers": 0,
            }

        if player_id and player_id not in player_stats:
            player_stats[player_id] = {
                "id": player_id,
                "playerId": player_id,
                "name": player_dict.get(player_id, f"Player {player_id}"),
                "teamId": team_id,
                "shots": 0, "shotsOnTarget": 0, "shotsOffTarget": 0,
                "blockedShots": 0, "woodwork": 0, "goals": 0,
                "assists": 0, "passes": 0, "passesAccurate": 0, "passAccuracy": 0,
                "keyPasses": 0, "dribbles": 0, "dribbleSuccess": 0,
                "dribbleSuccessRate": 0, "crosses": 0, "longBalls": 0,
                "throughBalls": 0, "finalThirdPasses": 0, "boxTouches": 0,
                "tackles": 0, "interceptions": 0,
                "aerialWon": 0, "aerialLost": 0,
                "foulsCommitted": 0, "clearances": 0, "blocks": 0, "saves": 0,
                "ballRecoveries": 0, "dispossessed": 0, "turnovers": 0,
                "shotAccuracy": 0,
                "yellowCard": False, "redCard": False,
                "position": None,
            }

        ts = team_stats[team_id]
        ps = player_stats.get(player_id, {}) if player_id else {}
        ok = outcome in ("Successful", "Success", "SuccessInPlay", "SuccessOut")
        qualifiers = qualifier_names(evt)
        key_pass_signal = is_key_pass_event(evt, etype, qualifiers)
        x = safe_float(evt.get("x"))
        y = safe_float(evt.get("y"))
        end_x = safe_float(evt.get("endX"))

        if x >= 83 and 20 <= y <= 80:
            ts["boxTouches"] += 1
            if ps:
                ps["boxTouches"] += 1

        if etype == "Pass":
            ts["passes"] += 1
            if ok:
                ts["passesAccurate"] += 1
            if "Cross" in qualifiers:
                ts["crosses"] += 1
                if ps:
                    ps["crosses"] += 1
            if "Longball" in qualifiers or "LongBall" in qualifiers:
                ts["longBalls"] += 1
                if ps:
                    ps["longBalls"] += 1
            if "Throughball" in qualifiers or "ThroughBall" in qualifiers:
                ts["throughBalls"] += 1
                if ps:
                    ps["throughBalls"] += 1
            if end_x >= 66 and x < 66:
                ts["finalThirdEntries"] += 1
                if ps:
                    ps["finalThirdPasses"] += 1
            if key_pass_signal:
                ts["keyPasses"] += 1
                if ps:
                    ps["keyPasses"] += 1
            if ps:
                ps["passes"] += 1
                if ok:
                    ps["passesAccurate"] += 1

        elif etype in ("SavedShot", "MissedShots", "BlockedShot", "ShotOnPost"):
            ts["shots"] += 1
            if ps:
                ps["shots"] += 1
            if etype == "SavedShot":
                ts["shotsOnTarget"] += 1
                if ps:
                    ps["shotsOnTarget"] += 1
            elif etype == "BlockedShot":
                ts["blockedShots"] += 1
                if ps:
                    ps["blockedShots"] += 1
            else:
                ts["shotsOffTarget"] += 1
                if ps:
                    ps["shotsOffTarget"] += 1
                if etype == "ShotOnPost":
                    ts["woodwork"] += 1
                    if ps:
                        ps["woodwork"] += 1

        elif etype == "Goal":
            ts["goals"] += 1
            ts["shots"] += 1
            ts["shotsOnTarget"] += 1
            if ps:
                ps["goals"] += 1
                ps["shots"] += 1
                ps["shotsOnTarget"] += 1

        elif etype == "CornerAwarded":
            ts["corners"] += 1

        elif etype == "Foul":
            ts["fouls"] += 1
            if ps:
                ps["foulsCommitted"] += 1

        elif etype == "Offside":
            ts["offsides"] += 1

        elif etype == "YellowCard":
            ts["yellowCards"] += 1
            if ps:
                ps["yellowCard"] = True

        elif etype in ("RedCard", "YellowRedCard"):
            ts["redCards"] += 1
            if ps:
                ps["redCard"] = True

        elif etype == "Tackle":
            ts["tackles"] += 1
            if ps:
                ps["tackles"] += 1

        elif etype == "Interception":
            ts["interceptions"] += 1
            if ps:
                ps["interceptions"] += 1

        elif etype == "Aerial":
            if ok:
                ts["aerialWon"] += 1
                if ps:
                    ps["aerialWon"] += 1
            else:
                ts["aerialLost"] += 1
                if ps:
                    ps["aerialLost"] += 1

        elif etype == "Clearance":
            ts["clearances"] += 1
            if ps:
                ps["clearances"] += 1

        elif etype == "KeyPass":
            ts["keyPasses"] += 1
            if ps:
                ps["keyPasses"] += 1

        elif etype in ("TakeOn", "Dribble"):
            if ok:
                ts["dribbles"] += 1
                if ps:
                    ps["dribbles"] += 1
                    ps["dribbleSuccess"] += 1

        elif etype == "Save":
            ts["saves"] += 1
            if ps:
                ps["saves"] += 1

        elif etype in ("BlockedPass", "Block"):
            ts["blocks"] += 1
            if ps:
                ps["blocks"] += 1

        elif etype == "BallRecovery":
            ts["ballRecoveries"] += 1
            if ps:
                ps["ballRecoveries"] += 1

        elif etype == "Dispossessed":
            ts["dispossessed"] += 1
            if ps:
                ps["dispossessed"] += 1

        elif etype == "Turnover":
            ts["turnovers"] += 1
            if ps:
                ps["turnovers"] += 1

    for pdata in player_stats.values():
        if pdata["passes"] > 0:
            pdata["passAccuracy"] = round(pdata["passesAccurate"] / pdata["passes"] * 100, 1)
        if pdata["shots"] > 0:
            pdata["shotAccuracy"] = round(pdata["shotsOnTarget"] / pdata["shots"] * 100, 1)
        dribble_attempts = pdata["dribbles"] + pdata["dispossessed"]
        if dribble_attempts > 0:
            pdata["dribbleSuccessRate"] = round(pdata["dribbles"] / dribble_attempts * 100, 1)

    return {"teamStats": team_stats, "playerStats": player_stats}


# ─────────────────────────────────────────────────────────────────────────────
# Build Output
# ─────────────────────────────────────────────────────────────────────────────
def build_output(raw: Dict) -> Dict:
    """Transform raw matchCentreData into clean broadcast-ready JSON."""
    print("\n[INFO] Processing match data...")

    home = raw.get("home", {})
    away = raw.get("away", {})
    home_name = home.get("name", raw.get("homeTeamName", "Home"))
    away_name = away.get("name", raw.get("awayTeamName", "Away"))
    home_id   = home.get("teamId", raw.get("homeTeamId"))
    away_id   = away.get("teamId", raw.get("awayTeamId"))

    score_str = raw.get("score", "")
    if score_str and "-" in str(score_str):
        parts = str(score_str).split("-")
        home_score_str = parts[0].strip()
        away_score_str = parts[1].strip()
    else:
        home_score_str = str(raw.get("homeScore", "0"))
        away_score_str = str(raw.get("awayScore", "0"))
    raw_home_score = safe_int(home_score_str)
    raw_away_score = safe_int(away_score_str)

    print(f"  Home: {home_name} (ID: {home_id})")
    print(f"  Away: {away_name} (ID: {away_id})")
    print(f"  Score: {home_score_str} - {away_score_str}")

    player_dict = {str(k): v for k, v in raw.get("playerIdNameDictionary", {}).items()}
    print(f"  Players in dictionary: {len(player_dict)}")

    player_positions: Dict = {}
    player_shirt_numbers: Dict = {}

    for side_key in ["home", "away"]:
        side = raw.get(side_key, {})
        for player in side.get("players", []):
            pid = str(player.get("playerId", ""))
            if not pid:
                continue
            player_positions[pid] = player.get("position", player.get("field", ""))
            player_shirt_numbers[pid] = player.get("shirtNo", "")

    events = raw.get("events", [])
    print(f"  Total events: {len(events)}")
    processed = process_events(events, player_dict)
    ts = processed["teamStats"]
    ps = processed["playerStats"]
    status_code = str(raw.get("statusCode", "")).strip()
    minute_candidates = [
        raw.get("minute"),
        raw.get("currentMinute"),
        raw.get("expandedMinute"),
        raw.get("matchMinute"),
        raw.get("elapsed"),
    ]
    event_minutes = [safe_int(evt.get("minute"), 0) for evt in events if safe_int(evt.get("minute"), 0) > 0]
    match_minute = max([safe_int(value, 0) for value in minute_candidates] + event_minutes + [0])
    is_final = status_code.lower() in {"6", "ft", "fulltime", "full time", "final", "finished", "postmatch", "post-match"}
    clock_value = raw.get("clock") or raw.get("matchTime") or raw.get("matchClock") or ""
    display_status = "انتهت" if is_final else (f"{match_minute}'" if match_minute else (status_code or "LIVE"))

    for pid, pdata in ps.items():
        if pid in player_positions:
            pdata["position"] = player_positions[pid]
        if pid in player_shirt_numbers:
            pdata["shirtNo"] = player_shirt_numbers[pid]

    # Possession
    home_possession = raw.get("homePossession", None)
    away_possession = raw.get("awayPossession", None)
    if home_possession is None and home_id and away_id:
        hp = ts.get(home_id, {}).get("passes", 1)
        ap = ts.get(away_id, {}).get("passes", 1)
        total = hp + ap
        if total > 0:
            home_possession = round(hp / total * 100, 1)
            away_possession = round(100 - home_possession, 1)

    # Goal and card events
    goal_events = []
    card_events = []
    for evt in events:
        etype = (evt.get("type", {}).get("displayName", "")
                 if isinstance(evt.get("type"), dict)
                 else str(evt.get("type", "")))
        pid = str(evt.get("playerId", ""))
        if etype == "Goal":
            goal_events.append({
                "minute":    evt.get("minute", 0),
                "addedTime": evt.get("addedTime", 0),
                "player":    player_dict.get(pid, "Unknown"),
                "teamId":    evt.get("teamId"),
                "isOwnGoal": evt.get("isOwnGoal", False),
            })
        elif etype in ("YellowCard", "RedCard", "YellowRedCard"):
            card_events.append({
                "minute":   evt.get("minute", 0),
                "player":   player_dict.get(pid, "Unknown"),
                "teamId":   evt.get("teamId"),
                "cardType": etype,
            })

    event_home_score = 0
    event_away_score = 0
    for goal in goal_events:
        team_id = goal.get("teamId")
        is_own_goal = bool(goal.get("isOwnGoal", False))
        if same_team(team_id, home_id):
            if is_own_goal:
                event_away_score += 1
            else:
                event_home_score += 1
        elif same_team(team_id, away_id):
            if is_own_goal:
                event_home_score += 1
            else:
                event_away_score += 1

    if event_home_score + event_away_score > raw_home_score + raw_away_score:
        final_home_score = event_home_score
        final_away_score = event_away_score
        score_source = "goal_events"
    else:
        final_home_score = raw_home_score
        final_away_score = raw_away_score
        score_source = "raw_score"

    if (final_home_score, final_away_score) != (raw_home_score, raw_away_score):
        print(
            f"  [FIX] Raw score {raw_home_score}-{raw_away_score} adjusted to "
            f"{final_home_score}-{final_away_score} from goal events"
        )

    def get_team_stats(team_id):
        s = ts.get(team_id, {})
        total_shots = s.get("shots", 0)
        pass_acc = 0
        if s.get("passes", 0) > 0:
            pass_acc = round(s.get("passesAccurate", 0) / s["passes"] * 100, 1)
        shot_acc = round(s.get("shotsOnTarget", 0) / total_shots * 100, 1) if total_shots > 0 else 0
        aerial_total = s.get("aerialWon", 0) + s.get("aerialLost", 0)
        aerial_rate = round(s.get("aerialWon", 0) / aerial_total * 100, 1) if aerial_total > 0 else 0
        dribble_attempts = s.get("dribbles", 0) + s.get("dispossessed", 0)
        dribble_rate = round(s.get("dribbles", 0) / dribble_attempts * 100, 1) if dribble_attempts > 0 else 0
        return {
            "possession":      None,
            "goals":           s.get("goals", 0),
            "shots":           total_shots,
            "shotsOnTarget":   s.get("shotsOnTarget", 0),
            "shotsOffTarget":  s.get("shotsOffTarget", 0),
            "blockedShots":    s.get("blockedShots", 0),
            "woodwork":        s.get("woodwork", 0),
            "shotAccuracy":    shot_acc,
            "passes":          s.get("passes", 0),
            "passesAccurate":  s.get("passesAccurate", 0),
            "passAccuracy":    pass_acc,
            "corners":         s.get("corners", 0),
            "crosses":         s.get("crosses", 0),
            "longBalls":       s.get("longBalls", 0),
            "throughBalls":    s.get("throughBalls", 0),
            "fouls":           s.get("fouls", 0),
            "offsides":        s.get("offsides", 0),
            "yellowCards":     s.get("yellowCards", 0),
            "redCards":        s.get("redCards", 0),
            "cards":           s.get("yellowCards", 0) + s.get("redCards", 0),
            "tackles":         s.get("tackles", 0),
            "interceptions":   s.get("interceptions", 0),
            "aerialWon":       s.get("aerialWon", 0),
            "aerialLost":      s.get("aerialLost", 0),
            "aerialWinRate":   aerial_rate,
            "clearances":      s.get("clearances", 0),
            "keyPasses":       s.get("keyPasses", 0),
            "dribbles":        s.get("dribbles", 0),
            "dribbleSuccessRate": dribble_rate,
            "saves":           s.get("saves", 0),
            "saveRate":        0,
            "finalThirdEntries": s.get("finalThirdEntries", 0),
            "boxTouches":      s.get("boxTouches", 0),
            "blocks":          s.get("blocks", 0),
            "ballRecoveries":  s.get("ballRecoveries", 0),
            "dispossessed":    s.get("dispossessed", 0),
            "turnovers":       s.get("turnovers", 0),
        }

    home_stats = get_team_stats(home_id)
    away_stats = get_team_stats(away_id)
    home_stats["possession"] = home_possession
    away_stats["possession"] = away_possession
    home_stats["goals"] = final_home_score
    away_stats["goals"] = final_away_score
    if away_stats["shotsOnTarget"] > 0:
        home_stats["saveRate"] = round(home_stats["saves"] / away_stats["shotsOnTarget"] * 100, 1)
    if home_stats["shotsOnTarget"] > 0:
        away_stats["saveRate"] = round(away_stats["saves"] / home_stats["shotsOnTarget"] * 100, 1)

    def player_activity_score(player):
        return (
            player.get("goals", 0) * 100
            + player.get("assists", 0) * 80
            + player.get("shotsOnTarget", 0) * 20
            + player.get("shots", 0) * 10
            + player.get("keyPasses", 0) * 14
            + player.get("passesAccurate", 0)
            + player.get("dribbles", 0) * 8
            + player.get("tackles", 0) * 8
            + player.get("interceptions", 0) * 8
            + player.get("clearances", 0) * 5
            + player.get("ballRecoveries", 0) * 4
            + player.get("saves", 0) * 20
        )

    home_players = sorted(
        [p for p in ps.values() if p["teamId"] == home_id],
        key=player_activity_score, reverse=True
    )
    away_players = sorted(
        [p for p in ps.values() if p["teamId"] == away_id],
        key=player_activity_score, reverse=True
    )

    def stat_item(key, label, home_value, away_value, group, suffix=""):
        return {
            "key": key,
            "label": label,
            "home": home_value,
            "away": away_value,
            "group": group,
            "suffix": suffix,
        }

    advanced_stats = [
        stat_item("possession", "Possession", home_stats["possession"], away_stats["possession"], "control", "%"),
        stat_item("passes", "Passes", home_stats["passes"], away_stats["passes"], "control"),
        stat_item("passesAccurate", "Accurate passes", home_stats["passesAccurate"], away_stats["passesAccurate"], "control"),
        stat_item("passAccuracy", "Pass accuracy", home_stats["passAccuracy"], away_stats["passAccuracy"], "control", "%"),
        stat_item("finalThirdEntries", "Final third entries", home_stats["finalThirdEntries"], away_stats["finalThirdEntries"], "control"),
        stat_item("ballRecoveries", "Ball recoveries", home_stats["ballRecoveries"], away_stats["ballRecoveries"], "control"),
        stat_item("shots", "Shots", home_stats["shots"], away_stats["shots"], "attack"),
        stat_item("shotsOnTarget", "Shots on target", home_stats["shotsOnTarget"], away_stats["shotsOnTarget"], "attack"),
        stat_item("shotsOffTarget", "Shots off target", home_stats["shotsOffTarget"], away_stats["shotsOffTarget"], "attack"),
        stat_item("blockedShots", "Blocked shots", home_stats["blockedShots"], away_stats["blockedShots"], "attack"),
        stat_item("shotAccuracy", "Shot accuracy", home_stats["shotAccuracy"], away_stats["shotAccuracy"], "attack", "%"),
        stat_item("keyPasses", "Key passes", home_stats["keyPasses"], away_stats["keyPasses"], "attack"),
        stat_item("boxTouches", "Box touches", home_stats["boxTouches"], away_stats["boxTouches"], "attack"),
        stat_item("corners", "Corners", home_stats["corners"], away_stats["corners"], "passing"),
        stat_item("crosses", "Crosses", home_stats["crosses"], away_stats["crosses"], "passing"),
        stat_item("longBalls", "Long balls", home_stats["longBalls"], away_stats["longBalls"], "passing"),
        stat_item("throughBalls", "Through balls", home_stats["throughBalls"], away_stats["throughBalls"], "passing"),
        stat_item("dribbles", "Successful dribbles", home_stats["dribbles"], away_stats["dribbles"], "passing"),
        stat_item("dribbleSuccessRate", "Dribble success", home_stats["dribbleSuccessRate"], away_stats["dribbleSuccessRate"], "passing", "%"),
        stat_item("tackles", "Tackles", home_stats["tackles"], away_stats["tackles"], "defense"),
        stat_item("interceptions", "Interceptions", home_stats["interceptions"], away_stats["interceptions"], "defense"),
        stat_item("clearances", "Clearances", home_stats["clearances"], away_stats["clearances"], "defense"),
        stat_item("blocks", "Blocks", home_stats["blocks"], away_stats["blocks"], "defense"),
        stat_item("aerialWon", "Aerials won", home_stats["aerialWon"], away_stats["aerialWon"], "defense"),
        stat_item("aerialWinRate", "Aerial win rate", home_stats["aerialWinRate"], away_stats["aerialWinRate"], "defense", "%"),
        stat_item("saves", "Saves", home_stats["saves"], away_stats["saves"], "discipline"),
        stat_item("saveRate", "Save rate", home_stats["saveRate"], away_stats["saveRate"], "discipline", "%"),
        stat_item("fouls", "Fouls", home_stats["fouls"], away_stats["fouls"], "discipline"),
        stat_item("offsides", "Offsides", home_stats["offsides"], away_stats["offsides"], "discipline"),
        stat_item("yellowCards", "Yellow cards", home_stats["yellowCards"], away_stats["yellowCards"], "discipline"),
        stat_item("redCards", "Red cards", home_stats["redCards"], away_stats["redCards"], "discipline"),
        stat_item("turnovers", "Turnovers", home_stats["dispossessed"] + home_stats["turnovers"], away_stats["dispossessed"] + away_stats["turnovers"], "discipline"),
    ]

    return {
        "meta": {
            "extractedAt": datetime.now().isoformat(),
            "sourceUrl":   "",
            "matchId":     raw.get("matchId", ""),
            "scoreSource": score_source,
            "rawScore": {"home": raw_home_score, "away": raw_away_score},
            "eventScore": {"home": event_home_score, "away": event_away_score},
        },
        "match": {
            "homeTeam":   home_name,
            "awayTeam":   away_name,
            "homeTeamId": home_id,
            "awayTeamId": away_id,
            "homeLogo":   team_logo_url(home_id),
            "awayLogo":   team_logo_url(away_id),
            "homeLogoUrl": team_logo_url(home_id),
            "awayLogoUrl": team_logo_url(away_id),
            "homeScore":  final_home_score,
            "awayScore":  final_away_score,
            "date":       raw.get("startTime", raw.get("matchDate", "")),
            "venue":      raw.get("venueName", ""),
            "competition":raw.get("competitionName", ""),
            "status":     raw.get("statusCode", ""),
            "minute":     match_minute,
            "clock":      clock_value,
            "displayStatus": display_status,
            "isFinal":    is_final,
        },
        "homeStats":  home_stats,
        "awayStats":  away_stats,
        "goalEvents": sorted(goal_events, key=lambda x: x["minute"]),
        "cardEvents": sorted(card_events, key=lambda x: x["minute"]),
        "advancedStats": advanced_stats,
        "homePlayers":home_players[:18],
        "awayPlayers":away_players[:18],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main Scraper
# ─────────────────────────────────────────────────────────────────────────────
def scrape_match(url: str, headless: bool = True) -> Optional[Dict]:
    """Scrape a WhoScored match page and return structured data."""
    print(f"\n[INFO] Connecting to: {url}")
    print("[INFO] Starting browser...")

    driver = get_stealth_driver(headless=headless)
    try:
        driver.get(url)
        print(f"[WAIT] Waiting {WAIT_TIMEOUT}s for page to load...")
        WebDriverWait(driver, WAIT_TIMEOUT).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )

        wait_time = EXTRA_WAIT + random.uniform(MIN_DELAY, MAX_DELAY)
        print(f"[WAIT] Extra wait: {wait_time:.1f}s for JS execution...")
        time.sleep(wait_time)

        page_source = driver.page_source
        print(f"[INFO] Page source: {len(page_source):,} chars")

        raw = extract_json_from_source(page_source)

        if raw is None:
            print("  [INFO] Trying JS execution fallback...")
            try:
                raw = driver.execute_script(
                    "return (typeof matchCentreData !== 'undefined') ? matchCentreData : null"
                )
                if raw:
                    print("  [OK] Got matchCentreData via JS execution")
            except Exception as e:
                print(f"  [WARN] JS fallback failed: {e}")

        if raw is None:
            print("\n[ERR] Could not extract match data.")
            print("  Possible reasons:")
            print("  - Cloudflare challenge not passed")
            print("  - matchCentreData not yet loaded (try increasing EXTRA_WAIT)")
            print("  - URL is for a preview page (use /live/ or /livestatistics/ URL)")
            return None

        return raw

    finally:
        try:
            driver.quit()
        except OSError:
            pass
        except Exception as e:
            print(f"[WARN] Browser close warning: {e}")
        print("[INFO] Browser closed")


# ─────────────────────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────────────────────
def extract_once(url: str, save_timestamped: bool = True) -> Dict:
    raw_data = scrape_match(url, headless=True)

    if raw_data is None:
        print("\n[WARN] Retrying with visible browser (non-headless)...")
        raw_data = scrape_match(url, headless=False)

    if raw_data is None:
        raise RuntimeError("Extraction failed. Check URL, Cloudflare state, and internet connection.")

    output = build_output(raw_data)
    output["meta"]["sourceUrl"] = url

    with open(LATEST_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    if save_timestamped:
        match_id = output["match"].get("homeTeam", "match").replace(" ", "_")[:15]
        ts_str = datetime.now().strftime("%Y%m%d_%H%M")
        filename = f"match_{match_id}_{ts_str}.json"
        filepath = OUTPUT_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        output["meta"]["snapshotFile"] = str(filepath)
    else:
        output["meta"]["snapshotFile"] = str(LATEST_FILE)

    return output


class LiveBridgeHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: Dict[str, Any]):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Cache-Control, Pragma")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        global LIVE_DATA
        path = self.path.split("?", 1)[0]
        with LIVE_LOCK:
            state = dict(LIVE_STATE)
            data = LIVE_DATA

        if path == "/api/status":
            self._send_json(200, state)
            return

        if path == "/api/match":
            if data:
                self._send_json(200, data)
            else:
                self._send_json(404, {"error": "No live match data yet.", "status": state})
            return

        if path == "/":
            self._send_json(200, {
                "message": "REO SHOW Match Stats Live Bridge",
                "match": "/api/match",
                "status": "/api/status",
            })
            return

        self._send_json(404, {"error": "Not found"})

    def log_message(self, format: str, *args: Any) -> None:
        return


def start_live_server(port: int) -> tuple[ThreadingHTTPServer, int]:
    last_error = None
    for candidate_port in range(port, port + 20):
        try:
            server = ThreadingHTTPServer(("127.0.0.1", candidate_port), LiveBridgeHandler)
            break
        except OSError as error:
            last_error = error
            print(f"[LIVE][WARN] Port {candidate_port} is busy. Trying next port...")
    else:
        raise RuntimeError(f"Could not start local bridge. Last error: {last_error}")

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"[LIVE] Local API ready: http://127.0.0.1:{candidate_port}/api/match")
    print(f"[LIVE] Status:          http://127.0.0.1:{candidate_port}/api/status")
    return server, candidate_port


def build_output_url(site_url: str, port: int, source_url: str, panel_side: str = "RIGHT") -> str:
    overlay = {
        "id": "live-match-stats-direct",
        "name": "Live Match Stats Direct",
        "type": "MATCH_STATS",
        "templateId": "template-football-smart-match-stats",
        "fields": [
            {"id": "dataMode", "label": "Data source", "type": "select", "value": "BRIDGE"},
            {"id": "apiUrl", "label": "Bridge URL", "type": "text", "value": f"http://127.0.0.1:{port}/api/match"},
            {"id": "sourceMatchUrl", "label": "Match URL", "type": "text", "value": source_url},
            {"id": "panelSide", "label": "Panel side", "type": "select", "value": panel_side},
            {"id": "showAdvancedStats", "label": "Advanced stats", "type": "boolean", "value": True},
            {"id": "showScorebug", "label": "Scorebug", "type": "boolean", "value": True},
            {"id": "showDominance", "label": "Dominance", "type": "boolean", "value": True},
            {"id": "showMotm", "label": "MOTM", "type": "boolean", "value": True},
            {"id": "showTopStats", "label": "Top stats", "type": "boolean", "value": True},
            {"id": "showEvents", "label": "Events", "type": "boolean", "value": True},
            {"id": "showKeyBattle", "label": "Key battle", "type": "boolean", "value": True},
            {"id": "pollIntervalSec", "label": "Template refresh", "type": "range", "value": 30},
            {"id": "statsRotateSec", "label": "Stats rotation", "type": "range", "value": 30},
            {"id": "matchMetricPreset", "label": "Match stat focus", "type": "select", "value": "SMART"},
            {"id": "showPlayerTicker", "label": "Player ticker", "type": "boolean", "value": True},
            {"id": "playerRotateSec", "label": "Player ticker rotation", "type": "range", "value": 30},
            {"id": "playerMetricPreset", "label": "Player stat focus", "type": "select", "value": "SMART"},
            {"id": "teamStatsSide", "label": "Team stat side", "type": "select", "value": "HOME_LEFT"},
            {"id": "enablePanelTransitions", "label": "Panel transitions", "type": "boolean", "value": False},
            {"id": "broadcastMotion", "label": "Broadcast motion", "type": "boolean", "value": True},
            {"id": "broadcastQuality", "label": "Broadcast quality", "type": "select", "value": "ULTRA"},
            {"id": "matchPanelScale", "label": "Match panel scale", "type": "range", "value": 1},
            {"id": "playerPanelScale", "label": "Player panel scale", "type": "range", "value": 1},
            {"id": "showCreatorBadge", "label": "Creator badge", "type": "boolean", "value": True},
            {"id": "creatorName", "label": "Creator name", "type": "text", "value": "REO Live"},
            {"id": "creatorHandle", "label": "Creator handle", "type": "text", "value": "@reo_live"},
            {"id": "creatorLabel", "label": "Creator label", "type": "text", "value": "Content Creator"},
            {"id": "creatorAvatar", "label": "Creator avatar", "type": "image", "value": ""},
            {"id": "creatorBadgeScale", "label": "Creator badge scale", "type": "range", "value": 1},
            {"id": "creatorPositionX", "label": "Creator X", "type": "range", "value": 0},
            {"id": "creatorPositionY", "label": "Creator Y", "type": "range", "value": 0},
            {"id": "playerImageMapJson", "label": "Player image map", "type": "textarea", "value": "{}"},
            {"id": "playerImageCacheUrl", "label": "Player image cache URL", "type": "text", "value": "/player-image-cache/barcelona.json?v=20260515"},
            {"id": "homeColor", "label": "Home color", "type": "color", "value": "#3b82f6"},
            {"id": "awayColor", "label": "Away color", "type": "color", "value": "#ef4444"},
            {"id": "scale", "label": "Scale", "type": "range", "value": 1},
            {"id": "positionX", "label": "X", "type": "range", "value": 0},
            {"id": "positionY", "label": "Y", "type": "range", "value": 0},
        ],
        "slots": {},
        "theme": {
            "primaryColor": "#3b82f6",
            "secondaryColor": "#ef4444",
            "backgroundColor": "transparent",
            "fontFamily": "Tajawal",
        },
        "isVisible": True,
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(overlay, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).decode("ascii").rstrip("=")
    return f"{site_url.rstrip('/')}/#/output/live-match-stats-direct?d={encoded}"


def run_live_bridge(url: str, interval: int, port: int, site_url: str, open_output: bool, panel_side: str):
    global LIVE_DATA
    server, actual_port = start_live_server(port)
    output_url = build_output_url(site_url, actual_port, url, panel_side)

    with LIVE_LOCK:
        LIVE_STATE.update({
            "currentUrl": url,
            "pollingActive": True,
            "pollIntervalMs": interval * 1000,
            "lastError": None,
            "bridgePort": actual_port,
            "apiUrl": f"http://127.0.0.1:{actual_port}/api/match",
            "statusUrl": f"http://127.0.0.1:{actual_port}/api/status",
        })

    print("\n[LIVE] Direct output URL:")
    print(output_url)
    print("\n[LIVE] Keep this window open. Press Ctrl+C to stop.\n")

    opened = False
    try:
        while True:
            cycle_start = time.time()
            next_poll = datetime.fromtimestamp(cycle_start + interval).isoformat()
            with LIVE_LOCK:
                LIVE_STATE.update({
                    "isFetching": True,
                    "nextPollAt": next_poll,
                    "lastError": None,
                })

            try:
                output = extract_once(url, save_timestamped=False)
                now = datetime.now().isoformat()
                with LIVE_LOCK:
                    LIVE_DATA = output
                    LIVE_STATE.update({
                        "hasData": True,
                        "lastUpdatedAt": now,
                        "isFetching": False,
                        "lastError": None,
                        "match": output.get("match"),
                        "eventCount": len(output.get("goalEvents", [])) + len(output.get("cardEvents", [])),
                    })

                print(
                    f"[LIVE] {now} | {output['match']['homeTeam']} "
                    f"{output['match']['homeScore']} - {output['match']['awayScore']} "
                    f"{output['match']['awayTeam']} | latest_match_stats.json updated"
                )

                if open_output and not opened:
                    webbrowser.open(output_url)
                    opened = True
                    print("[LIVE] Output opened in browser.")
            except Exception as error:
                with LIVE_LOCK:
                    LIVE_STATE.update({
                        "isFetching": False,
                        "lastError": str(error),
                    })
                print(f"[LIVE][ERR] {error}")

            elapsed = time.time() - cycle_start
            sleep_for = max(5, interval - elapsed)
            time.sleep(sleep_for)
    except KeyboardInterrupt:
        print("\n[LIVE] Stopping live bridge...")
    finally:
        server.shutdown()
        server.server_close()
        with LIVE_LOCK:
            LIVE_STATE["pollingActive"] = False
        print("[LIVE] Stopped.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="REO SHOW Match Stats Extractor")
    parser.add_argument("url", nargs="?", help="WhoScored live match URL")
    parser.add_argument("--live", "--watch", action="store_true", help="Run continuous live bridge mode")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, help="Refresh interval in seconds")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Local bridge port")
    parser.add_argument("--site-url", default=DEFAULT_SITE_URL, help="Broadcast site base URL")
    parser.add_argument("--open-output", action="store_true", help="Open direct output URL after first successful extraction")
    parser.add_argument("--no-open-output", action="store_true", help="Do not open output URL")
    parser.add_argument("--panel-side", choices=["RIGHT", "LEFT"], default="RIGHT", help="Sidebar position")
    return parser.parse_args()


def main():
    args = parse_args()

    print("+================================================+")
    print("|  REO SHOW -- Match Stats Extractor v2.0       |")
    print("+================================================+\n")

    if args.url:
        url = args.url.strip('"').strip("'")
    else:
        url = input("  Enter WhoScored match URL: ").strip()

    if not url:
        print("[ERR] No URL provided. Exiting.")
        sys.exit(1)

    if args.live:
        run_live_bridge(
            url=url,
            interval=max(15, args.interval),
            port=args.port,
            site_url=args.site_url,
            open_output=(args.open_output or not args.no_open_output),
            panel_side=args.panel_side,
        )
        return None

    try:
        output = extract_once(url, save_timestamped=True)
    except RuntimeError as error:
        print(f"\n[ERR] {error}")
        sys.exit(1)

    filepath = output["meta"].get("snapshotFile", str(LATEST_FILE))

    print(f"\n[DONE] Data saved to: {filepath}")
    print(f"  {output['match']['homeTeam']} {output['match']['homeScore']} - "
          f"{output['match']['awayScore']} {output['match']['awayTeam']}")
    print(f"  Players extracted: {len(output['homePlayers'])} + {len(output['awayPlayers'])}")
    print(f"\n  Latest bridge file also updated: {LATEST_FILE}")
    return output


if __name__ == "__main__":
    result = main()
