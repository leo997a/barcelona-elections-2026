"""
Per-stat-group fetch state for the FBref Smart Agent.

The state file lives at:

    <worker_dir>/.state/fbref-fetch-state.json

It tracks, per stat group:
- lastSuccessAt / lastSuccessSource / lastSuccessPlayerCount
- lastAttemptAt
- lastFailureAt / lastFailureReason
- captchaCount
- cooldownUntil (epoch seconds)

It is read by `provider_selector` to decide whether to:
- skip a group that was successfully fetched today,
- skip a group that is currently in CAPTCHA cooldown,
- attempt a group again because force-refresh was requested.

Pure stdlib, no external dependencies. Designed to never throw on missing
or partially corrupt files: callers always get a sane state dict back.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


STATE_DIR_NAME = ".state"
STATE_FILE_NAME = "fbref-fetch-state.json"

# Default cooldown after a CAPTCHA / 403 / 429 signal is observed.
DEFAULT_CAPTCHA_COOLDOWN_SECONDS = 6 * 60 * 60  # 6 hours

# Substrings that indicate FBref blocked us (case-insensitive match).
CAPTCHA_MARKERS = (
    "captcha",
    "cloudflare",
    "just a moment",
    "verify you are human",
    "cf-chl",
    "challenge-platform",
    "cf-turnstile",
    "blocked or captcha",
    "block/captcha",
    "smoke test failed",
    "could not retrieve",
    "http 403",
    "http 429",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def state_path(worker_dir: str | Path) -> Path:
    return Path(worker_dir) / STATE_DIR_NAME / STATE_FILE_NAME


def load_state(worker_dir: str | Path) -> Dict[str, Any]:
    """Read the state file, returning a default skeleton on any error."""
    path = state_path(worker_dir)
    if not path.exists():
        return _empty_state()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return _empty_state()
        if not isinstance(data.get("groups"), dict):
            data["groups"] = {}
        return data
    except Exception:
        # Never let a corrupt file crash the agent; treat as empty.
        return _empty_state()


def save_state(worker_dir: str | Path, state: Dict[str, Any]) -> None:
    path = state_path(worker_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def _empty_state() -> Dict[str, Any]:
    return {
        "schemaVersion": 1,
        "lastRunAt": None,
        "lastRunStrategy": None,
        "lastUploadAt": None,
        "lastUploadStatus": None,
        "groups": {},
    }


def _group_entry(state: Dict[str, Any], group: str) -> Dict[str, Any]:
    groups = state.setdefault("groups", {})
    entry = groups.setdefault(group, {
        "lastSuccessAt": None,
        "lastSuccessSource": None,
        "lastSuccessPlayerCount": 0,
        "lastAttemptAt": None,
        "lastFailureAt": None,
        "lastFailureReason": None,
        "captchaCount": 0,
        "cooldownUntil": None,
    })
    return entry


def is_in_cooldown(entry: Dict[str, Any], now_epoch: Optional[float] = None) -> bool:
    cooldown_until = entry.get("cooldownUntil")
    if not cooldown_until:
        return False
    now = now_epoch if now_epoch is not None else time.time()
    try:
        return float(cooldown_until) > now
    except (TypeError, ValueError):
        return False


def is_fresh_today(entry: Dict[str, Any]) -> bool:
    """Did this group succeed within the current UTC day?"""
    last_success = entry.get("lastSuccessAt")
    if not last_success:
        return False
    try:
        ts = datetime.fromisoformat(str(last_success).replace("Z", "+00:00"))
    except Exception:
        return False
    today = datetime.now(timezone.utc).date()
    return ts.astimezone(timezone.utc).date() == today


@dataclass
class GroupDecision:
    group: str
    fetch: bool
    reason: str  # "fresh_today" | "cooldown" | "force_refresh" | "missing" | "available_no_force"


def decide_groups(
    state: Dict[str, Any],
    candidate_groups: list[str],
    *,
    force_refresh: bool = False,
) -> list[GroupDecision]:
    """
    Given a list of candidate stat groups (already filtered to those missing in
    the cache), decide which to fetch and which to skip.

    - force_refresh=True -> always fetch.
    - in cooldown -> skip with reason "cooldown".
    - fresh today -> skip with reason "fresh_today".
    - otherwise -> fetch.
    """
    decisions: list[GroupDecision] = []
    now = time.time()
    for group in candidate_groups:
        entry = _group_entry(state, group)
        if force_refresh:
            decisions.append(GroupDecision(group, True, "force_refresh"))
            continue
        if is_in_cooldown(entry, now):
            decisions.append(GroupDecision(group, False, "cooldown"))
            continue
        if is_fresh_today(entry):
            decisions.append(GroupDecision(group, False, "fresh_today"))
            continue
        decisions.append(GroupDecision(group, True, "missing"))
    return decisions


def record_attempt(state: Dict[str, Any], group: str) -> None:
    entry = _group_entry(state, group)
    entry["lastAttemptAt"] = _now_iso()


def record_success(
    state: Dict[str, Any],
    group: str,
    *,
    source: Optional[str],
    player_count: int,
) -> None:
    entry = _group_entry(state, group)
    entry["lastAttemptAt"] = _now_iso()
    entry["lastSuccessAt"] = _now_iso()
    entry["lastSuccessSource"] = source
    entry["lastSuccessPlayerCount"] = int(player_count or 0)
    # Successful fetch clears any active cooldown.
    entry["cooldownUntil"] = None
    entry["lastFailureAt"] = None
    entry["lastFailureReason"] = None
    entry["captchaCount"] = 0


def record_failure(
    state: Dict[str, Any],
    group: str,
    *,
    reason: Optional[str],
    cooldown_seconds: Optional[int] = None,
) -> None:
    entry = _group_entry(state, group)
    entry["lastAttemptAt"] = _now_iso()
    entry["lastFailureAt"] = _now_iso()
    entry["lastFailureReason"] = (reason or "")[:300] if reason else "unknown"

    is_captcha = looks_like_captcha(reason)
    if is_captcha:
        entry["captchaCount"] = int(entry.get("captchaCount", 0) or 0) + 1

    if cooldown_seconds is None:
        cooldown_seconds = DEFAULT_CAPTCHA_COOLDOWN_SECONDS if is_captcha else 0

    if cooldown_seconds and cooldown_seconds > 0:
        entry["cooldownUntil"] = time.time() + cooldown_seconds


def looks_like_captcha(reason: Optional[str]) -> bool:
    if not reason:
        return False
    text = str(reason).lower()
    return any(marker in text for marker in CAPTCHA_MARKERS)


def annotate_run(
    state: Dict[str, Any],
    *,
    strategy: Optional[str],
    upload_status: Optional[str] = None,
) -> None:
    """Update top-level run metadata."""
    state["lastRunAt"] = _now_iso()
    if strategy:
        state["lastRunStrategy"] = strategy
    if upload_status is not None:
        state["lastUploadAt"] = _now_iso()
        state["lastUploadStatus"] = upload_status


def summarize_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """Compact JSON-serializable summary suitable for last_updated.json."""
    summary = {
        "lastRunAt": state.get("lastRunAt"),
        "lastRunStrategy": state.get("lastRunStrategy"),
        "lastUploadAt": state.get("lastUploadAt"),
        "lastUploadStatus": state.get("lastUploadStatus"),
        "groups": {},
    }
    for group, entry in (state.get("groups") or {}).items():
        cooldown_until = entry.get("cooldownUntil")
        cooldown_iso = None
        if cooldown_until:
            try:
                cooldown_iso = datetime.fromtimestamp(float(cooldown_until), tz=timezone.utc).isoformat()
            except (TypeError, ValueError, OSError):
                cooldown_iso = None
        summary["groups"][group] = {
            "lastSuccessAt": entry.get("lastSuccessAt"),
            "lastSuccessSource": entry.get("lastSuccessSource"),
            "lastSuccessPlayerCount": entry.get("lastSuccessPlayerCount"),
            "lastAttemptAt": entry.get("lastAttemptAt"),
            "lastFailureAt": entry.get("lastFailureAt"),
            "lastFailureReason": entry.get("lastFailureReason"),
            "captchaCount": entry.get("captchaCount", 0),
            "cooldownUntil": cooldown_iso,
            "freshToday": is_fresh_today(entry),
            "inCooldown": is_in_cooldown(entry),
        }
    return summary
