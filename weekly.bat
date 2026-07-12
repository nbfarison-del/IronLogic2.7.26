@echo off
REM weekly.bat -- Weekly IronLogic Engineer fix pipeline
REM Pipeline: Project Manager -> IronLogic Engineer

echo [Weekly] Starting bug fix pipeline...
powershell -ExecutionPolicy Bypass -File "%~dp0IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName weekly
if %errorlevel% neq 0 (
    echo [Weekly] FAILED -- see report in IronLogicHQ\AI\reports\
    exit /b %errorlevel%
)
echo [Weekly] Complete.
