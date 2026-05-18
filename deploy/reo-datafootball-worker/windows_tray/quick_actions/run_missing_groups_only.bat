@echo off
title REO Smart Agent - Missing Groups Only
echo.
echo ==========================================
echo   MISSING GROUPS ONLY (+ upload)
echo   Strategy: soccerdata_first
echo   Groups:   missing
echo ==========================================
echo.
pushd "%~dp0..\.."
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -Strategy soccerdata_first -StatGroups missing -Upload
set "EXITCODE=%ERRORLEVEL%"
popd
echo.
if "%EXITCODE%"=="0" (
    echo [OK] Missing groups synced. Old cache on VPS preserved on failure.
) else (
    echo [FAIL] Sync exited with code %EXITCODE%
)
echo.
pause
