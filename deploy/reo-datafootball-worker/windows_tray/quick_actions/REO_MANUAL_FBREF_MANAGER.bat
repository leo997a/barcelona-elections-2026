@echo off
title REO Manual FBref Manager
color 0E

set "WORKER=%~dp0..\.."
set "MANUAL=%WORKER%\.manual\fbref"
set "INCOMING=%MANUAL%\incoming"
set "PYEXE=%WORKER%\.venv\Scripts\python.exe"

REM Ensure directories exist
if not exist "%MANUAL%" mkdir "%MANUAL%" 2>nul
if not exist "%INCOMING%" mkdir "%INCOMING%" 2>nul
if not exist "%MANUAL%\processed" mkdir "%MANUAL%\processed" 2>nul
if not exist "%MANUAL%\rejected" mkdir "%MANUAL%\rejected" 2>nul
if not exist "%MANUAL%\reports" mkdir "%MANUAL%\reports" 2>nul

:MENU
cls
echo.
echo  ===================================================
echo   REO MANUAL FBREF MANAGER
echo  ===================================================
echo.
echo   1. Open manual save folder (incoming)
echo   2. Open FBref links in browser (5 pages)
echo   3. Check files only (no import)
echo   4. Import files (validate + organize)
echo   5. Import + Validate + Upload to VPS
echo   6. Show last import report
echo   7. Open logs
echo   8. Exit
echo.
echo  ---------------------------------------------------
echo   Files go in: .manual\fbref\incoming\
echo   Or as ZIP:   .manual\fbref\fbref_manual_bundle.zip
echo  ---------------------------------------------------
echo.
set /p CHOICE="  Choose [1-8]: "

if "%CHOICE%"=="1" goto OPENFOLDER
if "%CHOICE%"=="2" goto OPENLINKS
if "%CHOICE%"=="3" goto CHECK
if "%CHOICE%"=="4" goto IMPORT
if "%CHOICE%"=="5" goto FULLRUN
if "%CHOICE%"=="6" goto REPORT
if "%CHOICE%"=="7" goto LOGS
if "%CHOICE%"=="8" goto EXIT
echo  [!] Invalid choice.
timeout /t 2 >nul
goto MENU

:OPENFOLDER
explorer "%INCOMING%"
goto MENU

:OPENLINKS
cls
echo.
echo  === OPENING FBREF LINKS ===
echo.
echo  Instructions:
echo    - Wait for each page to fully load (table visible)
echo    - Ctrl+S, save as "HTML Only"
echo    - Name the file exactly as shown below
echo    - Save to: .manual\fbref\incoming\
echo    - Wait 20-30 seconds between pages
echo.
echo  Opening in 5 seconds...
timeout /t 5 >nul
start "" "https://fbref.com/en/comps/Big5/passing/players/Big-5-European-Leagues-Stats"
echo  [1/5] passing - save as: passing.html
timeout /t 25 >nul
start "" "https://fbref.com/en/comps/Big5/gca/players/Big-5-European-Leagues-Stats"
echo  [2/5] gca - save as: gca.html
timeout /t 25 >nul
start "" "https://fbref.com/en/comps/Big5/defense/players/Big-5-European-Leagues-Stats"
echo  [3/5] defense - save as: defense.html
timeout /t 25 >nul
start "" "https://fbref.com/en/comps/Big5/possession/players/Big-5-European-Leagues-Stats"
echo  [4/5] possession - save as: possession.html
timeout /t 25 >nul
start "" "https://fbref.com/en/comps/Big5/passing_types/players/Big-5-European-Leagues-Stats"
echo  [5/5] pass_types - save as: pass_types.html
echo.
echo  All 5 links opened. Save each page, then use option 3 to check.
echo.
pause
goto MENU

:CHECK
cls
echo.
if not exist "%PYEXE%" (
    echo  [FAIL] Python venv not found. Run daily sync once first.
    pause
    goto MENU
)
pushd "%WORKER%"
"%PYEXE%" manual_fbref_checker.py --check
popd
pause
goto MENU

:IMPORT
cls
echo.
if not exist "%PYEXE%" (
    echo  [FAIL] Python venv not found.
    pause
    goto MENU
)
pushd "%WORKER%"
"%PYEXE%" manual_fbref_checker.py --import
popd
pause
goto MENU

:FULLRUN
cls
echo.
echo  === FULL IMPORT + VALIDATE + UPLOAD ===
echo.
if not exist "%PYEXE%" (
    echo  [FAIL] Python venv not found.
    pause
    goto MENU
)
pushd "%WORKER%"

REM Step 1: Import
echo  [Step 1/3] Importing files...
"%PYEXE%" manual_fbref_checker.py --import
if errorlevel 1 (
    echo  [FAIL] Import failed. Aborting.
    popd
    pause
    goto MENU
)

REM Step 2: Check if files are in place for provider
echo.
echo  [Step 2/3] Running provider + validate + upload...
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -Strategy manual_fbref -StatGroups "passing,gca,defense,possession,pass_types" -Upload
set "EC=%ERRORLEVEL%"

REM Step 3: Show result
echo.
if "%EC%"=="0" (
    echo  ===================================================
    echo  [OK] Manual FBref cache imported and uploaded successfully.
    echo  ===================================================
    echo.
    echo  Available groups should now include all 10.
    echo  Advanced metrics should work after bridge reload.
    echo.
    echo  [INFO] VPS cache updated. Bridge may need PM2 restart
    echo         because provider caches metadata at startup.
    echo         Do not restart automatically.
) else (
    echo  [WARN] Upload finished with exit code %EC%.
    echo         Check validate_cache output above.
)
popd
echo.
pause
goto MENU

:REPORT
cls
echo.
if not exist "%PYEXE%" (
    echo  [FAIL] Python venv not found.
    pause
    goto MENU
)
pushd "%WORKER%"
"%PYEXE%" manual_fbref_checker.py --report
popd
pause
goto MENU

:LOGS
explorer "%WORKER%\.logs"
goto MENU

:EXIT
exit /b 0
