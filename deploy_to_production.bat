@echo off
echo ==========================================
echo   🚀 DEPLOYING TO PRODUCTION DOMAIN 🚀
echo ==========================================
echo.
echo 1. Saving all changes...
git add .
git commit -m "feat: AI Chat upgrade (markdown, history, retry) + DOTS moved to Progress + chat layout fixes"


echo.
echo 2. Pushing directly to Production (Main Branch)...
git push origin HEAD:main

echo.
echo ==========================================
echo   ✅ SUCCESS!
echo   Vercel is now building your Production site.
echo   Please wait ~2 minutes, then visit your
echo   MAIN DOMAIN (ironlogichq.com).
echo ==========================================
pause
