@echo off
title Tread GST - Build Android App
echo ===================================================
echo     Tread GST Invoicing - Android App Builder
echo ===================================================
echo.
echo Step 1: Building production web assets (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo Step 2: Synchronizing assets with Capacitor Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo [SUCCESS] Android assets updated and synced!
echo.
echo You can now open the project in Android Studio to run
echo or build your APK / AAB bundle:
echo.
echo   - Direct launcher: double-click open-android-studio.bat
echo   - In Android Studio: Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
echo ===================================================
echo.
pause
