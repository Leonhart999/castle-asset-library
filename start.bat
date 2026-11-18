@echo off
rem Double-click launcher: starts the Vite dev server and opens the module viewer in your browser.
cd /d "%~dp0"
set "PATH=D:\Programs\nodejs;%PATH%"
echo Starting Castle Asset Library viewer on http://127.0.0.1:5174/viewer/index.html  (close this window to stop)
call npx vite --open /viewer/index.html --port 5174 --strictPort --host 127.0.0.1
if errorlevel 1 pause
