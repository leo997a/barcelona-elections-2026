#!/bin/bash
# =====================================================================
# setup_vps_smart.sh - Deploy Smart Agent + systemd to VPS
#
# Run locally via: gcloud compute ssh openclaw-server --zone us-west1-a
# Or: scp files first, then run on VPS
#
# This script:
#   1. Copies smart agent files to /opt/reo-datafootball-worker/
#   2. Creates/updates venv with soccerdata + seleniumbase
#   3. Installs chromium if needed
#   4. Runs VPS probe test
#   5. If probe passes: installs systemd service + timer
#   6. If probe fails: writes failure log, exits
#
# Does NOT:
#   - Touch player-stats-bridge / PM2 / tokens / Vercel
# =====================================================================

set -euo pipefail

WORKER_DIR="/opt/reo-datafootball-worker"
VENV_DIR="${WORKER_DIR}/venv"
CACHE_DIR="/opt/reo-data-cache"
PROBE_CACHE="/tmp/reo-vps-probe-cache"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

log_info()  { echo "[INFO] $*"; }
log_ok()    { echo "[OK] $*"; }
log_fail()  { echo "[FAIL] $*"; }

echo ""
echo "======================================================="
echo "  REO Smart Agent - VPS Setup"
echo "======================================================="
echo ""

# ── 1. Create directories ───────────────────────────────────────────
log_info "Creating directories..."
sudo mkdir -p "$WORKER_DIR"
sudo mkdir -p "${CACHE_DIR}/fbref"
sudo mkdir -p "${CACHE_DIR}/backups"

CURRENT_USER=$(whoami)
sudo chown -R "${CURRENT_USER}:${CURRENT_USER}" "$WORKER_DIR"
sudo chown -R "${CURRENT_USER}:${CURRENT_USER}" "$CACHE_DIR"
log_ok "Directories ready"

# ── 2. Copy smart agent files ───────────────────────────────────────
log_info "Copying smart agent files..."

# Core files
cp "${SCRIPT_DIR}/validate_cache.py" "${WORKER_DIR}/"
cp "${SCRIPT_DIR}/requirements-smart.txt" "${WORKER_DIR}/"
cp "${SCRIPT_DIR}/run_daily_limited.sh" "${WORKER_DIR}/"
chmod +x "${WORKER_DIR}/run_daily_limited.sh"

# Providers package
mkdir -p "${WORKER_DIR}/providers"
cp "${SCRIPT_DIR}/providers/__init__.py" "${WORKER_DIR}/providers/"
cp "${SCRIPT_DIR}/providers/base_provider.py" "${WORKER_DIR}/providers/"
cp "${SCRIPT_DIR}/providers/fbref_soccerdata_provider.py" "${WORKER_DIR}/providers/"
cp "${SCRIPT_DIR}/providers/fbref_big5_direct_provider.py" "${WORKER_DIR}/providers/"
cp "${SCRIPT_DIR}/providers/manual_csv_provider.py" "${WORKER_DIR}/providers/"
cp "${SCRIPT_DIR}/providers/provider_selector.py" "${WORKER_DIR}/providers/"

log_ok "Files copied"

# ── 3. Install Chromium if needed ────────────────────────────────────
log_info "Checking Chrome/Chromium..."
if command -v google-chrome &>/dev/null; then
    CHROME_VERSION=$(google-chrome --version 2>/dev/null || echo "unknown")
    log_ok "Google Chrome found: $CHROME_VERSION"
elif command -v chromium-browser &>/dev/null; then
    CHROME_VERSION=$(chromium-browser --version 2>/dev/null || echo "unknown")
    log_ok "Chromium found: $CHROME_VERSION"
elif command -v chromium &>/dev/null; then
    CHROME_VERSION=$(chromium --version 2>/dev/null || echo "unknown")
    log_ok "Chromium found: $CHROME_VERSION"
else
    log_info "No Chrome/Chromium found. Installing chromium-browser..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq chromium-browser 2>/dev/null || \
    sudo apt-get install -y -qq chromium 2>/dev/null || \
    sudo snap install chromium 2>/dev/null || {
        log_fail "Could not install Chromium. Install manually."
        exit 1
    }
    log_ok "Chromium installed"
fi

# ── 4. Create/update venv ────────────────────────────────────────────
log_info "Setting up Python venv..."
cd "$WORKER_DIR"

if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    log_ok "venv created"
else
    log_info "venv already exists"
fi

source "${VENV_DIR}/bin/activate"
pip install --upgrade pip -q 2>/dev/null
pip install -r "${WORKER_DIR}/requirements-smart.txt" -q
log_ok "Smart dependencies installed"

# ── 5. VPS Probe Test ────────────────────────────────────────────────
echo ""
echo "======================================================="
echo "  VPS Probe Test"
echo "======================================================="
echo ""
log_info "Running probe: soccerdata_only, standard only..."

rm -rf "$PROBE_CACHE"
mkdir -p "$PROBE_CACHE"

PROBE_EXIT=0
timeout 15m python -m providers.provider_selector \
    --strategy soccerdata_only \
    --season 2025-26 \
    --cache-dir "$PROBE_CACHE" \
    --headless true \
    --stat-groups standard \
    --soccerdata-dir "${WORKER_DIR}/.cache/soccerdata" \
    || PROBE_EXIT=$?

echo ""

if [ "$PROBE_EXIT" -eq 124 ]; then
    log_fail "Probe TIMED OUT (15 min)"
    log_fail "Timer will NOT be installed."
    rm -rf "$PROBE_CACHE"
    exit 1
elif [ "$PROBE_EXIT" -ne 0 ]; then
    log_fail "Probe FAILED (exit: $PROBE_EXIT)"
    log_fail "Timer will NOT be installed."
    rm -rf "$PROBE_CACHE"
    exit 1
fi

# Validate probe results
VALIDATE_EXIT=0
python "${WORKER_DIR}/validate_cache.py" "$PROBE_CACHE" || VALIDATE_EXIT=$?

if [ "$VALIDATE_EXIT" -ne 0 ]; then
    log_fail "Probe validation FAILED"
    log_fail "Timer will NOT be installed."
    rm -rf "$PROBE_CACHE"
    exit 1
fi

log_ok "VPS Probe PASSED"

# Check RAM usage
MEM_USED=$(free -m | awk 'NR==2{printf "%d/%dMB (%.0f%%)", $3, $2, $3*100/$2}')
log_info "RAM after probe: $MEM_USED"

# Check for zombie Chrome
CHROME_PROCS=$(pgrep -c -f "chrome" 2>/dev/null || echo "0")
log_info "Chrome processes remaining: $CHROME_PROCS"

# Install probe cache as initial production cache
log_info "Installing probe cache as initial production data..."
mkdir -p "$CACHE_DIR/fbref"
cp "${PROBE_CACHE}"/*.json "${CACHE_DIR}/fbref/" 2>/dev/null || true
rm -rf "$PROBE_CACHE"
log_ok "Initial cache installed"

# ── 6. Install systemd service + timer ───────────────────────────────
echo ""
echo "======================================================="
echo "  Installing systemd service + timer"
echo "======================================================="
echo ""

# Copy service and timer files
sudo cp "${SCRIPT_DIR}/reo-fbref-daily.service" /etc/systemd/system/
sudo cp "${SCRIPT_DIR}/reo-fbref-daily.timer" /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable reo-fbref-daily.timer
sudo systemctl start reo-fbref-daily.timer

log_ok "systemd timer installed and started"

# Verify
echo ""
log_info "Timer status:"
systemctl status reo-fbref-daily.timer --no-pager 2>/dev/null || true
echo ""
log_info "Next trigger:"
systemctl list-timers | grep reo-fbref || true

# ── 7. Done ──────────────────────────────────────────────────────────
echo ""
echo "======================================================="
echo "  [OK] VPS Smart Agent Setup Complete"
echo "======================================================="
echo ""
echo "  Worker: $WORKER_DIR"
echo "  Cache:  $CACHE_DIR/fbref/"
echo "  Timer:  06:30 UTC daily (+/- 10min jitter)"
echo "  Timeout: 30 min"
echo ""
echo "  Check logs:"
echo "    journalctl -u reo-fbref-daily.service -n 120 --no-pager"
echo ""
echo "  Manual run:"
echo "    sudo systemctl start reo-fbref-daily.service"
echo ""
echo "  Stop timer:"
echo "    sudo systemctl stop reo-fbref-daily.timer"
echo "    sudo systemctl disable reo-fbref-daily.timer"
echo ""
echo "  Bridge: NOT touched"
echo "  PM2: NOT touched"
echo "  Tokens: NOT touched"
echo ""
