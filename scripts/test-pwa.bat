@echo off
REM PWA Testing Quick Start Script for Windows
REM Tests all PWA features locally

echo.
echo 🚀 PantryPal PWA Testing Suite
echo ==================================

REM Step 1: Build
echo.
echo [Step 1] Building PWA...
call npm run build
if not exist "dist\manifest.webmanifest" (
  echo ❌ Manifest not found
  exit /b 1
)
echo ✅ Manifest generated

if not exist "dist\sw.js" (
  echo ❌ Service Worker not found
  exit /b 1
)
echo ✅ Service Worker generated

REM Step 2: Verify manifest
echo.
echo [Step 2] Validating Manifest...
findstr /M "name.*PantryPal" dist\manifest.webmanifest >nul
if %errorlevel% equ 0 (
  echo ✅ Manifest contains app name
) else (
  echo ❌ Manifest missing app name
)

findstr /M "standalone" dist\manifest.webmanifest >nul
if %errorlevel% equ 0 (
  echo ✅ Display mode: standalone
) else (
  echo ❌ Display mode incorrect
)

REM Step 3: Check icons
echo.
echo [Step 3] Checking PWA Icons...
if exist "dist\pwa-192x192.png" (
  for %%F in (dist\pwa-192x192.png) do (
    echo ✅ Icon 192x192 found (%%~zF bytes^)
  )
) else (
  echo ⚠️  Icon 192x192 not found
)

if exist "dist\pwa-512x512.png" (
  for %%F in (dist\pwa-512x512.png) do (
    echo ✅ Icon 512x512 found (%%~zF bytes^)
  )
) else (
  echo ⚠️  Icon 512x512 not found
)

REM Step 4: Check build files
echo.
echo [Step 4] Checking Build Assets...
setlocal enabledelayedexpansion
for /R dist\assets %%F in (*.js) do (
  for %%A in (%%F) do set /A JSSIZE=%%~zF / 1024
  echo ✅ JavaScript bundle: !JSSIZE! KB
  goto :skip_js
)
:skip_js

for /R dist\assets %%F in (*.css) do (
  for %%A in (%%F) do set /A CSSSIZE=%%~zF / 1024
  echo ✅ CSS bundle: !CSSSIZE! KB
  goto :skip_css
)
:skip_css

REM Step 5: Display manifest preview
echo.
echo [Step 5] Manifest Preview:
echo ---
type dist\manifest.webmanifest
echo ---

REM Step 6: Final summary
echo.
echo ==================================
echo ✅ PWA build complete!
echo.
echo Next steps:
echo 1. Start dev server:    npm run dev
echo 2. Open browser:        http://localhost:5000
echo 3. Open DevTools        (F12)
echo 4. Go to "Application" tab
echo 5. Check "Manifest" and "Service Workers"
echo 6. Test offline:        Network tab ^> Offline checkbox
echo.
echo For detailed guide: docs/PWA_GUIDE.md
echo.
