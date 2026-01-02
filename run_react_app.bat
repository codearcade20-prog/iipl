@echo off
echo Starting React Application...
cd react-app
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo Starting Development Server...
call npm run dev
pause
