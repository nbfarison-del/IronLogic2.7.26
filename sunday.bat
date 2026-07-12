@echo off
REM sunday.bat -- Sunday UX pipeline
REM Pipeline: Project Manager -> UX Engineer -> QA Engineer

echo [Sunday] Starting UX pipeline...
powershell -ExecutionPolicy Bypass -File "%~dp0IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName sunday
if %errorlevel% neq 0 (
    echo [Sunday] FAILED -- see report in IronLogicHQ\AI\reports\
    exit /b %errorlevel%
)
echo [Sunday] Complete.
