@echo off
title REO Smart Agent - Import Manual FBref Cache
echo.
echo ==========================================
echo   IMPORT MANUAL FBREF HTML/CSV FILES
echo   Strategy: manual_fbref
echo   Groups:   missing (auto-detect)
echo   Source:   .manual\fbref\*.html / *.csv
echo ==========================================
echo.
echo Place your saved FBref HTML or CSV files in:
echo   deploy\reo-datafootball-worker\.manual\fbref\
echo.
echo Expected file names:
echo   passing.html (or .csv)
echo   gca.html (or .csv)
echo   defense.html (or .csv)
echo   possession.html (or .csv)
echo   pass_types.html (or .csv)
echo.
pushd "%~dp0..\.."
if not exist ".manual\fbref" (
    echo [INFO] Creating .manual\fbref directory...
    mkdir ".manual\fbref" 2>nul
)
dir /b ".manual\fbref\*.html" ".manual\fbref\*.csv" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [FAIL] No HTML or CSV files found in .manual\fbref\
    echo        Save FBref pages there first, then re-run this script.
    popd
    echo.
    pause
    exit /b 1
)
echo.
echo [INFO] Files found. Starting import...
echo.
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -Strategy manual_fbref -StatGroups missing -Upload
set "EXITCODE=%ERRORLEVEL%"
popd
echo.
if "%EXITCODE%"=="0" (
    echo [OK] Manual import complete. Cache uploaded to VPS.
) else (
    echo [FAIL] Import exited with code %EXITCODE%
)
echo.
pause
