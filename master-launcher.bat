@echo off
REM ============================================
REM IronLogic AI Automation - Master Launcher
REM Single entry point for Windows Task Scheduler
REM Calls master-runner.ps1 with the default pipeline
REM ============================================
cd /d "%~dp0"
echo [%DATE% %TIME%] Master Launcher started
powershell -ExecutionPolicy Bypass -File "IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName default
set EXITCODE=%ERRORLEVEL%
if %EXITCODE% neq 0 (
    echo [%DATE% %TIME%] Master Launcher failed (exit code %EXITCODE%)
) else (
    echo [%DATE% %TIME%] Master Launcher completed successfully
)
exit /b %EXITCODE%
