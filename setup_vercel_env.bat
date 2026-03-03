@echo off
setlocal
echo ============================================================
echo   🔧 IRONLOGIC: VERCEL ENVIRONMENT SETUP SCRIPT 🔧
echo ============================================================
echo.
echo This will push ALL environment variables to Vercel and
echo trigger a new production deployment.
echo.
echo ⚠️  Make sure you are logged into Vercel CLI first!
echo     If prompted, press ENTER to open your browser and login.
echo.
pause

:: Change to the project directory with the git repo + vercel config
cd /d "D:\FitnessApp Downloads\FitnessApp2.7.26"

echo.
echo ============================================================
echo   STEP 1: Setting Firebase + Gemini env vars (production)
echo ============================================================
echo.

:: Remove old env vars first to avoid duplicates (ignore errors if they don't exist)
echo Removing old env vars (if any)...
npx vercel env rm VITE_FIREBASE_API_KEY production -y 2>nul
npx vercel env rm VITE_FIREBASE_AUTH_DOMAIN production -y 2>nul
npx vercel env rm VITE_FIREBASE_PROJECT_ID production -y 2>nul
npx vercel env rm VITE_FIREBASE_STORAGE_BUCKET production -y 2>nul
npx vercel env rm VITE_FIREBASE_MESSAGING_SENDER_ID production -y 2>nul
npx vercel env rm VITE_FIREBASE_APP_ID production -y 2>nul
npx vercel env rm VITE_FIREBASE_MEASUREMENT_ID production -y 2>nul
npx vercel env rm VITE_GEMINI_API_KEY production -y 2>nul

echo.
echo Adding env vars...

echo AIzaSyArTWsbdaRkULQTwYOhGSppZoitqm-e9Zs | npx vercel env add VITE_FIREBASE_API_KEY production
echo ironlogic-c5e27.firebaseapp.com          | npx vercel env add VITE_FIREBASE_AUTH_DOMAIN production
echo ironlogic-c5e27                          | npx vercel env add VITE_FIREBASE_PROJECT_ID production
echo ironlogic-c5e27.firebasestorage.app      | npx vercel env add VITE_FIREBASE_STORAGE_BUCKET production
echo 623034060164                             | npx vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production
echo 1:623034060164:web:4cd8530a1176a601afa1d1| npx vercel env add VITE_FIREBASE_APP_ID production
echo G-28F6H5KY12                             | npx vercel env add VITE_FIREBASE_MEASUREMENT_ID production
echo AIzaSyD0GJ4eGgzm8qUH4-xmWA0Wci7Opex5cOU | npx vercel env add VITE_GEMINI_API_KEY production

echo.
echo ============================================================
echo   STEP 2: Setting env vars for PREVIEW environment too
echo ============================================================
echo.

npx vercel env rm VITE_FIREBASE_API_KEY preview -y 2>nul
npx vercel env rm VITE_FIREBASE_AUTH_DOMAIN preview -y 2>nul
npx vercel env rm VITE_FIREBASE_PROJECT_ID preview -y 2>nul
npx vercel env rm VITE_FIREBASE_STORAGE_BUCKET preview -y 2>nul
npx vercel env rm VITE_FIREBASE_MESSAGING_SENDER_ID preview -y 2>nul
npx vercel env rm VITE_FIREBASE_APP_ID preview -y 2>nul
npx vercel env rm VITE_FIREBASE_MEASUREMENT_ID preview -y 2>nul
npx vercel env rm VITE_GEMINI_API_KEY preview -y 2>nul

echo AIzaSyArTWsbdaRkULQTwYOhGSppZoitqm-e9Zs | npx vercel env add VITE_FIREBASE_API_KEY preview
echo ironlogic-c5e27.firebaseapp.com          | npx vercel env add VITE_FIREBASE_AUTH_DOMAIN preview
echo ironlogic-c5e27                          | npx vercel env add VITE_FIREBASE_PROJECT_ID preview
echo ironlogic-c5e27.firebasestorage.app      | npx vercel env add VITE_FIREBASE_STORAGE_BUCKET preview
echo 623034060164                             | npx vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID preview
echo 1:623034060164:web:4cd8530a1176a601afa1d1| npx vercel env add VITE_FIREBASE_APP_ID preview
echo G-28F6H5KY12                             | npx vercel env add VITE_FIREBASE_MEASUREMENT_ID preview
echo AIzaSyD0GJ4eGgzm8qUH4-xmWA0Wci7Opex5cOU | npx vercel env add VITE_GEMINI_API_KEY preview

echo.
echo ============================================================
echo   STEP 3: Triggering a fresh PRODUCTION build
echo ============================================================
echo.
npx vercel --prod

echo.
echo ============================================================
echo   ✅ DONE! Your site should be live in ~2 minutes.
echo   🌐 Check: https://www.ironlogichq.com
echo ============================================================
pause
