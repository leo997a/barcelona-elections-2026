@echo off
title REO Data Sync - Emergency Kill
echo.
echo ==========================================
echo   EMERGENCY: Kill stuck sync processes
echo   Use ONLY if REO sync is stuck.
echo ==========================================
echo.
echo WARNING: This will kill python/chromedriver
echo processes that may belong to REO sync.
echo.

REM Try to read child PID from lock file
set "LOCKFILE=%~dp0..\..\.state\reo-sync.lock"
if exist "%LOCKFILE%" (
    echo [INFO] Lock file found. Reading child PID...
    powershell -Command "try { $j = Get-Content '%LOCKFILE%' -Raw | ConvertFrom-Json; if ($j.childPid -gt 0) { Write-Host '[INFO] Killing process tree PID:' $j.childPid; taskkill /PID $j.childPid /T /F } else { Write-Host '[WARN] No child PID in lock' } } catch { Write-Host '[WARN] Could not parse lock file' }"
    echo.
    del /f "%LOCKFILE%" 2>nul
    echo [OK] Lock file removed
) else (
    echo [INFO] No lock file found.
)

echo.
echo --- Checking for orphan processes ---
echo.

tasklist /fi "imagename eq chromedriver.exe" 2>nul | find /i "chromedriver" >nul
if %errorlevel%==0 (
    echo [WARN] chromedriver.exe found running.
    set /p KILLCD="Kill chromedriver.exe? (y/n): "
    if /i "%KILLCD%"=="y" taskkill /im chromedriver.exe /f
) else (
    echo [OK] No chromedriver.exe found
)

echo.
echo [INFO] Done. Check task manager if issues persist.
echo.
pause
