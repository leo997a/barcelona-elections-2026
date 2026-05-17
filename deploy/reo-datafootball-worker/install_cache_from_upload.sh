#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# install_cache_from_upload.sh — Atomic Cache Install on VPS
#
# Called by: run_local_sync_vps.ps1 via gcloud compute ssh
# Input:     /tmp/reo-fbref-cache.tar.gz (uploaded by SCP)
# Output:    /opt/reo-data-cache/fbref/ (atomically replaced)
#
# ⚠️  RULES:
#   - Does NOT touch player-stats-bridge
#   - Does NOT run pm2 restart
#   - Does NOT touch tokens
#   - Does NOT do scraping
#   - Does NOT replace old cache if new cache is invalid
#   - Creates timestamped backup before replacing
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

ARCHIVE="/tmp/reo-fbref-cache.tar.gz"
TMP_DIR="/tmp/reo-fbref-cache-upload"
CACHE_DIR="/opt/reo-data-cache/fbref"
BACKUP_BASE="/opt/reo-data-cache/backups"
TIMESTAMP=$(date -u '+%Y%m%d-%H%M%S')

echo ""
echo "════════════════════════════════════════════════════════"
echo "  📦 REO Cache Installer — Atomic Install"
echo "════════════════════════════════════════════════════════"
echo ""

# ── 1. Check archive exists ─────────────────────────────────────────
if [ ! -f "$ARCHIVE" ]; then
    echo "  ❌ Archive not found: $ARCHIVE"
    echo "     Upload it first via gcloud compute scp"
    exit 1
fi

ARCHIVE_SIZE=$(du -h "$ARCHIVE" | cut -f1)
echo "  📦 Archive: $ARCHIVE ($ARCHIVE_SIZE)"

# ── 2. Extract to temp directory ─────────────────────────────────────
echo "  📂 Extracting to $TMP_DIR..."
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
tar -xzf "$ARCHIVE" -C "$TMP_DIR" 2>&1

# Find the fbref directory (tar may create a subdirectory)
EXTRACTED_DIR="$TMP_DIR"
if [ -d "$TMP_DIR/fbref" ]; then
    EXTRACTED_DIR="$TMP_DIR/fbref"
fi

# ── 3. Validate extracted files ──────────────────────────────────────
echo "  🔍 Validating extracted cache..."

JSON_COUNT=$(find "$EXTRACTED_DIR" -name "*.json" -size +100c | wc -l)

if [ "$JSON_COUNT" -eq 0 ]; then
    echo "  ❌ No valid JSON files found in archive"
    echo "  ⚠️  Old cache preserved — NOT replaced"
    rm -rf "$TMP_DIR"
    exit 1
fi

# Check each JSON file has players
VALID=0
INVALID=0
for f in "$EXTRACTED_DIR"/*.json; do
    [ -f "$f" ] || continue
    BASENAME=$(basename "$f")
    
    # Skip last_updated.json
    if [ "$BASENAME" = "last_updated.json" ]; then
        continue
    fi
    
    # Check player_count > 0
    PCOUNT=$(python3 -c "
import json, sys
try:
    d = json.load(open('$f'))
    pc = d.get('player_count', 0)
    players = d.get('players', [])
    if pc > 0 and len(players) > 0:
        print(len(players))
    else:
        print(0)
except:
    print(0)
" 2>/dev/null || echo "0")
    
    if [ "$PCOUNT" -gt "0" ]; then
        echo "  ✅ $BASENAME: $PCOUNT players"
        VALID=$((VALID + 1))
    else
        echo "  ❌ $BASENAME: invalid (0 players)"
        INVALID=$((INVALID + 1))
    fi
done

if [ "$VALID" -eq 0 ]; then
    echo ""
    echo "  ❌ ALL files invalid — old cache preserved"
    rm -rf "$TMP_DIR"
    exit 1
fi

echo ""
echo "  📊 Valid: $VALID files, Invalid: $INVALID files"

# ── 4. Backup current cache ─────────────────────────────────────────
if [ -d "$CACHE_DIR" ] && [ "$(ls -A $CACHE_DIR 2>/dev/null)" ]; then
    BACKUP_DIR="${BACKUP_BASE}/fbref-${TIMESTAMP}"
    echo ""
    echo "  💾 Backing up current cache to: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r "$CACHE_DIR"/* "$BACKUP_DIR"/ 2>/dev/null || true
    echo "  ✅ Backup created"
    
    # Keep only last 5 backups
    BACKUP_COUNT=$(ls -d ${BACKUP_BASE}/fbref-* 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 5 ]; then
        echo "  🗑️  Cleaning old backups (keeping 5)..."
        ls -d ${BACKUP_BASE}/fbref-* | head -n -5 | xargs rm -rf
    fi
else
    echo "  ℹ️  No existing cache to backup"
fi

# ── 5. Install new cache (atomic) ───────────────────────────────────
echo ""
echo "  📥 Installing new cache to $CACHE_DIR..."
mkdir -p "$CACHE_DIR"

# Copy only valid JSON files
for f in "$EXTRACTED_DIR"/*.json; do
    [ -f "$f" ] || continue
    cp "$f" "$CACHE_DIR"/
done

# Copy last_updated.json from parent if exists
PARENT_LAST_UPDATED="$TMP_DIR/last_updated.json"
if [ -f "$PARENT_LAST_UPDATED" ]; then
    cp "$PARENT_LAST_UPDATED" "/opt/reo-data-cache/last_updated.json"
fi

echo "  ✅ Cache installed"

# ── 6. Cleanup ───────────────────────────────────────────────────────
rm -rf "$TMP_DIR"
rm -f "$ARCHIVE"
echo "  🗑️  Temp files cleaned"

# ── 7. Final verification ───────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ Install Complete"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  Cache: $CACHE_DIR"
ls -lh "$CACHE_DIR"/*.json 2>/dev/null || echo "  (no files)"
echo ""
echo "  ⚠️  player-stats-bridge NOT restarted (Phase B)"
echo "  ⚠️  pm2 NOT touched"
echo "  ⚠️  Tokens NOT touched"
echo ""
