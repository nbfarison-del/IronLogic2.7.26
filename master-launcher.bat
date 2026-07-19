@echo off
REM IronLogic AI Automation Launcher v1.0
REM Called by Task Scheduler at user logon

echo [%date% %time%] Master Launcher started >> "%USERPROFILE%\IronLogic-launcher.log"

set PROJECT_ROOT=C:\Users\nbfar\OneDrive\IronLogic2.7.26
set SCRIPT="%PROJECT_ROOT%\IronLogicHQ\AI\scripts\master-runner.ps1"
set LAUNCHER_LOG="%PROJECT_ROOT%\master-launcher.log"

echo [%date% %time%] Starting pipeline >> %LAUNCHER_LOG%

cd /d "%PROJECT_ROOT%"

REM Check if already running to avoid overlap
wmic path win32_process where "name='powershell.exe' and commandline like '%%master-runner%%'" get commandline 2>nul | find /c "master-runner" >nul
if %errorlevel% equ 0 (
    echo [%date% %time%] Pipeline already running -- skipping >> %LAUNCHER_LOG%
    exit 0
)

REM Run the pipeline
powershell.exe -NoProfile -ExecutionPolicy Bypass -File %SCRIPT% -PipelineName default -ShowVerbose >> %LAUNCHER_LOG% 2>&1

echo [%date% %time%] Pipeline exit code: %errorlevel% >> %LAUNCHER_LOG%
