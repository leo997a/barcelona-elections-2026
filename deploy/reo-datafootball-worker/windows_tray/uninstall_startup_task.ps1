<#
.SYNOPSIS
    Uninstall REO Data Sync Tray Scheduled Task
.DESCRIPTION
    Removes the "REO Data Sync Tray" task. Does NOT delete logs, cache, or state.
#>

$TaskName = "REO Data Sync Tray"

Write-Host ""
Write-Host "  REO Data Sync Tray - Uninstall" -ForegroundColor Cyan
Write-Host ""

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if (-not $existing) {
    Write-Host "  [INFO] Task not found. Nothing to remove." -ForegroundColor Yellow
    exit 0
}

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "  [OK] Task removed: $TaskName" -ForegroundColor Green
    Write-Host "  Logs, cache, state are preserved." -ForegroundColor Gray
    Write-Host "  Reinstall: .\install_startup_task.ps1" -ForegroundColor Yellow
} catch {
    Write-Host "  [FAIL] Could not remove task: $_" -ForegroundColor Red
    exit 1
}
