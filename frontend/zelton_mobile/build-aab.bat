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

REM Change to AAB build mode
powershell -Command "(Get-Content 'android\app\build.gradle') -replace 'def BUILD_FORMAT = \"APK\"', 'def BUILD_FORMAT = \"AAB\"' | Set-Content 'android\app\build.gradle'"

echo ✅ Switched to AAB build mode
echo.

REM Navigate to android directory and build AAB
cd android
echo 🔨 Building AAB...
call gradlew bundleRelease

echo.
echo =============================================================================
echo 📱 AAB BUILD COMPLETE!
echo =============================================================================
echo 📍 AAB Location: app\build\outputs\bundle\release\app-release.aab
echo.

pause
