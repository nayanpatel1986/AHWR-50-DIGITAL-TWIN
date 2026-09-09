@echo off
setlocal
title Install / Update AHWR-50-Twin Offline
cd /d "%~dp0"

echo ========================================================
echo  AHWR-50-Twin One-Click Offline Install / Update
echo.
echo  This restores the transfer package exactly:
echo  - Frontend and backend Docker images
echo  - Telegraf and InfluxDB image/config
echo  - .env runtime settings
echo  - ETP 2.0 and central sync settings
echo  - Users, passwords, wells, dashboard and PLC/S7 settings
echo  - InfluxDB historical data included in this transfer
echo ========================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo [FAILED] Docker is not installed or not available in PATH.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [FAILED] Docker Desktop is not running. Start Docker Desktop and run this file again.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0import_offline.ps1"
if errorlevel 1 (
    echo.
    echo UPDATE FAILED.
    pause
    exit /b 1
)

echo.
echo UPDATE COMPLETED.
echo Open on this PC: http://localhost:8080
pause
