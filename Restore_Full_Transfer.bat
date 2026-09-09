@echo off
setlocal
title Restore AHWR-50-Twin Full Transfer
cd /d "%~dp0"

echo ========================================================
echo  Restore AHWR-50-Twin Full Transfer
echo  Current code, Docker images, settings and history
echo ========================================================
echo.

call "%~dp0Install_AHWR50_Twin.bat"
exit /b %ERRORLEVEL%
