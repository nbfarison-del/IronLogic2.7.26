@echo off
REM weeklyIronLogic.bat -- Weekly IronLogic Engineer fix pipeline
REM Pipeline: Project Manager -> IronLogic Engineer -> QA Engineer -> Documentation Engineer

echo [Weekly IronLogic] Starting bug fix pipeline...
powershell -ExecutionPolicy Bypass -File "%~dp0IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName weeklyIronLogic
if %errorlevel% neq 0 (
    echo [Weekly IronLogic] FAILED -- see report in IronLogicHQ\AI\reports\
    exit /b %errorlevel%
)
echo [Weekly IronLogic] Complete.
