@echo off
title SYNAPTIQ - Smart Campus Startup
echo ========================================================
echo   Starting SYNAPTIQ Smart Campus Engine...
echo ========================================================
set "PATH=C:\Users\LENOVO\AppData\Local\Programs\DockerDesktop\resources\bin;%PATH%"
cd /d "d:\ai campus"

docker compose start

echo.
echo ========================================================
echo   [OK] All SYNAPTIQ services started successfully!
echo   Local Web Access:   http://localhost
echo   Wi-Fi LAN Access:   http://192.168.1.40
echo ========================================================
timeout /t 5
