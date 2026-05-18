"""
manual_fbref_checker.py â€” Validate, organize, and report on manual FBref files.

Actions:
  --check       Scan .manual/fbref/ and incoming/ for valid files. Print report.
  --import      Move valid files to processed/, invalid to rejected/, write report.
  --report      Show last import report.

Does NOT fetch from FBref. Does NOT upload to VPS. Does NOT touch bridge/PM2.
"""

import json
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import io
import pandas as pd

SCRIPT_DIR = Path(__file__).parent
MANUAL_ROOT = SCRIPT_DIR / ".manual" / "fbref"
INCOMING_DIR = MANUAL_ROOT / "incoming"
PROCESSED_DIR = MANUAL_ROOT / "processed"
REJECTED_DIR = MANUAL_ROOT / "rejected"
REPORTS_DIR = MANUAL_ROOT / "reports"
CACHE_DIR = SCRIPT_DIR / ".cache" / "fbref"
ZIP_NAME = "fbref_manual_bundle.zip"

REQUIRED_GROUPS = ["passing", "gca", "defense", "possession", "pass_types"]

CAPTCHA_MARKERS = [
    "just a moment",
    "verify you are human",
    "cf-turnstile",
    "challenge-platform",
    "access denied",
    "cloudflare",
    "ray id",
]

SUCCESS_MARKERS = [
    'data-stat="player"',
    "stats_passing",
    "stats_gca",
    "stats_defense",
    "stats_possession",
    "stats_passing_types",
]

PLAYER_NAMES = ["lewandowski", "haaland", "mbappe", "salah", "yamal", "pedri", "palmer"]

TABLE_IDS = {
    "passing": "stats_passing",
    "pass_types": "stats_passing_types",
    "gca": "stats_gca",
    "defense": "stats_defense",
    "possession": "stats_possession",
}

MIN_PLAYERS = 500


def ensure_dirs():
    for d in [MANUAL_ROOT, INCOMING_DIR, PROCESSED_DIR, REJECTED_DIR, REPORTS_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def _find_files():
    """Find HTML/CSV files in manual root and incoming."""
    files = {}
    for search_dir in [MANUAL_ROOT, INCOMING_DIR]:
        for ext in ("*.html", "*.csv"):
            for f in search_dir.glob(ext):
                stem = f.stem.lower()
                if stem in REQUIRED_GROUPS:
                    files[stem] = f
    return files


def _extract_zip():
    """Extract ZIP if present, return list of extracted paths."""
    zip_path = MANUAL_ROOT / ZIP_NAME
    if not zip_path.exists():
        zip_path = INCOMING_DIR / ZIP_NAME
    if not zip_path.exists():
        return []

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()
            if not names:
                print(f"  [FAIL] {ZIP_NAME} exists but is EMPTY.")
                return []
            staging = MANUAL_ROOT / "_zip_staging"
            if staging.exists():
                shutil.rmtree(staging)
            staging.mkdir(parents=True, exist_ok=True)
            zf.extractall(staging)
            print(f"  [OK] Extracted {len(names)} entries from {ZIP_NAME}")

        # Move HTML/CSV to incoming
        extracted = []
        for f in staging.rglob("*"):
            if f.is_file() and f.suffix.lower() in (".html", ".csv"):
                dest = INCOMING_DIR / f.name.lower()
                shutil.copy2(f, dest)
                extracted.append(dest)
        shutil.rmtree(staging, ignore_errors=True)
        return extracted
    except Exception as e:
        print(f"  [FAIL] Could not extract {ZIP_NAME}: {e}")
        return []


def _check_html(path, group):
    """Check a single HTML file. Returns (ok, player_count, error)."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return False, 0, f"Cannot read file: {e}"

    if len(text) < 5000:
        return False, 0, "File too small (< 5KB)"

    # CAPTCHA check â€” only in the first 5KB (title + initial body).
    # FBref's legitimate pages reference "cloudflare" in CDN script URLs deeper
    # in the document, so we must NOT scan the full file for CAPTCHA markers.
    head_lower = text[:5000].lower()
    for marker in CAPTCHA_MARKERS:
        if marker in head_lower:
            return False, 0, f"CAPTCHA/block page detected: '{marker}'"

    # Success markers â€” scan full file (markers can be deep in commented tables).
    text_lower = text.lower()

    # Success markers
    has_table = any(m.lower() in text_lower for m in SUCCESS_MARKERS)
    has_players = any(name in text_lower for name in PLAYER_NAMES)

    if not has_table and not has_players:
        return False, 0, "No FBref stats table or known player names found"

    # Try parsing
    try:
        table_id = TABLE_IDS.get(group, "")
        df = None
        if table_id:
            try:
                tables = pd.read_html(io.StringIO(text), attrs={"id": table_id}, flavor="lxml")
                if tables:
                    df = tables[0]
            except Exception:
                try:
                    tables = pd.read_html(io.StringIO(text), attrs={"id": table_id}, flavor="html5lib")
                    if tables:
                        df = tables[0]
                except Exception:
                    pass
        if df is None or len(df) == 0:
            try:
                tables = pd.read_html(io.StringIO(text), flavor="lxml")
            except Exception:
                tables = pd.read_html(io.StringIO(text), flavor="html5lib")
            if tables:
                df = max(tables, key=lambda t: len(t))

        if df is None or len(df) < 10:
            return False, 0, "Could not parse a valid table from HTML"

        # Remove header rows
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ["_".join(str(c) for c in col if str(c) and "Unnamed" not in str(c)).lower() for col in df.columns]
        else:
            df.columns = [str(c).lower() for c in df.columns]
        if "player" in df.columns:
            df = df[df["player"] != "Player"]

        count = len(df)
        if count < MIN_PLAYERS:
            return False, count, f"Only {count} players (minimum {MIN_PLAYERS})"

        return True, count, None

    except Exception as e:
        return False, 0, f"Parse error: {str(e)[:100]}"


def _check_csv(path, group):
    """Check a single CSV file."""
    try:
        try:
            df = pd.read_csv(path, encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(path, encoding="latin-1")
    except Exception as e:
        return False, 0, f"Cannot read CSV: {e}"

    if len(df) < MIN_PLAYERS:
        return False, len(df), f"Only {len(df)} rows (minimum {MIN_PLAYERS})"

    # Check for CAPTCHA in first few cells
    sample = " ".join(str(v) for v in df.iloc[0].values[:5]).lower() if len(df) > 0 else ""
    for marker in CAPTCHA_MARKERS:
        if marker in sample:
            return False, 0, f"CAPTCHA detected in CSV content: '{marker}'"

    return True, len(df), None


def check_file(path, group):
    """Route to HTML or CSV checker."""
    if path.suffix.lower() == ".html":
        return _check_html(path, group)
    elif path.suffix.lower() == ".csv":
        return _check_csv(path, group)
    return False, 0, "Unknown file type"


def run_check(extract_zip=True):
    """Check all files. Returns dict of results per group."""
    ensure_dirs()

    if extract_zip:
        _extract_zip()

    files = _find_files()
    results = {}

    print("")
    print("  ===================================================")
    print("  MANUAL FBREF FILE CHECK")
    print("  ===================================================")
    print("")

    for group in REQUIRED_GROUPS:
        if group not in files:
            results[group] = {"ok": False, "players": 0, "error": "File not found", "path": None}
            print(f"  [MISS] {group:12s}  No file found ({group}.html or {group}.csv)")
            continue

        path = files[group]
        ok, players, error = check_file(path, group)
        results[group] = {"ok": ok, "players": players, "error": error, "path": str(path)}

        if ok:
            print(f"  [OK]   {group:12s}  {players} players  ({path.name})")
        else:
            print(f"  [FAIL] {group:12s}  {error}  ({path.name})")

    ok_count = sum(1 for r in results.values() if r["ok"])
    print("")
    print(f"  Result: {ok_count}/{len(REQUIRED_GROUPS)} groups valid")

    if ok_count == len(REQUIRED_GROUPS):
        print("  [OK] All 5 groups ready for import!")
    elif ok_count > 0:
        print(f"  [WARN] Only {ok_count}/5 valid. Import will be partial.")
    else:
        print("  [FAIL] No valid files. Cannot import.")

    print("")
    return results


def run_import():
    """Move valid files to processed, invalid to rejected, write report."""
    ensure_dirs()
    _extract_zip()
    files = _find_files()
    results = {}
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    print("")
    print("  === IMPORTING FILES ===")
    print("")

    for group in REQUIRED_GROUPS:
        if group not in files:
            results[group] = {"ok": False, "players": 0, "error": "File not found", "action": "skip"}
            continue

        path = files[group]
        ok, players, error = check_file(path, group)
        results[group] = {"ok": ok, "players": players, "error": error, "source": str(path)}

        if ok:
            dest = PROCESSED_DIR / f"{group}_{timestamp}{path.suffix}"
            # Also copy to manual root so provider can read it
            provider_dest = MANUAL_ROOT / path.name
            shutil.copy2(path, dest)
            shutil.copy2(path, provider_dest)
            results[group]["action"] = "processed"
            results[group]["dest"] = str(dest)
            print(f"  [OK]   {group:12s} -> processed/ ({players} players)")
            # Remove from incoming if it was there
            if path.parent == INCOMING_DIR:
                path.unlink(missing_ok=True)
        else:
            dest = REJECTED_DIR / f"{group}_{timestamp}{path.suffix}"
            shutil.copy2(path, dest)
            results[group]["action"] = "rejected"
            results[group]["dest"] = str(dest)
            print(f"  [FAIL] {group:12s} -> rejected/ ({error})")
            if path.parent == INCOMING_DIR:
                path.unlink(missing_ok=True)

    # Write report
    ok_count = sum(1 for r in results.values() if r["ok"])
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "results": results,
        "summary": {
            "total": len(REQUIRED_GROUPS),
            "ok": ok_count,
            "failed": len(REQUIRED_GROUPS) - ok_count,
            "ready_for_upload": ok_count == len(REQUIRED_GROUPS),
        },
    }

    report_json = REPORTS_DIR / "manual_import_report.json"
    report_json.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    report_txt = REPORTS_DIR / "manual_import_report.txt"
    lines = [
        f"Manual FBref Import Report â€” {report['timestamp']}",
        f"{'=' * 50}",
        "",
    ]
    for group in REQUIRED_GROUPS:
        r = results[group]
        status = "[OK]" if r["ok"] else "[FAIL]"
        lines.append(f"  {status} {group:12s} {r.get('players', 0)} players  {r.get('error') or ''}")
    lines.append("")
    lines.append(f"  Total: {ok_count}/{len(REQUIRED_GROUPS)} valid")
    lines.append(f"  Ready for upload: {'YES' if ok_count == len(REQUIRED_GROUPS) else 'NO (need all 5)'}")
    report_txt.write_text("\n".join(lines), encoding="utf-8")

    print("")
    print(f"  Report saved: {report_json.name}")
    print(f"  Summary: {ok_count}/{len(REQUIRED_GROUPS)} valid")

    if ok_count == len(REQUIRED_GROUPS):
        print("  [OK] All 5 groups imported. Ready for upload (option 5).")
    elif ok_count > 0:
        print(f"  [WARN] Only {ok_count}/5 valid. Fix missing files and retry.")
    else:
        print("  [FAIL] No valid files imported.")

    print("")
    return report


def show_report():
    report_json = REPORTS_DIR / "manual_import_report.json"
    report_txt = REPORTS_DIR / "manual_import_report.txt"
    if report_txt.exists():
        print(report_txt.read_text(encoding="utf-8"))
    elif report_json.exists():
        data = json.loads(report_json.read_text(encoding="utf-8"))
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print("  No import report found. Run import first.")


def main():
    if len(sys.argv) < 2:
        print("Usage: python manual_fbref_checker.py --check | --import | --report")
        sys.exit(1)

    action = sys.argv[1].lower().strip("-")

    if action == "check":
        run_check()
    elif action == "import":
        run_import()
    elif action == "report":
        show_report()
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()


