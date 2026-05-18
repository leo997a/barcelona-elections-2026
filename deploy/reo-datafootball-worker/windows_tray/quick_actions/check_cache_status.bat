@echo off
title REO Smart Agent - Cache Status
echo.
echo ==========================================
echo   LOCAL CACHE STATUS
echo ==========================================
echo.
pushd "%~dp0..\.."
set "PYEXE=.venv\Scripts\python.exe"
if not exist "%PYEXE%" (
    echo [FAIL] Python venv not found. Run run_local_sync_vps.ps1 once first.
    popd
    pause
    exit /b 1
)
"%PYEXE%" .\validate_cache.py .\.cache\fbref .
set "EXITCODE=%ERRORLEVEL%"
popd
echo.
if "%EXITCODE%"=="0" (
    echo [OK] Cache validated.
) else (
    echo [FAIL] Cache validation reported issues (exit %EXITCODE%).
)
echo.
pause
