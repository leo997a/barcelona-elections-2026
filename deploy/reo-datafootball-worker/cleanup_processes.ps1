<#
.SYNOPSIS
    Kill the FBref Smart Agent process tree and any orphan Chrome / chromedriver
    processes that the local agent may have spawned.

.DESCRIPTION
    Single-purpose cleanup helper used in three places:
      - run_local_sync_vps.ps1 (try/finally)
      - ReoDataSyncTray.ps1 (cancel / timeout / exit)
      - kill_reo_sync_children.bat (manual emergency button)

    Reads the lock file at .state/reo-sync.lock to find the child PID,
    walks down the process tree, and kills it. Then sweeps any orphan
    chromedriver.exe / chrome.exe whose command line references the
    soccerdata profile or the worker .cache directory, so we never leave
    headless browsers behind after a cancel.

.PARAMETER Reason
    Free-text reason recorded in the log line.
.PARAMETER Force
    If $true, also kill orphan chromedriver.exe / chrome.exe WITHOUT prompting.
#>

param(
    [string]$Reason = "manual_cleanup",
    [switch]$Force
)

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StateDir  = Join-Path $ScriptDir ".state"
$LockFile  = Join-Path $StateDir "reo-sync.lock"
$LogDir    = Join-Path $ScriptDir ".logs"
$Today     = (Get-Date).ToString("yyyy-MM-dd")
$LogFile   = Join-Path $LogDir "reo-sync-$Today.log"

function Write-CleanupLog {
    param([string]$Level, [string]$Msg)
    $ts = (Get-Date).ToString("HH:mm:ss")
    $line = "[$ts] [$Level] [cleanup] $Msg"
    Write-Host $line
    if (Test-Path $LogDir) {
        Add-Content -Path $LogFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
    }
}

Write-CleanupLog "INFO" "Cleanup requested (reason: $Reason)"

# ── 1. Try to read child PID from lock file ─────────────────────────
$childPid = 0
if (Test-Path $LockFile) {
    try {
        $lock = Get-Content $LockFile -Raw | ConvertFrom-Json
        if ($lock.childPid -gt 0) {
            $childPid = [int]$lock.childPid
            Write-CleanupLog "INFO" "Found child PID in lock: $childPid"
        }
    } catch {
        Write-CleanupLog "WARN" "Could not parse lock file: $_"
    }
}

# ── 2. Kill the tracked process tree ─────────────────────────────────
if ($childPid -gt 0) {
    try {
        $null = Start-Process -FilePath "taskkill.exe" `
            -ArgumentList "/PID $childPid /T /F" `
            -NoNewWindow -Wait -ErrorAction SilentlyContinue
        Write-CleanupLog "OK" "Killed process tree PID $childPid"
    } catch {
        Write-CleanupLog "WARN" "Could not kill PID $childPid : $_"
    }
}

# ── 3. Sweep orphan chromedriver / chrome processes that look like ours.
# We match on command-line substrings to avoid touching unrelated browser sessions.
$ourMarkers = @(
    "soccerdata",
    "reo-datafootball-worker",
    "reo-fbref",
    ".cache\\fbref",
    ".cache/fbref"
)

function Get-MatchingProcesses {
    param([string]$Name)
    try {
        $procs = Get-CimInstance Win32_Process -Filter "Name='$Name'" -ErrorAction SilentlyContinue
        if (-not $procs) { return @() }
        return $procs | Where-Object {
            $cl = $_.CommandLine
            if (-not $cl) { return $false }
            foreach ($marker in $ourMarkers) {
                if ($cl -like "*$marker*") { return $true }
            }
            return $false
        }
    } catch {
        return @()
    }
}

$drivers = Get-MatchingProcesses -Name "chromedriver.exe"
$browsers = Get-MatchingProcesses -Name "chrome.exe"

if ($drivers.Count -eq 0 -and $browsers.Count -eq 0) {
    Write-CleanupLog "OK" "No matching orphan chromedriver / chrome processes"
} else {
    Write-CleanupLog "WARN" ("Found {0} chromedriver and {1} chrome orphans matching our markers" -f $drivers.Count, $browsers.Count)
    foreach ($p in @($drivers + $browsers)) {
        try {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
            Write-CleanupLog "OK" ("Killed {0} PID {1}" -f $p.Name, $p.ProcessId)
        } catch {
            Write-CleanupLog "WARN" ("Could not kill PID {0}: {1}" -f $p.ProcessId, $_)
        }
    }
}

# ── 4. Optional: aggressive sweep of any leftover python.exe with our worker dir.
if ($Force) {
    $pythons = Get-MatchingProcesses -Name "python.exe"
    foreach ($p in $pythons) {
        try {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
            Write-CleanupLog "OK" ("Killed python PID {0}" -f $p.ProcessId)
        } catch {
            Write-CleanupLog "WARN" ("Could not kill python PID {0}: {1}" -f $p.ProcessId, $_)
        }
    }
}

# ── 5. Remove lock file last, so a concurrent reader still sees it during kill.
if (Test-Path $LockFile) {
    Remove-Item -Path $LockFile -Force -ErrorAction SilentlyContinue
    Write-CleanupLog "INFO" "Lock file removed"
}

Write-CleanupLog "OK" "Cleanup done"
