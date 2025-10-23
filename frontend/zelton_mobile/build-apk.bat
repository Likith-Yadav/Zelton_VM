@echo off
echo =============================================================================
echo 🚀 BUILDING APK FOR DIRECT INSTALLATION
echo =============================================================================
echo.

REM Set Java environment
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.16.8-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

REM Set Android SDK environment
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%

REM Change to APK build mode
powershell -Command "(Get-Content 'android\app\build.gradle') -replace 'def BUILD_FORMAT = \"AAB\"', 'def BUILD_FORMAT = \"APK\"' | Set-Content 'android\app\build.gradle'"

echo ✅ Switched to APK build mode
echo.

REM Navigate to android directory and build APK
cd android
echo 🔨 Building APK...
call gradlew assembleRelease

echo.
echo =============================================================================
echo 📱 APK BUILD COMPLETE!
echo =============================================================================
echo 📍 APK Location: app\build\outputs\apk\release\app-release.apk
echo.

REM Switch back to AAB mode for future builds
cd ..
powershell -Command "(Get-Content 'android\app\build.gradle') -replace 'def BUILD_FORMAT = \"APK\"', 'def BUILD_FORMAT = \"AAB\"' | Set-Content 'android\app\build.gradle'"
echo ✅ Switched back to AAB mode for future builds

pause
