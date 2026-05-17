#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# REO DataFootball Worker — VPS Setup Script
#
# Run this ONCE on the VPS to set up the worker.
#
# Prerequisites:
#   - Python 3.10+ installed
#   - SSH access to VPS
#   - reo-player-stats-bridge already running on port 8095
#
# Usage:
#   ssh your-vps
#   bash setup_vps.sh
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

echo "════════════════════════════════════════════════════════"
echo "  REO DataFootball Worker — VPS Setup"
echo "════════════════════════════════════════════════════════"

# ── 1. Create directories ───────────────────────────────────────────
echo ""
echo "📁 Creating directories..."
sudo mkdir -p /opt/reo-datafootball-worker
sudo mkdir -p /opt/reo-data-cache/fbref

# Set ownership (adjust user as needed)
CURRENT_USER=$(whoami)
sudo chown -R "${CURRENT_USER}:${CURRENT_USER}" /opt/reo-datafootball-worker
sudo chown -R "${CURRENT_USER}:${CURRENT_USER}" /opt/reo-data-cache

echo "   ✅ /opt/reo-datafootball-worker"
echo "   ✅ /opt/reo-data-cache/fbref"

# ── 2. Copy worker files ────────────────────────────────────────────
echo ""
echo "📋 Copying worker files..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cp "${SCRIPT_DIR}/fetch_fbref.py" /opt/reo-datafootball-worker/
cp "${SCRIPT_DIR}/config.json" /opt/reo-datafootball-worker/
cp "${SCRIPT_DIR}/requirements.txt" /opt/reo-datafootball-worker/
cp "${SCRIPT_DIR}/run.sh" /opt/reo-datafootball-worker/
cp "${SCRIPT_DIR}/README.md" /opt/reo-datafootball-worker/

chmod +x /opt/reo-datafootball-worker/run.sh

echo "   ✅ Files copied"

# ── 3. Create Python virtual environment ─────────────────────────────
echo ""
echo "🐍 Setting up Python virtual environment..."
cd /opt/reo-datafootball-worker

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "   ✅ venv created"
else
    echo "   ℹ️  venv already exists"
fi

source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "   ✅ Dependencies installed"

# ── 4. Test run ──────────────────────────────────────────────────────
echo ""
echo "🧪 Running test fetch..."
python fetch_fbref.py
echo "   ✅ Test completed"

# ── 5. Setup cron (optional) ─────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  Worker:  /opt/reo-datafootball-worker/"
echo "  Cache:   /opt/reo-data-cache/fbref/"
echo "  Log:     /opt/reo-data-cache/worker.log"
echo ""
echo "  Manual run:"
echo "    /opt/reo-datafootball-worker/run.sh"
echo ""
echo "  To add cron (every 6 hours at 06:00 and 12:00 UTC):"
echo "    crontab -e"
echo "    0 6,12 * * * /opt/reo-datafootball-worker/run.sh"
echo ""
echo "  ⚠️  Do NOT schedule cron during 18:00-01:00 UTC (broadcast hours)"
echo ""

# ── 6. Bridge integration — DEFERRED TO PHASE B ──────────────────────
# ⚠️  DO NOT copy to player-stats-bridge or restart PM2 in Phase A.
# fbrefCacheReader.js will be integrated in Phase B after verifying cache.
echo ""
echo "ℹ️  Phase A complete. Bridge integration deferred to Phase B."
echo "   fbrefCacheReader.js is ready but NOT copied to player-stats-bridge."
