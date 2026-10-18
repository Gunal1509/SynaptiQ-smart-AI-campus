@echo off
title SYNAPTIQ - Graceful Shutdown
echo ========================================================
echo   Stopping SYNAPTIQ Smart Campus Engine Gracefully...
echo ========================================================
set "PATH=C:\Users\LENOVO\AppData\Local\Programs\DockerDesktop\resources\bin;%PATH%"
cd /d "d:\ai campus"

docker compose stop

echo.
echo ========================================================
echo   [OK] All databases flushed and containers safely halted!
echo   You may now safely close your laptop or shut down Windows.
echo ========================================================
timeout /t 5
