@echo off
title REO Data Sync - Run Now
echo.
echo ======================================
echo   Starting REO Data Sync (ForceRun)
echo   Tray icon will appear by the clock
echo ======================================
echo.
start "" powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0..\ReoDataSyncTray.ps1" -ForceRun
echo [OK] Tray app launched. Check system tray icon.
echo.
timeout /t 5 >nul
