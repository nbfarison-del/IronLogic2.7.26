@echo off
echo ===================================================
echo   BRIDGE: Routing to D: Drive Project...
echo ===================================================

:: Switch to D: drive and correct folder
d:
cd "D:\FitnessApp Downloads\FitnessApp2.7.26"

:: Check if the deployment script exists
if exist deploy_to_production.bat (
    call deploy_to_production.bat
) else (
    echo ERROR: Could not find deploy_to_production.bat in D:\FitnessApp Downloads\FitnessApp2.7.26
    pause
)
