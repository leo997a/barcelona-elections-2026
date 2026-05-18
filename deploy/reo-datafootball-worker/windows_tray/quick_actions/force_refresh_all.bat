@echo off
title REO Smart Agent - Force Refresh All
echo.
echo ==========================================
echo   FORCE REFRESH ALL GROUPS (+ upload)
echo   Ignores fresh-today + cooldown checks
echo   Strategy: soccerdata_first
echo   Groups:   all-safe
echo ==========================================
echo.
echo This will refetch every required group, even ones that
echo succeeded today or are in CAPTCHA cooldown.
echo.
set /p CONFIRM="Continue? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)
pushd "%~dp0..\.."
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -Strategy soccerdata_first -StatGroups all-safe -ForceRefresh -Upload
set "EXITCODE=%ERRORLEVEL%"
popd
echo.
if "%EXITCODE%"=="0" (
    echo [OK] Force refresh complete.
) else (
    echo [FAIL] Sync exited with code %EXITCODE%
)
echo.
pause
