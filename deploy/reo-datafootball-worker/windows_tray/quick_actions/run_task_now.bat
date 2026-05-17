@echo off
title REO Data Sync - Run Task
echo.
echo ======================================
echo   Triggering scheduled task manually
echo ======================================
echo.
schtasks /run /tn "REO Data Sync Tray"
echo.
pause
