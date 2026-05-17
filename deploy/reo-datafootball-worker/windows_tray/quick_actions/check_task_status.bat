@echo off
title REO Data Sync - Task Status
echo.
echo ======================================
echo   REO Data Sync Tray - Task Status
echo ======================================
echo.
schtasks /query /tn "REO Data Sync Tray" /v /fo list
echo.
pause
