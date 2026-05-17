@echo off
title REO Data Sync - Timeout Test (1 minute)
echo.
echo ======================================
echo   Testing timeout (1 minute limit)
echo   Tray icon will appear by the clock
echo ======================================
echo.
start "" powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0..\ReoDataSyncTray.ps1" -ForceRun -TestTimeoutMinutes 1
echo [OK] Tray app launched with 1-minute timeout.
echo      Watch tray icon - should timeout and kill children.
echo.
timeout /t 5 >nul
