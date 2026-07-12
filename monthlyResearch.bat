@echo off
REM monthlyResearch.bat -- Monthly deep research pipeline
REM Pipeline: Project Manager -> Research Engineer -> IronLogic Engineer (review) -> Documentation Engineer

echo [Monthly Research] Starting research pipeline...
powershell -ExecutionPolicy Bypass -File "%~dp0IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName monthlyResearch
if %errorlevel% neq 0 (
    echo [Monthly Research] FAILED -- see report in IronLogicHQ\AI\reports\
    exit /b %errorlevel%
)
echo [Monthly Research] Complete.
