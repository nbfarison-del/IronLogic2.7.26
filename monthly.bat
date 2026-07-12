@echo off
REM monthly.bat -- Monthly research pipeline
REM Pipeline: Project Manager -> Research Engineer -> IronLogic Engineer

echo [Monthly] Starting research pipeline...
powershell -ExecutionPolicy Bypass -File "%~dp0IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName monthly
if %errorlevel% neq 0 (
    echo [Monthly] FAILED -- see report in IronLogicHQ\AI\reports\
    exit /b %errorlevel%
)
echo [Monthly] Complete.
