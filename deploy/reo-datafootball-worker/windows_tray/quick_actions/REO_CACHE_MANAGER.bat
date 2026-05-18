@echo off
title REO Cache Manager
color 0B

:MENU
cls
echo.
echo  ===================================================
echo   REO CACHE MANAGER - Unified Control Panel
echo  ===================================================
echo.
echo   1. Check cache status
echo   2. Run daily safe sync (soccerdata + upload)
echo   3. Import manual FBref bundle (ZIP or files)
echo   4. Upload existing cache to VPS (no fetch)
echo   5. Show last run report
echo   6. Open logs folder
echo   7. Install daily startup sync
echo   8. Open Manual FBref Manager (advanced)
echo   9. Exit
echo.
echo  ---------------------------------------------------
echo   Estimated times:
echo     Status check: ~10 seconds
echo     Daily sync:   5-15 minutes
echo     Manual import: 1-5 minutes
echo     Upload only:  ~30 seconds
echo  ---------------------------------------------------
echo.
set /p CHOICE="  Choose [1-9]: "

if "%CHOICE%"=="1" goto STATUS
if "%CHOICE%"=="2" goto DAILY
if "%CHOICE%"=="3" goto MANUAL
if "%CHOICE%"=="4" goto UPLOAD
if "%CHOICE%"=="5" goto REPORT
if "%CHOICE%"=="6" goto LOGS
if "%CHOICE%"=="7" goto INSTALL
if "%CHOICE%"=="8" goto MANUALADV
if "%CHOICE%"=="9" goto EXIT
echo  [!] Invalid choice.
timeout /t 2 >nul
goto MENU

:STATUS
cls
echo.
echo  === CACHE STATUS ===
echo.
pushd "%~dp0..\.."
set "PYEXE=.venv\Scripts\python.exe"
if not exist "%PYEXE%" (
    echo  [FAIL] Python venv not found. Run daily sync once first.
    popd
    pause
    goto MENU
)
"%PYEXE%" validate_cache.py .cache\fbref .
popd
echo.
pause
goto MENU

:DAILY
cls
echo.
echo  === DAILY SAFE SYNC ===
echo  Strategy: soccerdata_first
echo  Groups: missing (skips already fresh)
echo.
pushd "%~dp0..\.."
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -Strategy soccerdata_first -StatGroups missing -Upload
set "EC=%ERRORLEVEL%"
REM Write status file
powershell -ExecutionPolicy Bypass -Command "& { $wd = Get-Location; & '$wd\.venv\Scripts\python.exe' '$wd\cache_status_writer.py' daily_safe_sync %EC% 2>$null }"
popd
echo.
if "%EC%"=="0" (echo  [OK] Daily sync complete.) else (echo  [!] Sync finished with issues.)
echo.
pause
goto MENU

:MANUAL
cls
echo.
echo  === IMPORT MANUAL FBREF BUNDLE ===
echo.
pushd "%~dp0..\.."
set "PYEXE=.venv\Scripts\python.exe"
if not exist "%PYEXE%" (
    echo  [FAIL] Python venv not found. Run daily sync once first.
    popd
    pause
    goto MENU
)
REM Check for ZIP first, then loose files
if exist ".manual\fbref\fbref_manual_bundle.zip" (
    echo  [INFO] Found: fbref_manual_bundle.zip
    echo  [INFO] Extracting to staging...
    "%PYEXE%" -c "import zipfile,sys; z=zipfile.ZipFile(r'.manual\fbref\fbref_manual_bundle.zip'); z.extractall(r'.manual\fbref\_staging'); print('[OK] Extracted', len(z.namelist()), 'files')"
    if errorlevel 1 (
        echo  [FAIL] Could not extract ZIP.
        popd
        pause
        goto MENU
    )
    REM Move extracted files to .manual/fbref root (overwrite)
    for %%f in (.manual\fbref\_staging\*.html .manual\fbref\_staging\*.csv) do (
        copy /y "%%f" ".manual\fbref\" >nul 2>&1
    )
    REM Also check one level deeper (ZIP may have a subfolder)
    for /d %%d in (.manual\fbref\_staging\*) do (
        for %%f in ("%%d\*.html" "%%d\*.csv") do (
            copy /y "%%f" ".manual\fbref\" >nul 2>&1
        )
    )
    rmdir /s /q ".manual\fbref\_staging" 2>nul
    echo  [OK] Files extracted to .manual\fbref\
    echo.
)
REM Check if any HTML/CSV exist
dir /b ".manual\fbref\*.html" ".manual\fbref\*.csv" 2>nul | findstr /r "." >nul
if errorlevel 1 (
    echo  [FAIL] No HTML or CSV files found in .manual\fbref\
    echo.
    echo  Place files there or add fbref_manual_bundle.zip, then retry.
    popd
    pause
    goto MENU
)
echo  [INFO] Files found:
dir /b ".manual\fbref\*.html" ".manual\fbref\*.csv" 2>nul
echo.
echo  [INFO] Starting manual import...
echo.
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -Strategy manual_fbref -StatGroups "passing,gca,defense,possession,pass_types" -Upload
set "EC=%ERRORLEVEL%"
powershell -ExecutionPolicy Bypass -Command "& { $wd = Get-Location; & '$wd\.venv\Scripts\python.exe' '$wd\cache_status_writer.py' manual_bundle_import %EC% 2>$null }"
popd
echo.
if "%EC%"=="0" (echo  [OK] Manual import complete.) else (echo  [!] Import finished with issues.)
echo.
pause
goto MENU

:UPLOAD
cls
echo.
echo  === UPLOAD EXISTING CACHE TO VPS ===
echo  (No fetch, just validate + upload)
echo.
pushd "%~dp0..\.."
powershell -ExecutionPolicy Bypass -File ".\run_local_sync_vps.ps1" -SkipFetch -Upload
set "EC=%ERRORLEVEL%"
powershell -ExecutionPolicy Bypass -Command "& { $wd = Get-Location; & '$wd\.venv\Scripts\python.exe' '$wd\cache_status_writer.py' upload_only %EC% 2>$null }"
popd
echo.
if "%EC%"=="0" (echo  [OK] Upload complete.) else (echo  [!] Upload failed or validation blocked it.)
echo.
pause
goto MENU

:REPORT
cls
echo.
echo  === LAST RUN REPORT ===
echo.
pushd "%~dp0..\.."
set "PYEXE=.venv\Scripts\python.exe"
if not exist "%PYEXE%" (
    echo  [FAIL] Python venv not found.
    popd
    pause
    goto MENU
)
"%PYEXE%" cache_status_writer.py --show-report
popd
echo.
pause
goto MENU

:LOGS
echo.
explorer "%~dp0..\..\.logs"
goto MENU

:INSTALL
cls
echo.
echo  === INSTALL DAILY STARTUP SYNC ===
echo.
pushd "%~dp0.."
powershell -ExecutionPolicy Bypass -File ".\install_startup_task.ps1"
popd
echo.
pause
goto MENU

:MANUALADV
start "" "%~dp0REO_MANUAL_FBREF_MANAGER.bat"
goto MENU

:EXIT
exit /b 0
