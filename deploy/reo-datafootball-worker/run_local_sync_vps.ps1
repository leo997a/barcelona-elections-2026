<#
.SYNOPSIS
    REO Data Sync Agent - Smart Local Fetch, Validate, SCP, VPS Install

.DESCRIPTION
    Uses provider_selector with multiple strategies:
      soccerdata_first, direct_big5_first, soccerdata_only, direct_only, manual_only

    Flow:
      1. Create venv + install smart deps
      2. Run provider_selector.py with chosen strategy
      3. Run validate_cache.py
      4. If valid + -Upload: compress, SCP, install on VPS

.EXAMPLE
    .\run_local_sync_vps.ps1                                    # soccerdata_first, no upload
    .\run_local_sync_vps.ps1 -Upload                            # + upload to VPS
    .\run_local_sync_vps.ps1 -Strategy direct_only              # direct only
    .\run_local_sync_vps.ps1 -StatGroups standard               # standard only
    .\run_local_sync_vps.ps1 -StatGroups standard,shooting      # selected groups
    .\run_local_sync_vps.ps1 -StatGroups missing                # missing groups only
    .\run_local_sync_vps.ps1 -StatGroups next-missing           # first 1-2 missing groups
    .\run_local_sync_vps.ps1 -StatGroups all-safe               # safe staged coverage
    .\run_local_sync_vps.ps1 -Strategy soccerdata_first -Upload # full pipeline
    .\run_local_sync_vps.ps1 -SkipFetch -Upload                 # validate + upload existing cache
#>

param(
    [string]$Strategy,
    [string]$StatGroups = "missing",
    [switch]$Upload,
    [switch]$SkipFetch,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CacheDir = Join-Path (Join-Path $ScriptDir ".cache") "fbref"
$LogDir = Join-Path $ScriptDir ".cache"
$VenvDir = Join-Path $ScriptDir ".venv"
$ConfigFile = Join-Path $ScriptDir "local.sync.json"
$ArchiveName = "reo-fbref-cache.tar.gz"
$ArchivePath = Join-Path $LogDir $ArchiveName

# ===================================================================
# Helpers
# ===================================================================

function Write-Step($msg) { Write-Host "  [*] $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }

# ===================================================================
# Step 0: Load Config
# ===================================================================

Write-Host ""
Write-Host "===================================================" -ForegroundColor DarkCyan
Write-Host "  REO Smart Agent - FBref Local to VPS" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor DarkCyan
Write-Host ""

if (-not (Test-Path $ConfigFile)) {
    Write-Fail "local.sync.json not found."
    Write-Host "    cp local.sync.example.json local.sync.json" -ForegroundColor Yellow
    exit 1
}

$Cfg = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$GcpInstance = $Cfg.gcpInstance
$GcpZone = $Cfg.gcpZone
$RemoteArchive = $Cfg.remoteArchive
$RemoteCacheDir = $Cfg.remoteCacheDir

# Strategy: CLI param > config > default
if (-not $Strategy) {
    $Strategy = if ($Cfg.fetchStrategy) { $Cfg.fetchStrategy } else { "soccerdata_first" }
}
$Season = if ($Cfg.season) { $Cfg.season } else { "2025-26" }
$Headless = if ($null -ne $Cfg.headless) { $Cfg.headless.ToString().ToLower() } else { "true" }
$NextMissingCount = if ($Cfg.nextMissingBatchSize) { [int]$Cfg.nextMissingBatchSize } else { 1 }

Write-Step "Config: $GcpInstance ($GcpZone)"
Write-Host "       Strategy: $Strategy" -ForegroundColor Gray
Write-Host "       Groups:   $StatGroups" -ForegroundColor Gray
Write-Host "       NextMissingBatchSize: $NextMissingCount" -ForegroundColor Gray
Write-Host "       Season:   $Season" -ForegroundColor Gray
Write-Host "       Headless: $Headless" -ForegroundColor Gray
Write-Host ""

# ===================================================================
# Step 1: Python venv + smart deps
# ===================================================================

Write-Step "Checking Python venv..."

$PyExe = Join-Path (Join-Path $VenvDir "Scripts") "python.exe"
$PipExe = Join-Path (Join-Path $VenvDir "Scripts") "pip.exe"

if (-not (Test-Path $PyExe)) {
    Write-Step "Creating venv..."
    python -m venv $VenvDir
    Write-OK "venv created"
}

# Install smart requirements
Write-Step "Installing smart dependencies..."
$ErrorActionPreference = "Continue"
& $PipExe install -r (Join-Path $ScriptDir "requirements-smart.txt") -q 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
Write-OK "Dependencies ready"

# ===================================================================
# Step 2: Fetch via Provider Selector
# ===================================================================

if (-not $SkipFetch) {
    Write-Host ""
    Write-Step "Running provider selector (strategy: $Strategy)..."

    if (-not (Test-Path $CacheDir)) {
        New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null
    }

    $SoccerdataDir = Join-Path (Join-Path $ScriptDir ".cache") "soccerdata"

    $ErrorActionPreference = "Continue"
    & $PyExe -m providers.provider_selector `
        --strategy $Strategy `
        --season $Season `
        --cache-dir $CacheDir `
        --headless $Headless `
        --soccerdata-dir $SoccerdataDir `
        --stat-groups $StatGroups `
        --next-missing-count $NextMissingCount
    $FetchExit = $LASTEXITCODE
    $ErrorActionPreference = "Stop"

    if ($FetchExit -ne 0 -and -not $Force) {
        Write-Fail "Provider selector failed (exit $FetchExit). Use -Force to continue."
        exit 1
    }

    if ($FetchExit -eq 0) {
        Write-OK "Fetch completed successfully"
    } else {
        Write-Warn "Fetch had issues but continuing (-Force)"
    }
} else {
    Write-Warn "Skipping fetch (-SkipFetch)"
}

# ===================================================================
# Step 3: Validate Cache
# ===================================================================

Write-Host ""
Write-Step "Validating cache..."

$ErrorActionPreference = "Continue"
& $PyExe (Join-Path $ScriptDir "validate_cache.py") $CacheDir
$ValidExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($ValidExit -ne 0) {
    Write-Fail "Validation FAILED - upload BLOCKED"
    Write-Warn "Old cache on VPS is preserved."
    exit 1
}

Write-OK "Cache is valid"

# ===================================================================
# Step 4-6: Compress + Upload + Install (only with -Upload)
# ===================================================================

if ($Upload) {
    # Step 4: Compress
    Write-Host ""
    Write-Step "Compressing cache..."

    # Ensure metrics_coverage.json is included
    $MetricsFile = Join-Path $ScriptDir "metrics_coverage.json"
    if (Test-Path $MetricsFile) {
        Copy-Item -Path $MetricsFile -Destination $CacheDir -Force
        Write-OK "metrics_coverage.json added to archive"
    }

    Push-Location (Join-Path $ScriptDir ".cache")
    tar -czf $ArchiveName -C (Split-Path $CacheDir) (Split-Path $CacheDir -Leaf) 2>&1
    Pop-Location

    if (-not (Test-Path $ArchivePath)) {
        Write-Fail "Failed to create archive"
        exit 1
    }

    $ArchiveSize = [math]::Round((Get-Item $ArchivePath).Length / 1024, 1)
    Write-OK "Archive: $ArchiveName ($($ArchiveSize)KB)"

    # Step 5: SCP to VPS
    Write-Host ""
    Write-Step "Uploading to VPS via gcloud compute scp..."

    $ErrorActionPreference = "Continue"
    gcloud compute scp $ArchivePath "${GcpInstance}:${RemoteArchive}" --zone $GcpZone 2>&1
    $ScpExit = $LASTEXITCODE
    $ErrorActionPreference = "Stop"

    if ($ScpExit -ne 0) {
        Write-Fail "SCP upload failed"
        exit 1
    }

    Write-OK "Archive uploaded to ${GcpInstance}:${RemoteArchive}"

    # Step 6: Install on VPS
    Write-Host ""
    Write-Step "Installing cache on VPS..."

    $ErrorActionPreference = "Continue"
    gcloud compute ssh $GcpInstance --zone $GcpZone --command "bash /opt/reo-datafootball-worker/install_cache_from_upload.sh" 2>&1
    $InstallExit = $LASTEXITCODE
    $ErrorActionPreference = "Stop"

    if ($InstallExit -ne 0) {
        Write-Warn "VPS install returned non-zero. Check VPS logs."
    } else {
        Write-OK "Cache installed on VPS"
    }

    # Verify
    Write-Host ""
    Write-Step "Verification..."
    $ErrorActionPreference = "Continue"
    gcloud compute ssh $GcpInstance --zone $GcpZone --command "ls -lh /opt/reo-data-cache/fbref/" 2>&1
    $ErrorActionPreference = "Stop"

} else {
    Write-Host ""
    Write-Warn "Upload skipped. Run with -Upload to push to VPS."
    Write-Host "    .\run_local_sync_vps.ps1 -Upload" -ForegroundColor Yellow
}

# ===================================================================
# Done
# ===================================================================

Write-Host ""
Write-Host "===================================================" -ForegroundColor DarkCyan
Write-Host "  [DONE] Smart Agent Complete" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor DarkCyan
Write-Host "    Strategy: $Strategy" -ForegroundColor Gray
Write-Host "    Local:    $CacheDir" -ForegroundColor Gray
if ($Upload) {
    Write-Host "    VPS:      $RemoteCacheDir (installed)" -ForegroundColor Gray
}
Write-Host ""
