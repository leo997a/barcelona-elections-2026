@echo off
title REO Data Sync - Stop Task
echo.
echo ======================================
echo   Stopping scheduled task
echo ======================================
echo.
schtasks /end /tn "REO Data Sync Tray"
echo.
pause
