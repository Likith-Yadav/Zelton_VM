@echo off
echo =============================================================================
echo 🔐 BACKING UP RELEASE KEYSTORE
echo =============================================================================
echo.

REM Check if keystore exists in android/app
if exist "android\app\zelton-release-key.keystore" (
    echo ✅ Found keystore in android\app\
    copy /Y "android\app\zelton-release-key.keystore" "zelton-release-key.keystore.backup"
    echo ✅ Keystore backed up to project root as: zelton-release-key.keystore.backup
    echo.
    echo ⚠️  IMPORTANT: Keep this backup file safe! If you lose it, you won't be
    echo    able to update your app on Google Play Store.
    echo.
) else (
    echo ❌ Keystore not found in android\app\
    echo    Make sure you've generated the keystore first.
    echo.
)

pause

