@echo off
setlocal
echo ==========================================
echo   🛠️ IRONLOGIC: VERCEL AI SETUP 🛠️
echo ==========================================
echo.
echo This script will add your Gemini API Key to Vercel.
echo.

set KEY=AIzaSyD0GJ4eGgzm8qUH4-xmWA0Wci7Opex5cOU

echo [1/2] Adding VITE_GEMINI_API_KEY to Vercel...
call vercel env add VITE_GEMINI_API_KEY %KEY% production

echo.
echo [2/2] Triggering a new production deployment...
call vercel --prod

echo.
echo ==========================================
echo   ✅ DONE! Check your live site in 2 mins.
echo ==========================================
pause
