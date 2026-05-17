#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════╗
║  REO DataFootball Worker — FBref Season Stats Fetcher               ║
║                                                                      ║
║  Purpose:  Fetch season player stats from FBref and cache as JSON    ║
║  Source:   FBref only (requests + pandas, NO Selenium)               ║
║  Output:   /opt/reo-data-cache/fbref/{league}-{season}.json          ║
║  Schedule: Cron or manual — NEVER during broadcast                   ║
║                                                                      ║
║  ⚠️  This worker runs OFFLINE from the broadcast pipeline.            ║
║      player-stats-bridge reads from cache only.                      ║
║      If cache is empty → bridge returns "unavailable".               ║
║      Worker NEVER runs during /api/player-stats requests.            ║
╚══════════════════════════════════════════════════════════════════════╝
"""

import json
import os
import sys
import time
import logging
import hashlib
import argparse
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from fake_useragent import UserAgent

# ─── Configuration ───────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "config.json"

# ─── Logging ─────────────────────────────────────────────────────────────────

def setup_logging(log_file: str) -> logging.Logger:
    """Setup dual logging: file + console."""
    logger = logging.getLogger("reo-datafootball")
    logger.setLevel(logging.INFO)
    
    # File handler
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(logging.INFO)
    
    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)
    
    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger


# ─── Lock File Management ───────────────────────────────────────────────────

def acquire_lock(lock_path: str) -> bool:
    """
    Create a lock file to prevent concurrent runs.
    Returns True if lock acquired, False if already locked.
    """
    if os.path.exists(lock_path):
        # Check if lock is stale (> 30 minutes old)
        lock_age = time.time() - os.path.getmtime(lock_path)
        if lock_age > 1800:  # 30 minutes
            os.remove(lock_path)
            # Fall through to create new lock
        else:
            return False
    
    with open(lock_path, "w") as f:
        f.write(json.dumps({
            "pid": os.getpid(),
            "started_at": datetime.now(timezone.utc).isoformat(),
        }))
    return True


def release_lock(lock_path: str):
    """Remove the lock file."""
    try:
        os.remove(lock_path)
    except OSError:
        pass


# ─── FBref Fetcher ───────────────────────────────────────────────────────────

# Column name mapping: FBref English → normalized keys
COLUMN_MAP = {
    "Player": "player",
    "Nation": "nation",
    "Pos": "position",
    "Squad": "team",
    "Age": "age",
    "Born": "birth_year",
    "MP": "matches",
    "Starts": "starts",
    "Min": "minutes",
    "90s": "nineties",
    "Gls": "goals",
    "Ast": "assists",
    "G+A": "goals_assists",
    "G-PK": "goals_non_penalty",
    "PK": "penalties",
    "PKatt": "penalties_attempted",
    "CrdY": "yellow_cards",
    "CrdR": "red_cards",
    "xG": "xg",
    "npxG": "npxg",
    "xAG": "xag",
    "npxG+xAG": "npxg_xag",
    "PrgC": "progressive_carries",
    "PrgP": "progressive_passes",
    "PrgR": "progressive_receptions",
    "G+A-PK": "goals_assists_non_penalty",
    "xG+xAG": "xg_xag",
}


def fetch_league(
    league_id: str,
    league_name: str,
    season: str,
    url: str,
    table_index: int,
    session: requests.Session,
    timeout: int,
    max_retries: int,
    logger: logging.Logger,
) -> list[dict] | None:
    """
    Fetch a single league's player stats from FBref.
    Returns list of player dicts or None on failure.
    """
    logger.info(f"  📥 Fetching: {league_name} ({season}) from FBref...")
    
    for attempt in range(1, max_retries + 1):
        try:
            resp = session.get(url, timeout=timeout)
            resp.raise_for_status()
            
            # Parse all tables from the page
            tables = pd.read_html(resp.text, flavor="lxml")
            
            if table_index >= len(tables):
                logger.warning(
                    f"  ⚠️  Table index {table_index} out of range "
                    f"(found {len(tables)} tables). Trying index 0."
                )
                table_index = 0
            
            df = tables[table_index]
            
            # FBref sometimes uses MultiIndex columns — flatten them
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [
                    col[-1] if col[-1] != "" else col[-2]
                    for col in df.columns
                ]
            
            # Remove summary/header rows that FBref injects
            if "Player" in df.columns:
                df = df[df["Player"].notna() & (df["Player"] != "Player")]
            
            # Map columns
            rename = {k: v for k, v in COLUMN_MAP.items() if k in df.columns}
            df = df.rename(columns=rename)
            
            # Keep only mapped columns that exist
            keep = [v for v in rename.values()]
            df = df[[c for c in keep if c in df.columns]]
            
            # Convert numeric columns
            numeric_cols = [
                "matches", "starts", "minutes", "goals", "assists",
                "goals_assists", "goals_non_penalty", "penalties",
                "penalties_attempted", "yellow_cards", "red_cards",
                "xg", "npxg", "xag", "npxg_xag",
                "progressive_carries", "progressive_passes",
                "progressive_receptions", "nineties",
                "goals_assists_non_penalty", "xg_xag",
            ]
            for col in numeric_cols:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce")
            
            # Add metadata
            df["league"] = league_id
            df["league_name"] = league_name
            df["season"] = season
            
            # Drop rows with no player name
            df = df.dropna(subset=["player"])
            
            # Remove duplicate player entries (keep first)
            df = df.drop_duplicates(subset=["player", "team"], keep="first")
            
            players = df.to_dict(orient="records")
            
            # Clean NaN → None for JSON serialization
            for p in players:
                for k, v in p.items():
                    if pd.isna(v) if isinstance(v, float) else False:
                        p[k] = None
            
            logger.info(
                f"  ✅ {league_name}: {len(players)} players fetched successfully"
            )
            return players
            
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else "?"
            logger.warning(
                f"  ⚠️  HTTP {status} on attempt {attempt}/{max_retries} "
                f"for {league_name}"
            )
            if status == 403:
                logger.warning(
                    "  ⚠️  403 Forbidden — FBref may be rate-limiting. "
                    "Waiting 60s before retry..."
                )
                time.sleep(60)
            elif status == 429:
                logger.warning("  ⚠️  429 Too Many Requests — waiting 120s...")
                time.sleep(120)
            else:
                time.sleep(10)
                
        except Exception as e:
            logger.error(
                f"  ❌ Error on attempt {attempt}/{max_retries} "
                f"for {league_name}: {e}"
            )
            time.sleep(10)
    
    logger.error(f"  ❌ FAILED: {league_name} after {max_retries} attempts")
    return None


# ─── Cache Writer ────────────────────────────────────────────────────────────

def save_cache(
    players: list[dict],
    league_id: str,
    season: str,
    cache_dir: str,
    logger: logging.Logger,
) -> str:
    """Save player data to JSON cache file. Returns the file path."""
    os.makedirs(cache_dir, exist_ok=True)
    
    filename = f"{league_id}-{season}.json"
    filepath = os.path.join(cache_dir, filename)
    
    # Compute checksum to detect changes
    content = json.dumps(players, ensure_ascii=False, indent=2, default=str)
    checksum = hashlib.md5(content.encode()).hexdigest()
    
    cache_data = {
        "league": league_id,
        "season": season,
        "player_count": len(players),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "checksum": checksum,
        "players": players,
    }
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2, default=str)
    
    logger.info(f"  💾 Saved: {filepath} ({len(players)} players, md5:{checksum[:8]})")
    return filepath


def update_last_updated(
    results: dict,
    last_updated_file: str,
    logger: logging.Logger,
):
    """Write a summary of what was fetched and when."""
    data = {
        "last_run": datetime.now(timezone.utc).isoformat(),
        "leagues": results,
    }
    with open(last_updated_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logger.info(f"  📋 Updated: {last_updated_file}")


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    # Parse CLI arguments
    parser = argparse.ArgumentParser(description="REO DataFootball Worker — FBref Fetcher")
    parser.add_argument("--cache-dir", help="Override cache directory from config.json")
    parser.add_argument("--lock-file", help="Override lock file path")
    parser.add_argument("--log-file", help="Override log file path")
    parser.add_argument("--last-updated-file", help="Override last_updated.json path")
    args = parser.parse_args()

    # Load config
    if not CONFIG_PATH.exists():
        print(f"❌ Config not found: {CONFIG_PATH}")
        sys.exit(1)
    
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)
    
    # CLI overrides take priority over config.json
    cache_dir = args.cache_dir or config["cache_dir"]
    lock_file = args.lock_file or config.get("lock_file", os.path.join(cache_dir, "..", ".lock"))
    log_file = args.log_file or config.get("log_file", os.path.join(cache_dir, "..", "worker.log"))
    last_updated_file = args.last_updated_file or config.get("last_updated_file", os.path.join(cache_dir, "..", "last_updated.json"))
    delay = config.get("delay_between_requests", 5)
    timeout = config.get("request_timeout", 30)
    max_retries = config.get("max_retries", 2)
    
    # Ensure directories exist
    os.makedirs(cache_dir, exist_ok=True)
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    # Setup logging
    logger = setup_logging(log_file)
    
    logger.info("=" * 60)
    logger.info("🚀 REO DataFootball Worker — Starting")
    logger.info(f"   Leagues: {len(config['leagues'])}")
    logger.info(f"   Cache: {cache_dir}")
    logger.info(f"   Delay: {delay}s between requests")
    logger.info("=" * 60)
    
    # Acquire lock
    if not acquire_lock(lock_file):
        logger.warning("⚠️  Another worker is running (lock file exists). Exiting.")
        sys.exit(0)
    
    try:
        # Setup session with random User-Agent
        session = requests.Session()
        try:
            ua = UserAgent()
            session.headers.update({"User-Agent": ua.random})
        except Exception:
            session.headers.update({
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            })
        
        # Accept-Language to get English column names
        session.headers.update({
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml",
            "Referer": "https://fbref.com/",
        })
        
        results = {}
        success_count = 0
        fail_count = 0
        
        for i, league in enumerate(config["leagues"]):
            league_id = league["id"]
            league_name = league["name"]
            season = league["season"]
            url = league["url"]
            table_index = league.get("table_index", 0)
            
            players = fetch_league(
                league_id=league_id,
                league_name=league_name,
                season=season,
                url=url,
                table_index=table_index,
                session=session,
                timeout=timeout,
                max_retries=max_retries,
                logger=logger,
            )
            
            if players is not None:
                filepath = save_cache(players, league_id, season, cache_dir, logger)
                results[league_id] = {
                    "status": "ok",
                    "player_count": len(players),
                    "file": filepath,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                }
                success_count += 1
            else:
                results[league_id] = {
                    "status": "failed",
                    "player_count": 0,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                }
                fail_count += 1
            
            # Rate limiting: wait between requests (skip after last)
            if i < len(config["leagues"]) - 1:
                logger.info(f"  ⏳ Waiting {delay}s before next request...")
                time.sleep(delay)
        
        # Write last_updated summary
        update_last_updated(results, last_updated_file, logger)
        
        logger.info("=" * 60)
        logger.info(
            f"🏁 Worker finished — "
            f"✅ {success_count} succeeded, ❌ {fail_count} failed"
        )
        logger.info("=" * 60)
        
    finally:
        release_lock(lock_file)


if __name__ == "__main__":
    main()
