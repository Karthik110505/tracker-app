@echo off
title GATE Tracker Launcher
cd /d "%~dp0tracker-app"
echo Starting local Vite dev server in the background...
start /min "" npm run dev
echo Waiting for server to initialize...
timeout /t 2 /nobreak >nul
echo Opening GATE Revision Tracker...
start http://localhost:5173
exit
