@echo off
echo =============================================================================
echo 🧹 CLEARING APP CACHES FOR ICON UPDATE
echo =============================================================================
echo.

echo 📦 Clearing Expo cache...
if exist .expo (
    rmdir /s /q .expo
    echo ✅ Cleared .expo folder
)

echo.
echo 📦 Clearing Metro bundler cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo ✅ Cleared Metro cache
)

echo.
echo 📦 Clearing Android build cache...
if exist android\app\build (
    rmdir /s /q android\app\build
    echo ✅ Cleared Android app build folder
)

if exist android\.gradle (
    rmdir /s /q android\.gradle
    echo ✅ Cleared Gradle cache
)

if exist android\build (
    rmdir /s /q android\build
    echo ✅ Cleared Android root build folder
)

echo.
echo 📦 Clearing watchman cache (if installed)...
watchman watch-del-all 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Cleared watchman cache
) else (
    echo ℹ️  Watchman not installed (skipping)
)

echo.
echo 📦 Clearing npm cache...
call npm cache clean --force
echo ✅ Cleared npm cache

echo.
echo =============================================================================
echo ✅ CACHE CLEARING COMPLETE!
echo =============================================================================
echo.
echo ⚠️  IMPORTANT: After clearing cache, you need to:
echo    1. Uninstall the app from your device/emulator
echo    2. Run: npx expo prebuild --clean
echo    3. Rebuild the app using build-apk.bat or build-aab.bat
echo.
pause

