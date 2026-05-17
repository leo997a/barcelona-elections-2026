"""
probe_fbref_methods.py - VPS Request Method Diagnostic Probe

Tests different methods to fetch FBref Big 5 standard stats.
Diagnoses whether the issue is headless, session, cloud IP, or request method.

Methods tested:
  A) soccerdata headless=True
  B) soccerdata headless=False (Xvfb)
  C) SeleniumBase UC warmup (homepage first, then Big 5)
  D) Direct requests with browser headers

Output: /tmp/reo-fbref-probe-cache/
Does NOT touch production cache, PM2, bridge, tokens, or Vercel.
"""

import sys
import os
import json
import time
import shutil
import argparse
import subprocess
from datetime import datetime, timezone
from pathlib import Path

# ── Constants ────────────────────────────────────────────────────────
BIG5_STANDARD_URL = "https://fbref.com/en/comps/Big5/stats/players/Big-5-European-Leagues-Stats"
FBREF_HOME = "https://fbref.com"
PROBE_CACHE = "/tmp/reo-fbref-probe-cache"

CAPTCHA_MARKERS = [
    "captcha",
    "access denied",
    "just a moment",
    "cloudflare",
    "verify you are human",
    "cf-chl",
    "challenge-platform",
    "cf-turnstile",
    "ray id",
]


def log_info(msg):
    print("[%s] [INFO] %s" % (datetime.now(timezone.utc).strftime("%H:%M:%S"), msg))


def log_ok(msg):
    print("[%s] [OK] %s" % (datetime.now(timezone.utc).strftime("%H:%M:%S"), msg))


def log_fail(msg):
    print("[%s] [FAIL] %s" % (datetime.now(timezone.utc).strftime("%H:%M:%S"), msg))


def log_warn(msg):
    print("[%s] [WARN] %s" % (datetime.now(timezone.utc).strftime("%H:%M:%S"), msg))


def detect_captcha(html):
    """Check if HTML contains CAPTCHA/block markers."""
    if not html:
        return True  # empty = blocked
    html_lower = html.lower()
    for marker in CAPTCHA_MARKERS:
        if marker in html_lower:
            return True
    return False


def has_player_table(html):
    """Check if HTML contains a player stats table."""
    if not html:
        return False
    # FBref uses id="stats_standard" or similar for Big 5 tables
    indicators = [
        'id="stats_',
        'data-stat="player"',
        '<table',
        'class="stats_table',
    ]
    html_lower = html.lower()
    matches = sum(1 for ind in indicators if ind.lower() in html_lower)
    return matches >= 2


def result_dict(method, status, **kwargs):
    """Create standardized result dict."""
    r = {
        "method": method,
        "status": status,
        "http_status": kwargs.get("http_status", None),
        "captcha_detected": kwargs.get("captcha_detected", False),
        "player_count": kwargs.get("player_count", 0),
        "html_size_kb": kwargs.get("html_size_kb", 0),
        "duration_seconds": kwargs.get("duration_seconds", 0),
        "error": kwargs.get("error", None),
        "has_table": kwargs.get("has_table", False),
    }
    return r


def print_result(r):
    """Print result in ASCII format."""
    print("")
    print("  --- %s ---" % r["method"])
    print("  status:           %s" % r["status"])
    if r["http_status"]:
        print("  http_status:      %s" % r["http_status"])
    print("  captcha_detected: %s" % r["captcha_detected"])
    print("  has_table:        %s" % r["has_table"])
    print("  player_count:     %s" % r["player_count"])
    print("  html_size_kb:     %.1f" % r["html_size_kb"])
    print("  duration_seconds: %.1f" % r["duration_seconds"])
    if r["error"]:
        print("  error:            %s" % r["error"])
    print("")


def save_html(method_name, html, cache_dir):
    """Save raw HTML for inspection."""
    raw_dir = Path(cache_dir) / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    filepath = raw_dir / ("%s.html" % method_name)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html or "")
    return str(filepath)


# ══════════════════════════════════════════════════════════════════════
# Method A: soccerdata headless=True
# ══════════════════════════════════════════════════════════════════════
def probe_soccerdata_headless(cache_dir, user_data_dir=None):
    method = "soccerdata_headless_true"
    log_info("Testing: %s" % method)
    start = time.time()

    try:
        import soccerdata as sd
        log_info("soccerdata v%s" % getattr(sd, "__version__", "?"))

        sd_cache = Path(cache_dir) / "soccerdata-headless"
        sd_cache.mkdir(parents=True, exist_ok=True)

        kwargs = {
            "leagues": "Big 5 European Leagues Combined",
            "seasons": "25-26",
            "headless": True,
            "no_cache": True,
            "no_store": True,
        }

        fbref = sd.FBref(**kwargs)
        df = fbref.read_player_season_stats(stat_type="standard")

        duration = time.time() - start

        if df is not None and len(df) > 0:
            player_count = len(df)
            log_ok("%s: %d players" % (method, player_count))
            return result_dict(method, "OK",
                               player_count=player_count,
                               duration_seconds=duration,
                               has_table=True)
        else:
            log_fail("%s: empty DataFrame" % method)
            return result_dict(method, "FAIL",
                               duration_seconds=duration,
                               error="Empty DataFrame")

    except Exception as e:
        duration = time.time() - start
        err_str = str(e)
        is_captcha = "captcha" in err_str.lower() or "could not retrieve" in err_str.lower()
        log_fail("%s: %s" % (method, err_str[:200]))
        return result_dict(method, "FAIL",
                           captcha_detected=is_captcha,
                           duration_seconds=duration,
                           error=err_str[:300])


# ══════════════════════════════════════════════════════════════════════
# Method B: soccerdata headless=False (Xvfb)
# ══════════════════════════════════════════════════════════════════════
def probe_soccerdata_xvfb(cache_dir):
    method = "soccerdata_headless_false_xvfb"

    # Check if Xvfb is available
    xvfb_path = shutil.which("Xvfb") or shutil.which("xvfb-run")
    if not xvfb_path:
        log_warn("%s: Xvfb not found - SKIPPED" % method)
        log_info("Install with: sudo apt-get install -y xvfb")
        return result_dict(method, "SKIPPED", error="Xvfb not installed")

    log_info("Testing: %s (via xvfb-run)" % method)
    start = time.time()

    try:
        import soccerdata as sd

        # Set virtual display
        os.environ["DISPLAY"] = ":99"

        kwargs = {
            "leagues": "Big 5 European Leagues Combined",
            "seasons": "25-26",
            "headless": False,
            "no_cache": True,
            "no_store": True,
        }

        fbref = sd.FBref(**kwargs)
        df = fbref.read_player_season_stats(stat_type="standard")

        duration = time.time() - start

        if df is not None and len(df) > 0:
            player_count = len(df)
            log_ok("%s: %d players" % (method, player_count))
            return result_dict(method, "OK",
                               player_count=player_count,
                               duration_seconds=duration,
                               has_table=True)
        else:
            log_fail("%s: empty DataFrame" % method)
            return result_dict(method, "FAIL",
                               duration_seconds=duration,
                               error="Empty DataFrame")

    except Exception as e:
        duration = time.time() - start
        err_str = str(e)
        is_captcha = "captcha" in err_str.lower() or "could not retrieve" in err_str.lower()
        log_fail("%s: %s" % (method, err_str[:200]))
        return result_dict(method, "FAIL",
                           captcha_detected=is_captcha,
                           duration_seconds=duration,
                           error=err_str[:300])


# ══════════════════════════════════════════════════════════════════════
# Method C: SeleniumBase UC warmup (homepage first)
# ══════════════════════════════════════════════════════════════════════
def probe_seleniumbase_warmup(cache_dir, user_data_dir=None):
    method = "seleniumbase_uc_warmup"
    log_info("Testing: %s" % method)
    start = time.time()

    try:
        from seleniumbase import SB

        sb_kwargs = {
            "uc": True,
            "headless": True,
            "page_load_strategy": "eager",
        }
        if user_data_dir:
            sb_kwargs["user_data_dir"] = user_data_dir
            log_info("Using persistent profile: %s" % user_data_dir)

        with SB(**sb_kwargs) as sb:
            # Step 1: Visit homepage to establish session
            log_info("Step 1: Visiting FBref homepage...")
            sb.open(FBREF_HOME)
            time.sleep(8)

            home_html = sb.get_page_source()
            home_captcha = detect_captcha(home_html)
            log_info("Homepage: size=%dKB, captcha=%s" % (
                len(home_html) // 1024 if home_html else 0,
                home_captcha
            ))

            if home_captcha:
                save_html("uc_warmup_homepage", home_html, cache_dir)
                duration = time.time() - start
                log_fail("%s: CAPTCHA on homepage" % method)
                return result_dict(method, "FAIL",
                                   captcha_detected=True,
                                   html_size_kb=len(home_html or "") / 1024,
                                   duration_seconds=duration,
                                   error="CAPTCHA on homepage")

            # Step 2: Navigate to Big 5 standard
            log_info("Step 2: Navigating to Big 5 standard...")
            sb.open(BIG5_STANDARD_URL)
            time.sleep(10)

            page_html = sb.get_page_source()
            duration = time.time() - start

            if not page_html:
                log_fail("%s: empty page source" % method)
                return result_dict(method, "FAIL",
                                   duration_seconds=duration,
                                   error="Empty page source")

            html_size_kb = len(page_html) / 1024
            captcha = detect_captcha(page_html)
            has_table_flag = has_player_table(page_html)

            saved_path = save_html("uc_warmup_big5", page_html, cache_dir)
            log_info("HTML saved: %s (%.1fKB)" % (saved_path, html_size_kb))

            if captcha:
                log_fail("%s: CAPTCHA_DETECTED (%.1fKB)" % (method, html_size_kb))
                return result_dict(method, "FAIL",
                                   captcha_detected=True,
                                   html_size_kb=html_size_kb,
                                   duration_seconds=duration,
                                   has_table=has_table_flag,
                                   error="CAPTCHA detected on Big 5 page")

            if has_table_flag:
                log_ok("%s: Table found! (%.1fKB)" % (method, html_size_kb))
                return result_dict(method, "OK",
                                   html_size_kb=html_size_kb,
                                   duration_seconds=duration,
                                   has_table=True)
            else:
                log_warn("%s: No table found (%.1fKB)" % (method, html_size_kb))
                return result_dict(method, "FAIL",
                                   html_size_kb=html_size_kb,
                                   duration_seconds=duration,
                                   has_table=False,
                                   error="No player table found")

    except Exception as e:
        duration = time.time() - start
        err_str = str(e)
        log_fail("%s: %s" % (method, err_str[:200]))
        return result_dict(method, "FAIL",
                           duration_seconds=duration,
                           error=err_str[:300])


# ══════════════════════════════════════════════════════════════════════
# Method C2: SeleniumBase UC warmup with persistent profile
# ══════════════════════════════════════════════════════════════════════
def probe_seleniumbase_persistent(cache_dir):
    method = "seleniumbase_uc_persistent_profile"
    profile_dir = "/tmp/reo-fbref-chrome-profile"
    log_info("Testing: %s" % method)
    log_info("Profile dir: %s" % profile_dir)
    return probe_seleniumbase_warmup(cache_dir, user_data_dir=profile_dir)


# ══════════════════════════════════════════════════════════════════════
# Method D: Direct requests (browser-like headers)
# ══════════════════════════════════════════════════════════════════════
def probe_direct_requests(cache_dir):
    method = "direct_big5_tls_requests"
    log_info("Testing: %s" % method)
    start = time.time()

    try:
        import requests

        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }

        session = requests.Session()

        # Visit homepage first
        log_info("Step 1: GET %s" % FBREF_HOME)
        r_home = session.get(FBREF_HOME, headers=headers, timeout=30)
        log_info("Homepage: HTTP %d, %dKB" % (r_home.status_code, len(r_home.text) // 1024))

        if r_home.status_code == 403:
            duration = time.time() - start
            log_fail("%s: HTTP 403 on homepage" % method)
            save_html("direct_homepage", r_home.text, cache_dir)
            return result_dict(method, "FAIL",
                               http_status=403,
                               captcha_detected=detect_captcha(r_home.text),
                               html_size_kb=len(r_home.text) / 1024,
                               duration_seconds=duration,
                               error="HTTP 403 on homepage")

        time.sleep(3)

        # Visit Big 5 standard
        log_info("Step 2: GET %s" % BIG5_STANDARD_URL)
        r = session.get(BIG5_STANDARD_URL, headers=headers, timeout=30)
        duration = time.time() - start

        html = r.text
        html_size_kb = len(html) / 1024
        captcha = detect_captcha(html)
        has_table_flag = has_player_table(html)

        save_html("direct_big5", html, cache_dir)

        if r.status_code == 403 or r.status_code == 429:
            log_fail("%s: HTTP %d" % (method, r.status_code))
            return result_dict(method, "FAIL",
                               http_status=r.status_code,
                               captcha_detected=captcha,
                               html_size_kb=html_size_kb,
                               duration_seconds=duration,
                               error="HTTP %d" % r.status_code)

        if captcha:
            log_fail("%s: CAPTCHA (HTTP %d, %.1fKB)" % (method, r.status_code, html_size_kb))
            return result_dict(method, "FAIL",
                               http_status=r.status_code,
                               captcha_detected=True,
                               html_size_kb=html_size_kb,
                               duration_seconds=duration,
                               error="CAPTCHA detected")

        if has_table_flag:
            log_ok("%s: Table found! (HTTP %d, %.1fKB)" % (method, r.status_code, html_size_kb))
            return result_dict(method, "OK",
                               http_status=r.status_code,
                               html_size_kb=html_size_kb,
                               duration_seconds=duration,
                               has_table=True)
        else:
            log_warn("%s: No table (HTTP %d, %.1fKB)" % (method, r.status_code, html_size_kb))
            return result_dict(method, "FAIL",
                               http_status=r.status_code,
                               html_size_kb=html_size_kb,
                               duration_seconds=duration,
                               has_table=False,
                               error="No player table in response")

    except Exception as e:
        duration = time.time() - start
        err_str = str(e)
        log_fail("%s: %s" % (method, err_str[:200]))
        return result_dict(method, "FAIL",
                           duration_seconds=duration,
                           error=err_str[:300])


# ══════════════════════════════════════════════════════════════════════
# Environment check
# ══════════════════════════════════════════════════════════════════════
def print_environment():
    """Print system environment for diagnostic."""
    print("")
    print("=======================================================")
    print("  VPS Environment Check")
    print("=======================================================")
    print("")

    checks = [
        ("python3", ["python3", "--version"]),
        ("google-chrome", ["google-chrome", "--version"]),
        ("chromium-browser", ["chromium-browser", "--version"]),
        ("chromium", ["chromium", "--version"]),
        ("Xvfb", ["which", "Xvfb"]),
        ("xvfb-run", ["which", "xvfb-run"]),
    ]

    for name, cmd in checks:
        try:
            out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, timeout=5)
            print("  %s: %s" % (name, out.decode().strip()))
        except Exception:
            print("  %s: NOT FOUND" % name)

    # Memory
    try:
        out = subprocess.check_output(["free", "-m"], timeout=5)
        lines = out.decode().strip().split("\n")
        if len(lines) >= 2:
            print("  RAM: %s" % lines[1])
    except Exception:
        pass

    # IP (for cloud IP diagnostics)
    try:
        import requests
        r = requests.get("https://httpbin.org/ip", timeout=10)
        ip = r.json().get("origin", "unknown")
        print("  External IP: %s" % ip)
    except Exception:
        print("  External IP: could not determine")

    print("")


# ══════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="FBref VPS Request Method Probe")
    parser.add_argument("--cache-dir", default=PROBE_CACHE)
    parser.add_argument("--methods", default="all",
                        help="Comma-separated: A,B,C,C2,D or 'all'")
    parser.add_argument("--skip-env", action="store_true",
                        help="Skip environment check")
    args = parser.parse_args()

    cache_dir = args.cache_dir

    print("")
    print("=======================================================")
    print("  FBref VPS Request Method Probe")
    print("=======================================================")
    print("")
    print("  Time: %s" % datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
    print("  Cache: %s" % cache_dir)
    print("  Target: Big 5 standard ONLY")
    print("  Production cache: NOT TOUCHED")
    print("")

    # Clean and create cache dir
    if os.path.exists(cache_dir):
        shutil.rmtree(cache_dir)
    os.makedirs(cache_dir, exist_ok=True)
    os.makedirs(os.path.join(cache_dir, "raw"), exist_ok=True)

    # Environment check
    if not args.skip_env:
        print_environment()

    # Determine which methods to run
    methods_arg = args.methods.lower().strip()
    run_all = methods_arg == "all"
    selected = [m.strip().upper() for m in methods_arg.split(",")] if not run_all else []

    results = []

    # Method A: soccerdata headless=True
    if run_all or "A" in selected:
        r = probe_soccerdata_headless(cache_dir)
        print_result(r)
        results.append(r)

    # Method B: soccerdata headless=False (Xvfb)
    if run_all or "B" in selected:
        r = probe_soccerdata_xvfb(cache_dir)
        print_result(r)
        results.append(r)

    # Method C: SeleniumBase UC warmup (new session)
    if run_all or "C" in selected:
        r = probe_seleniumbase_warmup(cache_dir)
        print_result(r)
        results.append(r)

    # Method C2: SeleniumBase UC persistent profile
    if run_all or "C2" in selected:
        r = probe_seleniumbase_persistent(cache_dir)
        print_result(r)
        results.append(r)

    # Method D: Direct requests
    if run_all or "D" in selected:
        r = probe_direct_requests(cache_dir)
        print_result(r)
        results.append(r)

    # ── Final Summary ────────────────────────────────────────────────
    print("")
    print("=======================================================")
    print("  PROBE RESULTS SUMMARY")
    print("=======================================================")
    print("")

    ok_count = 0
    fail_count = 0
    for r in results:
        symbol = "[OK]" if r["status"] == "OK" else "[FAIL]" if r["status"] == "FAIL" else "[SKIP]"
        captcha_tag = " (CAPTCHA)" if r["captcha_detected"] else ""
        table_tag = " (TABLE)" if r["has_table"] else ""
        print("  %s %-40s %s%s" % (symbol, r["method"], r["status"], captcha_tag + table_tag))
        if r["status"] == "OK":
            ok_count += 1
        elif r["status"] == "FAIL":
            fail_count += 1

    print("")
    print("  Total: %d OK, %d FAIL, %d SKIPPED" % (
        ok_count, fail_count, len(results) - ok_count - fail_count
    ))
    print("")

    # Save results JSON
    results_path = os.path.join(cache_dir, "probe_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "results": results,
            "summary": {
                "total": len(results),
                "ok": ok_count,
                "fail": fail_count,
            }
        }, f, ensure_ascii=True, indent=2)
    log_info("Results saved: %s" % results_path)

    # Diagnosis
    print("")
    print("=======================================================")
    print("  DIAGNOSIS")
    print("=======================================================")
    print("")

    if ok_count == 0:
        print("  [WARN] All methods failed.")
        print("  Possible causes:")
        print("    1. Cloud IP is flagged by FBref/Cloudflare")
        print("    2. Headless Chrome is detected")
        print("    3. FBref has aggressive rate limiting for this IP range")
        print("")
        print("  Recommendations:")
        print("    - Check saved HTML in %s/raw/ for exact block reason" % cache_dir)
        print("    - Try method B with Xvfb if not tested")
        print("    - Consider keeping Local Agent as primary")
        print("    - Do NOT install timer until at least one method works")
    elif ok_count > 0:
        ok_methods = [r["method"] for r in results if r["status"] == "OK"]
        print("  [OK] Working methods: %s" % ", ".join(ok_methods))
        print("  Recommendation: Use %s for daily timer" % ok_methods[0])

    print("")
    print("  Production cache: NOT TOUCHED")
    print("  Timer: NOT INSTALLED")
    print("")


if __name__ == "__main__":
    main()
