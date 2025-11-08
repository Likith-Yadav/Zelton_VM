@echo off
echo =============================================================================
echo 🚀 BUILDING AAB FOR GOOGLE PLAY STORE
echo =============================================================================
echo.

REM Set Java environment
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.16.8-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

REM Set Android SDK environment
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%

REM Restore keystore from backup if it doesn't exist
if not exist "android\app\zelton-release-key.keystore" (
    if exist "zelton-release-key.keystore.backup" (
        echo 🔐 Restoring keystore from backup...
        if not exist "android\app" mkdir "android\app"
        copy /Y "zelton-release-key.keystore.backup" "android\app\zelton-release-key.keystore" >nul 2>&1
        echo ✅ Keystore restored
        echo.
    ) else (
        echo ⚠️  WARNING: No keystore found! Generating new one...
        echo    This will break app updates on Google Play if you've already published.
        echo.
        REM Generate new keystore if backup doesn't exist
        if not exist "android\app" mkdir "android\app"
        cd android\app
        keytool -genkey -v -keystore zelton-release-key.keystore -alias zelton-key-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass zelton123 -keypass zelton123 -dname "CN=Zelton Livings, OU=Development, O=Zelton Livings, L=City, S=State, C=IN"
        cd ..\..
        REM Backup the newly generated keystore
        copy /Y "android\app\zelton-release-key.keystore" "zelton-release-key.keystore.backup" >nul 2>&1
        echo ✅ New keystore generated and backed up
        echo.
    )
)

REM Change to AAB build mode
powershell -Command "(Get-Content 'android\app\build.gradle') -replace 'def BUILD_FORMAT = \"APK\"', 'def BUILD_FORMAT = \"AAB\"' | Set-Content 'android\app\build.gradle'"

echo ✅ Switched to AAB build mode
echo.

REM Navigate to android directory and build AAB
cd android
echo 🔨 Building AAB...
call gradlew.bat bundleRelease
set BUILD_RESULT=%ERRORLEVEL%
cd ..

if %BUILD_RESULT% EQU 0 (
    echo.
    echo =============================================================================
    echo ✅ AAB BUILD COMPLETE!
    echo =============================================================================
    echo 📍 AAB Location: android\app\build\outputs\bundle\release\app-release.aab
    echo.
) else (
    echo.
    echo =============================================================================
    echo ❌ BUILD FAILED
    echo =============================================================================
    echo Please check the error messages above.
    echo.
)

pause
