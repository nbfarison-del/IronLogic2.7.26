@echo off
REM weeklyUX.bat -- Weekly UX improvement pipeline
REM Pipeline: Project Manager -> UX Engineer -> QA Engineer -> Documentation Engineer

echo [Weekly UX] Starting UX improvement pipeline...
powershell -ExecutionPolicy Bypass -File "%~dp0IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName weeklyUX
if %errorlevel% neq 0 (
    echo [Weekly UX] FAILED -- see report in IronLogicHQ\AI\reports\
    exit /b %errorlevel%
)
echo [Weekly UX] Complete.
