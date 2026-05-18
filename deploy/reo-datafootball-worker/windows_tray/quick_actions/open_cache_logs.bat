@echo off
title REO Smart Agent - Cache Logs
echo Opening .logs and .cache folders...
echo.
explorer "%~dp0..\..\.logs"
explorer "%~dp0..\..\.cache"
exit /b 0
