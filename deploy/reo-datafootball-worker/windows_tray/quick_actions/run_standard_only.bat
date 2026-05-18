@echo off
title REO Smart Agent - Standard Only
echo.
echo ==========================================
echo   STANDARD ONLY (no upload)
echo   Strategy: soccerdata_first
echo   Groups:   standard
echo ==========================================
echo.
pushd "%~dp0..\.."
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -Strategy soccerdata_first -StatGroups standard
set "EXITCODE=%ERRORLEVEL%"
popd
echo.
if "%EXITCODE%"=="0" (
    echo [OK] Standard cache fetched. Use run_full_cache_sync.bat to upload.
) else (
    echo [FAIL] Fetch exited with code %EXITCODE%
)
echo.
pause
