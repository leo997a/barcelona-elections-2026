<#
.SYNOPSIS
    REO Data Sync Tray - System Tray icon for daily FBref cache sync

.DESCRIPTION
    Shows a System Tray icon while running the Smart Agent daily sync.
    Runs once per day, syncs local FBref cache to VPS, then exits.

    Features:
    - Once-per-day guard via state file
    - Lock file prevents double-run
    - 45-minute timeout
    - Windows notification on completion
    - Right-click menu: Status, Open Logs, Run Now, Cancel, Exit

    Does NOT:
    - Run 24 hours
    - Touch player-stats-bridge / PM2 / Nginx / Vercel / tokens
    - Upload failed cache
    - Open browser pages in auto mode
#>

param(
    [switch]$ForceRun,
    [int]$TestTimeoutMinutes = 0
)

# ── Paths ────────────────────────────────────────────────────────────
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkerDir = Split-Path -Parent $ScriptDir
$StateDir = Join-Path $WorkerDir ".state"
$LogDir = Join-Path $WorkerDir ".logs"
$StateFile = Join-Path $StateDir "reo-sync-state.json"
$LockFile = Join-Path $StateDir "reo-sync.lock"
$SyncScript = Join-Path $WorkerDir "run_local_sync_vps.ps1"
$Today = (Get-Date).ToString("yyyy-MM-dd")
$LogFile = Join-Path $LogDir "reo-sync-$Today.log"
$TimeoutMinutes = if ($TestTimeoutMinutes -gt 0) { $TestTimeoutMinutes } else { 45 }

# ── Ensure directories ──────────────────────────────────────────────
if (-not (Test-Path $StateDir)) { New-Item -ItemType Directory -Path $StateDir -Force | Out-Null }
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

# ── Log helper ───────────────────────────────────────────────────────
function Write-Log {
    param([string]$Level, [string]$Msg)
    $ts = (Get-Date).ToString("HH:mm:ss")
    $line = "[$ts] [$Level] $Msg"
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

# ── State helpers ────────────────────────────────────────────────────
function Get-SyncState {
    if (Test-Path $StateFile) {
        try {
            return Get-Content $StateFile -Raw | ConvertFrom-Json
        } catch {
            return $null
        }
    }
    return $null
}

function Set-SyncState {
    param([string]$Status, [string]$Message, [string]$StartedAt, [string]$FinishedAt)
    $state = @{
        lastAttemptDate = $Today
        lastSuccessDate = if ($Status -eq "success") { $Today } else {
            $prev = Get-SyncState
            if ($prev -and $prev.lastSuccessDate) { $prev.lastSuccessDate } else { "" }
        }
        lastStatus = $Status
        lastMessage = $Message
        lastRunStartedAt = $StartedAt
        lastRunFinishedAt = $FinishedAt
    }
    $state | ConvertTo-Json -Depth 3 | Set-Content -Path $StateFile -Encoding UTF8
}

function Test-AlreadyRanToday {
    $state = Get-SyncState
    if ($null -eq $state) { return $false }
    return ($state.lastAttemptDate -eq $Today)
}

# ── Lock helpers ─────────────────────────────────────────────────────
function Test-Locked {
    if (Test-Path $LockFile) {
        $lockAge = ((Get-Date) - (Get-Item $LockFile).LastWriteTime).TotalMinutes
        if ($lockAge -gt 60) {
            # Stale lock - remove it
            Remove-Item -Path $LockFile -Force -ErrorAction SilentlyContinue
            Write-Log "WARN" "Stale lock removed (age: $([math]::Round($lockAge))min)"
            return $false
        }
        return $true
    }
    return $false
}

function Set-Lock {
    param([int]$ChildPid = 0)
    $content = @{ trayPid = $PID; childPid = $ChildPid; startedAt = (Get-Date -Format 'o') }
    $content | ConvertTo-Json | Set-Content -Path $LockFile -Encoding UTF8
}

function Remove-Lock {
    Remove-Item -Path $LockFile -Force -ErrorAction SilentlyContinue
}

# ══════════════════════════════════════════════════════════════════════
# System Tray UI
# ══════════════════════════════════════════════════════════════════════

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Create icon from text (no external file needed)
function New-TrayIcon {
    param([string]$Color = "DodgerBlue")
    $bmp = New-Object System.Drawing.Bitmap(16, 16)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $brush = [System.Drawing.Brushes]::$Color
    $g.FillEllipse($brush, 1, 1, 14, 14)
    # R letter
    $font = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Bold)
    $g.DrawString("R", $font, [System.Drawing.Brushes]::White, 2, 1)
    $g.Dispose()
    return [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
}

$script:SyncProcess = $null
$script:SyncChildPid = 0
$script:IsRunning = $false
$script:ShouldExit = $false
$script:ManualRun = $false

# Kill entire process tree (python, chrome, chromedriver)
function Stop-SyncProcessTree {
    param([string]$Reason = "unknown")
    if ($script:SyncChildPid -gt 0) {
        Write-Log "WARN" "Killing process tree PID $($script:SyncChildPid) ($Reason)"
        $null = Start-Process -FilePath "taskkill.exe" -ArgumentList "/PID $($script:SyncChildPid) /T /F" -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
    } elseif ($script:SyncProcess -and -not $script:SyncProcess.HasExited) {
        Write-Log "WARN" "Killing process PID $($script:SyncProcess.Id) ($Reason)"
        $null = Start-Process -FilePath "taskkill.exe" -ArgumentList "/PID $($script:SyncProcess.Id) /T /F" -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
    }
    $script:SyncProcess = $null
    $script:SyncChildPid = 0
}

# Create NotifyIcon
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = New-TrayIcon -Color "DodgerBlue"
$notifyIcon.Text = "REO Data Sync"
$notifyIcon.Visible = $true

# Context menu
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$menuStatus = New-Object System.Windows.Forms.ToolStripMenuItem
$menuStatus.Text = "Status: Idle"
$menuStatus.Enabled = $false

$menuOpenLogs = New-Object System.Windows.Forms.ToolStripMenuItem
$menuOpenLogs.Text = "Open Logs"
$menuOpenLogs.Add_Click({
    if (Test-Path $LogFile) {
        Start-Process notepad.exe -ArgumentList $LogFile
    } else {
        [System.Windows.Forms.MessageBox]::Show("No log file for today.", "REO Data Sync", "OK", "Information")
    }
})

$menuRunNow = New-Object System.Windows.Forms.ToolStripMenuItem
$menuRunNow.Text = "Run Now (missing)"
$menuRunNow.Add_Click({
    if ($script:IsRunning) {
        [System.Windows.Forms.MessageBox]::Show("Sync is already running.", "REO Data Sync", "OK", "Information")
        return
    }
    if (Test-Locked) {
        [System.Windows.Forms.MessageBox]::Show("Another instance is running (lock file exists).", "REO Data Sync", "OK", "Warning")
        return
    }
    $script:ManualRun = $true
    Start-SyncJob -StatGroups "missing"
})

$menuRunAllSafe = New-Object System.Windows.Forms.ToolStripMenuItem
$menuRunAllSafe.Text = "Run Now (all-safe)"
$menuRunAllSafe.Add_Click({
    if ($script:IsRunning) {
        [System.Windows.Forms.MessageBox]::Show("Sync is already running.", "REO Data Sync", "OK", "Information")
        return
    }
    if (Test-Locked) {
        [System.Windows.Forms.MessageBox]::Show("Another instance is running (lock file exists).", "REO Data Sync", "OK", "Warning")
        return
    }
    $script:ManualRun = $true
    Start-SyncJob -StatGroups "all-safe"
})

$menuCancel = New-Object System.Windows.Forms.ToolStripMenuItem
$menuCancel.Text = "Cancel Current Run"
$menuCancel.Enabled = $false
$menuCancel.Add_Click({
    if ($script:IsRunning) {
        Write-Log "WARN" "User cancelled sync"
        Stop-SyncProcessTree -Reason "user_cancel"
        Update-Status "Cancelled" "Orange"
        Remove-Lock
        $script:IsRunning = $false
        $menuCancel.Enabled = $false
        $menuRunNow.Enabled = $true
        $menuRunAllSafe.Enabled = $true
        Set-SyncState -Status "cancelled" -Message "Cancelled by user" `
            -StartedAt $script:RunStartedAt -FinishedAt (Get-Date -Format "o")
    }
})

$menuSep = New-Object System.Windows.Forms.ToolStripSeparator

$menuExit = New-Object System.Windows.Forms.ToolStripMenuItem
$menuExit.Text = "Exit"
$menuExit.Add_Click({
    if ($script:IsRunning) {
        $confirm = [System.Windows.Forms.MessageBox]::Show(
            "Sync is running. Cancel and exit?", "REO Data Sync",
            "YesNo", "Warning")
        if ($confirm -eq "No") { return }
        Stop-SyncProcessTree -Reason "user_exit"
        Remove-Lock
    }
    $script:ShouldExit = $true
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    [System.Windows.Forms.Application]::Exit()
})

$contextMenu.Items.AddRange(@($menuStatus, (New-Object System.Windows.Forms.ToolStripSeparator), $menuOpenLogs, $menuRunNow, $menuRunAllSafe, $menuCancel, $menuSep, $menuExit))
$notifyIcon.ContextMenuStrip = $contextMenu

# ── Status updater ───────────────────────────────────────────────────
function Update-Status {
    param([string]$Text, [string]$Color = "DodgerBlue")
    $menuStatus.Text = "Status: $Text"
    $notifyIcon.Text = "REO Sync: $Text"
    $notifyIcon.Icon = New-TrayIcon -Color $Color
    Write-Log "INFO" "Status: $Text"
}

function Show-Notification {
    param([string]$Title, [string]$Message, [string]$Type = "Info")
    $iconType = [System.Windows.Forms.ToolTipIcon]::$Type
    $notifyIcon.ShowBalloonTip(5000, $Title, $Message, $iconType)
}

# ══════════════════════════════════════════════════════════════════════
# Sync Job
# ══════════════════════════════════════════════════════════════════════

function Start-SyncJob {
    param([string]$StatGroups = "next-missing")
    $script:IsRunning = $true
    $script:RunStartedAt = Get-Date -Format "o"
    $menuCancel.Enabled = $true
    $menuRunNow.Enabled = $false
    $menuRunAllSafe.Enabled = $false

    Write-Log "INFO" "=== Sync started ==="
    Write-Log "INFO" "Strategy: soccerdata_first"
    Write-Log "INFO" "StatGroups: $StatGroups"
    Write-Log "INFO" "Script: $SyncScript"

    Update-Status "Running..." "Gold"
    Set-Lock

    # Child process log file (no stdout/stderr redirect to avoid buffer deadlock)
    $script:ChildLogFile = Join-Path $LogDir "reo-sync-child-$Today.log"

    # Start the sync process - output goes to file, NOT to pipe
    # This prevents buffer deadlock on long-running processes
    try {
        $script:SyncProcess = Start-Process -FilePath "powershell.exe" `
            -ArgumentList @(
                "-ExecutionPolicy", "Bypass",
                "-WindowStyle", "Hidden",
                "-File", "`"$SyncScript`"",
                "-Strategy", "soccerdata_first",
                "-StatGroups", $StatGroups,
                "-Upload"
            ) `
            -WorkingDirectory $WorkerDir `
            -WindowStyle Hidden `
            -PassThru `
            -RedirectStandardOutput $script:ChildLogFile `
            -RedirectStandardError (Join-Path $LogDir "reo-sync-child-err-$Today.log")

        $script:SyncChildPid = $script:SyncProcess.Id
        Set-Lock -ChildPid $script:SyncChildPid
        Write-Log "INFO" "Process started (PID: $($script:SyncChildPid))"
    } catch {
        Write-Log "FAIL" "Failed to start sync: $_"
        Update-Status "Failed to start" "Red"
        Remove-Lock
        $script:IsRunning = $false
        $menuCancel.Enabled = $false
        $menuRunNow.Enabled = $true
        $menuRunAllSafe.Enabled = $true
        Set-SyncState -Status "failed" -Message "Failed to start: $_" `
            -StartedAt $script:RunStartedAt -FinishedAt (Get-Date -Format "o")
        Show-Notification "REO Data Sync" "Failed to start sync process" "Error"
        return
    }
}

# ── Timer to monitor the running process ─────────────────────────────
$monitorTimer = New-Object System.Windows.Forms.Timer
$monitorTimer.Interval = 2000  # Check every 2 seconds

$monitorTimer.Add_Tick({
    if (-not $script:IsRunning -or $null -eq $script:SyncProcess) {
        return
    }

    # Check timeout
    $elapsed = ((Get-Date) - [datetime]$script:RunStartedAt).TotalMinutes
    if ($elapsed -gt $TimeoutMinutes) {
        Write-Log "FAIL" "Timeout after $TimeoutMinutes minutes"
        Stop-SyncProcessTree -Reason "timeout"
        $script:IsRunning = $false
        Remove-Lock
        $menuCancel.Enabled = $false
        $menuRunNow.Enabled = $true
        Update-Status "Failed (timeout)" "Red"
        Set-SyncState -Status "failed" -Message "Timeout after ${TimeoutMinutes}min" `
            -StartedAt $script:RunStartedAt -FinishedAt (Get-Date -Format "o")
        Show-Notification "REO Data Sync failed" "Timed out after $TimeoutMinutes minutes. Old VPS cache preserved." "Error"

        # Auto-exit after notification delay
        $exitTimer = New-Object System.Windows.Forms.Timer
        $exitTimer.Interval = 5000
        $exitTimer.Add_Tick({
            $this.Stop(); $this.Dispose()
            $notifyIcon.Visible = $false; $notifyIcon.Dispose()
            [System.Windows.Forms.Application]::Exit()
        })
        $exitTimer.Start()
        return
    }

    # Check if process finished
    if ($script:SyncProcess.HasExited) {
        $exitCode = $script:SyncProcess.ExitCode

        # Read child log file (output was redirected to file, not pipe)
        if ($script:ChildLogFile -and (Test-Path $script:ChildLogFile)) {
            $childOutput = Get-Content $script:ChildLogFile -Raw -ErrorAction SilentlyContinue
            if ($childOutput) {
                $childOutput -split "`n" | ForEach-Object {
                    $line = $_.Trim()
                    if ($line) { Write-Log "OUT" $line }
                }
            }
        }
        $childErrFile = Join-Path $LogDir "reo-sync-child-err-$Today.log"
        if (Test-Path $childErrFile) {
            $childErr = Get-Content $childErrFile -Raw -ErrorAction SilentlyContinue
            if ($childErr) {
                $childErr -split "`n" | ForEach-Object {
                    $line = $_.Trim()
                    if ($line) { Write-Log "ERR" $line }
                }
            }
        }

        $script:SyncProcess = $null
        $script:IsRunning = $false
        Remove-Lock
        $menuCancel.Enabled = $false
        $menuRunNow.Enabled = $true
        $menuRunAllSafe.Enabled = $true
        $finishedAt = Get-Date -Format "o"

        if ($exitCode -eq 0) {
            Write-Log "OK" "Sync completed successfully (exit 0)"
            Update-Status "Completed" "Green"
            Set-SyncState -Status "success" -Message "Cache uploaded to VPS" `
                -StartedAt $script:RunStartedAt -FinishedAt $finishedAt
            Show-Notification "REO Data Sync completed" "Cache uploaded to VPS" "Info"
        } else {
            Write-Log "FAIL" "Sync failed (exit $exitCode)"
            Update-Status "Failed" "Red"
            Set-SyncState -Status "failed" -Message "Exit code: $exitCode" `
                -StartedAt $script:RunStartedAt -FinishedAt $finishedAt
            Show-Notification "REO Data Sync failed" "Old VPS cache preserved." "Error"
        }

        # Auto-exit after delay
        $exitTimer = New-Object System.Windows.Forms.Timer
        $exitTimer.Interval = 8000
        $exitTimer.Add_Tick({
            $this.Stop()
            $this.Dispose()
            $notifyIcon.Visible = $false
            $notifyIcon.Dispose()
            [System.Windows.Forms.Application]::Exit()
        })
        $exitTimer.Start()
    } else {
        # Still running - update elapsed time
        $mins = [math]::Round($elapsed, 0)
        $notifyIcon.Text = "REO Sync: Running (${mins}m / ${TimeoutMinutes}m)"
    }
})

$monitorTimer.Start()

# ══════════════════════════════════════════════════════════════════════
# Main Logic
# ══════════════════════════════════════════════════════════════════════

Write-Log "INFO" "REO Data Sync Tray started"
Write-Log "INFO" "Date: $Today"

# Check if already ran today
if (-not $ForceRun -and (Test-AlreadyRanToday)) {
    $state = Get-SyncState
    Write-Log "INFO" "Already ran today (status: $($state.lastStatus))"
    Update-Status "Already ran today" "Green"
    $notifyIcon.Text = "REO Sync: Already ran today"
    Show-Notification "REO Data Sync" "Already completed today. No action needed." "Info"

    # Auto-exit after 5 seconds
    $exitTimer = New-Object System.Windows.Forms.Timer
    $exitTimer.Interval = 5000
    $exitTimer.Add_Tick({
        $this.Stop()
        $this.Dispose()
        $notifyIcon.Visible = $false
        $notifyIcon.Dispose()
        [System.Windows.Forms.Application]::Exit()
    })
    $exitTimer.Start()

} elseif (Test-Locked) {
    Write-Log "WARN" "Lock file exists - another instance running"
    Update-Status "Locked (another instance)" "Orange"
    Show-Notification "REO Data Sync" "Another sync is already running." "Warning"

    $exitTimer = New-Object System.Windows.Forms.Timer
    $exitTimer.Interval = 5000
    $exitTimer.Add_Tick({
        $this.Stop()
        $this.Dispose()
        $notifyIcon.Visible = $false
        $notifyIcon.Dispose()
        [System.Windows.Forms.Application]::Exit()
    })
    $exitTimer.Start()

} else {
    # Daily automatic sync fetches only the next missing batch, not every missing group.
    Start-SyncJob -StatGroups "next-missing"
}

# Run message loop
[System.Windows.Forms.Application]::Run()
