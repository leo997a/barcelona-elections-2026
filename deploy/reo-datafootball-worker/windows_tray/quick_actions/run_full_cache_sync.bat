@echo off
title REO Smart Agent - Full Cache Sync
echo.
echo ==========================================
echo   FULL CACHE SYNC (all-safe + upload)
echo   Strategy: soccerdata_first
echo   Groups:   all-safe
echo ==========================================
echo.
pushd "%~dp0..\.."
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -Strategy soccerdata_first -StatGroups all-safe -Upload
set "EXITCODE=%ERRORLEVEL%"
popd
echo.
if "%EXITCODE%"=="0" (
    echo [OK] Full sync finished. Check VPS: /opt/reo-data-cache/fbref/
) else (
    echo [FAIL] Sync exited with code %EXITCODE%
)
echo.
pause
