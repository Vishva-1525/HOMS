@echo off
setlocal
cd /d "%~dp0"

echo.
echo  HOMS - Hostel Outpass Management
echo  Starting local server...
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8080"
  echo  Open in browser: http://localhost:8080
  echo  Press Ctrl+C to stop.
  echo.
  python -m http.server 8080
  goto :done
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8080"
  echo  Open in browser: http://localhost:8080
  echo  Press Ctrl+C to stop.
  echo.
  py -3 -m http.server 8080
  goto :done
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-homs.ps1"
if %errorlevel% neq 0 (
  echo.
  echo  Could not start server. Try installing Python 3 from python.org
  echo  or run PowerShell as Administrator.
  pause
)

:done
endlocal
