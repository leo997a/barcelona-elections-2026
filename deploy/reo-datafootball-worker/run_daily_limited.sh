#!/bin/bash
# =====================================================================
# run_daily_limited.sh - REO FBref Smart Agent Daily Limited Execution
#
# Called by: systemd reo-fbref-daily.service (oneshot)
# Schedule:  Once daily at 06:30 UTC via reo-fbref-daily.timer
#
# Safety:
#   - Lock file prevents double-run
#   - 30 min timeout kills hung process
#   - Staging cache (NOT production) until validation passes
#   - Backup old cache before replacing
#   - Kill orphan Chrome/chromedriver on exit
#   - ASCII-only logs (no emoji, no Unicode)
#
# Does NOT:
#   - Touch player-stats-bridge
#   - Touch PM2
#   - Touch tokens
#   - Touch Vercel / API routes
#   - Use proxy
#   - Run 24h
#   - Replace old cache if validation fails
# =====================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────
WORKER_DIR="/opt/reo-datafootball-worker"
VENV_DIR="${WORKER_DIR}/venv"
PROD_CACHE="/opt/reo-data-cache/fbref"
BACKUP_BASE="/opt/reo-data-cache/backups"
STAGING_CACHE="/tmp/reo-fbref-daily-cache"
LOCK_FILE="/tmp/reo-fbref-daily.lock"
LOG_TAG="reo-fbref-daily"
TIMEOUT_MINUTES=30

# Strategy and stat groups
STRATEGY="soccerdata_only"
SEASON="2025-26"
STAT_GROUPS="standard"
HEADLESS="true"

TIMESTAMP=$(date -u '+%Y%m%d-%H%M%S')

# ── Logging helpers (ASCII only) ─────────────────────────────────────
log_info()  { echo "[$(date -u '+%H:%M:%S')] [INFO] $*"; }
log_ok()    { echo "[$(date -u '+%H:%M:%S')] [OK] $*"; }
log_fail()  { echo "[$(date -u '+%H:%M:%S')] [FAIL] $*"; }
log_warn()  { echo "[$(date -u '+%H:%M:%S')] [WARN] $*"; }

# ── Cleanup function (always runs) ──────────────────────────────────
cleanup() {
    log_info "Cleanup starting..."

    # Remove lock file
    rm -f "$LOCK_FILE"
    log_info "Lock file removed"

    # Kill orphan Chrome/chromedriver owned by this user ONLY
    # Use pkill with exact match to avoid killing unrelated processes
    pkill -f "chromedriver.*reo-fbref" 2>/dev/null || true
    pkill -f "chrome.*--headless.*reo" 2>/dev/null || true

    # Clean old staging cache
    rm -rf "$STAGING_CACHE"
    log_info "Staging cache cleaned"

    log_info "Cleanup done"
}

trap cleanup EXIT

# ── 1. Lock file check ───────────────────────────────────────────────
log_info "======================================================="
log_info "  REO FBref Smart Agent - Daily Limited Run"
log_info "======================================================="
log_info ""
log_info "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
log_info "Strategy: $STRATEGY"
log_info "Season: $SEASON"
log_info "Stat groups: $STAT_GROUPS"
log_info "Timeout: ${TIMEOUT_MINUTES}m"
log_info ""

if [ -f "$LOCK_FILE" ]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0) ))
    if [ "$LOCK_AGE" -gt 3600 ]; then
        log_warn "Stale lock file found (${LOCK_AGE}s old) - removing"
        rm -f "$LOCK_FILE"
    else
        log_fail "Lock file exists: $LOCK_FILE (age: ${LOCK_AGE}s)"
        log_fail "Another instance may be running. Exiting."
        # Don't trigger cleanup trap for lock removal
        trap - EXIT
        exit 1
    fi
fi

# Create lock file
echo "$$" > "$LOCK_FILE"
log_ok "Lock acquired (PID: $$)"

# ── 2. Check venv ────────────────────────────────────────────────────
if [ ! -d "${VENV_DIR}" ]; then
    log_fail "Virtual environment not found: ${VENV_DIR}"
    log_info "Run setup_vps_smart.sh first"
    exit 1
fi

source "${VENV_DIR}/bin/activate"
log_ok "venv activated"

# ── 3. Prepare staging directory ─────────────────────────────────────
rm -rf "$STAGING_CACHE"
mkdir -p "$STAGING_CACHE"
log_ok "Staging directory ready: $STAGING_CACHE"

# ── 4. Run Smart Agent with timeout ─────────────────────────────────
log_info ""
log_info "--- Fetch Phase ---"

FETCH_EXIT=0
timeout ${TIMEOUT_MINUTES}m python -m providers.provider_selector \
    --strategy "$STRATEGY" \
    --season "$SEASON" \
    --cache-dir "$STAGING_CACHE" \
    --headless "$HEADLESS" \
    --stat-groups "$STAT_GROUPS" \
    --soccerdata-dir "${WORKER_DIR}/.cache/soccerdata" \
    || FETCH_EXIT=$?

if [ "$FETCH_EXIT" -eq 124 ]; then
    log_fail "Fetch TIMED OUT after ${TIMEOUT_MINUTES} minutes"
    exit 1
elif [ "$FETCH_EXIT" -ne 0 ]; then
    log_fail "Fetch failed (exit code: $FETCH_EXIT)"
    exit 1
fi

log_ok "Fetch completed"

# ── 5. Validate staging cache ────────────────────────────────────────
log_info ""
log_info "--- Validation Phase ---"

VALIDATE_EXIT=0
python "${WORKER_DIR}/validate_cache.py" "$STAGING_CACHE" || VALIDATE_EXIT=$?

if [ "$VALIDATE_EXIT" -ne 0 ]; then
    log_fail "Validation FAILED - old cache preserved"
    log_warn "Production cache NOT touched: $PROD_CACHE"
    exit 1
fi

log_ok "Validation passed"

# ── 6. Backup old production cache ───────────────────────────────────
log_info ""
log_info "--- Install Phase ---"

if [ -d "$PROD_CACHE" ] && [ "$(ls -A "$PROD_CACHE" 2>/dev/null)" ]; then
    BACKUP_DIR="${BACKUP_BASE}/fbref-${TIMESTAMP}"
    mkdir -p "$BACKUP_DIR"
    cp -r "${PROD_CACHE}"/* "${BACKUP_DIR}/" 2>/dev/null || true
    log_ok "Old cache backed up to: $BACKUP_DIR"

    # Keep only last 5 backups
    BACKUP_COUNT=$(ls -d ${BACKUP_BASE}/fbref-* 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 5 ]; then
        log_info "Cleaning old backups (keeping 5)..."
        ls -d ${BACKUP_BASE}/fbref-* | head -n -5 | xargs rm -rf
    fi
else
    log_info "No existing cache to backup"
fi

# ── 7. Install new cache to production ───────────────────────────────
mkdir -p "$PROD_CACHE"

for f in "${STAGING_CACHE}"/*.json; do
    [ -f "$f" ] || continue
    cp "$f" "${PROD_CACHE}/"
done

# Update global last_updated
cat > "/opt/reo-data-cache/last_updated.json" << EOF
{
  "updated_at": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "source": "daily_limited",
  "strategy": "$STRATEGY",
  "stat_groups": "$STAT_GROUPS",
  "season": "$SEASON"
}
EOF

log_ok "New cache installed to: $PROD_CACHE"

# ── 8. Final verification ────────────────────────────────────────────
log_info ""
log_info "--- Verification ---"
ls -lh "${PROD_CACHE}"/*.json 2>/dev/null || log_warn "No JSON files in production cache"

log_info ""
log_info "======================================================="
log_info "  [OK] Daily limited run COMPLETE"
log_info "======================================================="
log_info "  Cache: $PROD_CACHE"
log_info "  Backup: ${BACKUP_BASE}/fbref-${TIMESTAMP}"
log_info "  Bridge: NOT touched"
log_info "  PM2: NOT touched"
log_info "  Tokens: NOT touched"
log_info ""
