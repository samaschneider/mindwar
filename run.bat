@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing MINDWAR dependencies...
  call npm install
)
call npm run dev -- --open
pause
