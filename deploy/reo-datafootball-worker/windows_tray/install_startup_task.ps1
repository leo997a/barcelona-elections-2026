<#
.SYNOPSIS
    Install REO Data Sync Tray as a Windows Scheduled Task

.DESCRIPTION
    Creates a Scheduled Task "REO Data Sync Tray" that runs at user logon.
    The task launches ReoDataSyncTray.ps1 in hidden mode.
    Does NOT require admin privileges.
#>

$ErrorActionPreference = "Stop"

$TaskName = "REO Data Sync Tray"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkerDir = Split-Path -Parent $ScriptDir
$TrayScript = Join-Path $ScriptDir "ReoDataSyncTray.ps1"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  REO Data Sync Tray - Install Startup Task"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Verify script exists
if (-not (Test-Path $TrayScript)) {
    Write-Host "  [FAIL] ReoDataSyncTray.ps1 not found at:" -ForegroundColor Red
    Write-Host "         $TrayScript" -ForegroundColor Yellow
    exit 1
}

# Check if task already exists
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "  [WARN] Task '$TaskName' already exists." -ForegroundColor Yellow
    $confirm = Read-Host "  Overwrite? (y/n)"
    if ($confirm -ne "y") {
        Write-Host "  [INFO] Cancelled." -ForegroundColor Gray
        exit 0
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "  [OK] Old task removed" -ForegroundColor Green
}

# Build the action
$actionArgs = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$TrayScript`""
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument $actionArgs `
    -WorkingDirectory $WorkerDir

# Trigger: At logon of current user
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

# Register task for current user (no admin needed)
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "REO Data Sync Tray - Daily FBref cache sync at logon" `
        | Out-Null

    Write-Host ""
    Write-Host "  [OK] Scheduled Task created: $TaskName" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Details:" -ForegroundColor Gray
    Write-Host "    Trigger:    At logon" -ForegroundColor Gray
    Write-Host "    Action:     powershell.exe $actionArgs" -ForegroundColor Gray
    Write-Host "    WorkDir:    $WorkerDir" -ForegroundColor Gray
    Write-Host "    Timeout:    1 hour (task) + 45min (internal)" -ForegroundColor Gray
    Write-Host "    Instances:  Ignore new if running" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Manual test:" -ForegroundColor Cyan
    Write-Host "    schtasks /run /tn `"$TaskName`"" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Uninstall:" -ForegroundColor Cyan
    Write-Host "    .\uninstall_startup_task.ps1" -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "  [FAIL] Could not create task: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "  If you need admin privileges, run PowerShell as Administrator." -ForegroundColor Yellow
    exit 1
}
