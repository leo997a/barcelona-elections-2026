@echo off
title REO Data Sync - Install Startup Task
echo.
echo ======================================
echo   Installing REO Data Sync Tray
echo   (runs at Windows logon)
echo ======================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0..\install_startup_task.ps1"
echo.
pause
