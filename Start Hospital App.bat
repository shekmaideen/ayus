@echo off
title Dr. Ayus Homoeopathy Hospital - Starting App...
cd /d "%~dp0"
echo ========================================================
echo   Dr. Ayus Homoeopathy Hospital Management System
echo ========================================================
echo.

:: 1. Ensure MySQL service is running
echo [1/3] Checking MySQL Service...
net start MySQL84 >nul 2>&1 || net start MySQL80 >nul 2>&1 || net start MySQL >nul 2>&1 || net start mysql >nul 2>&1
echo       MySQL service checked.

:: 2. Launch browser to app after 4 seconds
echo [2/3] Launching Web Browser...
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:8080"

:: 3. Start Application
echo [3/3] Starting Hospital Server...
echo.
echo ========================================================
echo   System running at http://localhost:8080
echo   KEEP THIS WINDOW OPEN while using the hospital system.
echo   To stop the server, simply close this window.
echo ========================================================
echo.

call npm run dev
