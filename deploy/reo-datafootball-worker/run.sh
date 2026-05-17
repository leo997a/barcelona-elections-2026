#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# REO DataFootball Worker — Run Script
#
# Usage:
#   ./run.sh              → Fetch all leagues
#   ./run.sh la-liga      → Fetch specific league only
#
# Cron example (every 6 hours, avoiding broadcast times 18:00-01:00 UTC):
#   0 6,12 * * * /opt/reo-datafootball-worker/run.sh
#
# ⚠️  NEVER run this during a live broadcast.
#     player-stats-bridge reads from cache only — no live scraping.
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

WORKER_DIR="/opt/reo-datafootball-worker"
VENV_DIR="${WORKER_DIR}/venv"
CACHE_DIR="/opt/reo-data-cache"
LOG_FILE="${CACHE_DIR}/worker.log"

# Ensure cache directory exists
mkdir -p "${CACHE_DIR}/fbref"

# Activate virtual environment
if [ ! -d "${VENV_DIR}" ]; then
    echo "❌ Virtual environment not found at ${VENV_DIR}"
    echo "   Run: python3 -m venv ${VENV_DIR} && ${VENV_DIR}/bin/pip install -r ${WORKER_DIR}/requirements.txt"
    exit 1
fi

source "${VENV_DIR}/bin/activate"

echo "════════════════════════════════════════"
echo "🚀 REO DataFootball Worker"
echo "   Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "════════════════════════════════════════"

# Run the worker
cd "${WORKER_DIR}"
python fetch_fbref.py 2>&1 | tee -a "${LOG_FILE}"

echo ""
echo "✅ Worker finished at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
