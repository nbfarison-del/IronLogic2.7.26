@echo off
REM nightly.bat -- Nightly health check pipeline
REM Runs the Application Engineer for a quick codebase health check.

echo [Nightly] Starting nightly health check pipeline...
powershell -ExecutionPolicy Bypass -File "%~dp0IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName nightly
if %errorlevel% neq 0 (
    echo [Nightly] FAILED -- see report in IronLogicHQ\AI\reports\
    exit /b %errorlevel%
)
echo [Nightly] Complete.
