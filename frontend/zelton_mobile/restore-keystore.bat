@echo off
echo =============================================================================
echo 🔐 RESTORING RELEASE KEYSTORE
echo =============================================================================
echo.

REM Check if backup exists
if not exist "zelton-release-key.keystore.backup" (
    echo ❌ Backup file not found: zelton-release-key.keystore.backup
    echo    Run backup-keystore.bat first to create a backup.
    echo.
    pause
    exit /b 1
)

REM Create android/app directory if it doesn't exist
if not exist "android\app" (
    echo Creating android\app directory...
    mkdir "android\app" 2>nul
)

REM Restore keystore
copy /Y "zelton-release-key.keystore.backup" "android\app\zelton-release-key.keystore"
echo ✅ Keystore restored to android\app\zelton-release-key.keystore
echo.
echo ⚠️  Make sure the keystore is properly configured in android\app\build.gradle
echo.

pause

