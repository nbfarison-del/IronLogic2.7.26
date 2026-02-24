@echo off
cd /d "%~dp0"
echo Starting IronLogic from D: Drive...
echo App starting! Visit http://localhost:5173 on this PC.
npm.cmd run dev
pause
