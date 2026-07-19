@echo off
REM IronLogic AI Automation Launcher v1.1
REM Called by Task Scheduler at user logon

set PROJECT_ROOT=C:\Users\nbfar\OneDrive\IronLogic2.7.26
set SCRIPT="%PROJECT_ROOT%\IronLogicHQ\AI\scripts\master-runner.ps1"
set LAUNCHER_LOG="%PROJECT_ROOT%\master-launcher.log"

echo [%date% %time%] Launcher started >> %LAUNCHER_LOG%

cd /d "%PROJECT_ROOT%"

REM Check if already running to avoid overlap
wmic path win32_process where "name='powershell.exe' and commandline like '%%master-runner%%'" get commandline 2>nul | find /c "master-runner" >nul
if %errorlevel% equ 0 (
    echo [%date% %time%] Already running -- skipped >> %LAUNCHER_LOG%
    exit 0
)

REM Run the pipeline (no timeout -- let it finish)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File %SCRIPT% -PipelineName default >> %LAUNCHER_LOG% 2>&1

echo [%date% %time%] Exit code: %errorlevel% >> %LAUNCHER_LOG%
