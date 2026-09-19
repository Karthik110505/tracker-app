@echo off
title GATE Tracker Launcher
cd /d "%~dp0tracker-app"

netstat -ano | findstr :5173 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    start /min "" cmd /c "npm run dev"
    ping 127.0.0.1 -n 3 >nul
)

set BROWSER=
if exist "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe" set BROWSER="%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"
if not defined BROWSER if exist "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" set BROWSER="C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
if not defined BROWSER if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set BROWSER="C:\Program Files\Google\Chrome\Application\chrome.exe"

if defined BROWSER (
    start "" %BROWSER% --app=http://localhost:5173
) else (
    start http://localhost:5173
)
exit
