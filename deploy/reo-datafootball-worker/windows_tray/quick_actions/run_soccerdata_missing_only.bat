@echo off
title REO Smart Agent - Soccerdata Missing Only (no direct fallback)
echo.
echo ==========================================
echo   SOCCERDATA MISSING ONLY
echo   Strategy: soccerdata_only
echo   Groups:   missing
echo   NO direct_big5 fallback
echo ==========================================
echo.
pushd "%~dp0..\.."
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -Strategy soccerdata_only -StatGroups missing -Upload
set "EXITCODE=%ERRORLEVEL%"
popd
echo.
if "%EXITCODE%"=="0" (
    echo [OK] Soccerdata missing groups synced.
) else (
    echo [FAIL] Sync exited with code %EXITCODE%
)
echo.
pause
