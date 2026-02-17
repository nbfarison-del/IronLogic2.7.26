@echo off
echo ==========================================
echo   🚀 DEPLOYING TO PRODUCTION DOMAIN 🚀
echo ==========================================
echo.
echo 1. Saving all changes...
git add .
git commit -m "🚀 Deployment: Performance Fixes (Phase 9)"

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
