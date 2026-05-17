@echo off
title REO Data Sync - Uninstall Startup Task
echo.
echo ======================================
echo   Removing REO Data Sync Tray
echo   (logs and cache preserved)
echo ======================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0..\uninstall_startup_task.ps1"
echo.
pause
