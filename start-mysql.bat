@echo off
echo ========================================================
echo   Starting MySQL Service for Dr. Ayus Hospital
echo ========================================================
echo.
echo Attempting to start MySQL service...
net start MySQL84 2>nul || net start MySQL80 2>nul || net start MySQL 2>nul || net start mysql 2>nul || (
  echo.
  echo  Could not auto-start MySQL. Please start it manually:
  echo  - Open Services (services.msc) and start the MySQL service, OR
  echo  - Open XAMPP Control Panel and click Start next to MySQL.
  echo.
)
echo.
echo MySQL should now be running. You can close this window.
pause
