@echo off
echo =============================================================================
echo 🧹 CLEARING ALL CACHES AND REBUILDING WITH NEW LOGO
echo =============================================================================
echo.

REM Set Java environment
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.16.8-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

REM Set Android SDK environment
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%

echo [1/7] Clearing Gradle cache...
cd android
if exist .gradle rmdir /s /q .gradle
if exist build rmdir /s /q build
if exist app\build rmdir /s /q app\build
if exist app\.cxx rmdir /s /q app\.cxx
echo ✅ Gradle cache cleared
echo.

echo [2/7] Clearing Metro bundler cache...
cd ..
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist .expo rmdir /s /q .expo
echo ✅ Metro cache cleared
echo.

echo [3/7] Clearing Android build directories...
cd android
if exist app\build rmdir /s /q app\build
if exist app\.cxx rmdir /s /q app\.cxx
if exist .gradle rmdir /s /q .gradle
echo ✅ Android build cache cleared
echo.

echo [4/7] Rebuilding native Android project...
cd ..
call npx expo prebuild --platform android --clean
echo ✅ Android project regenerated
echo.

echo [5/7] Recreating release keystore...
cd android\app
if exist zelton-release-key.keystore del zelton-release-key.keystore
keytool -genkey -v -keystore zelton-release-key.keystore -alias zelton-key-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass zelton123 -keypass zelton123 -dname "CN=Zelton Livings, OU=Development, O=Zelton Livings, L=City, S=State, C=IN"
echo ✅ Keystore recreated
echo.

echo [6/7] Cleaning Gradle build...
cd ..\..
cd android
call gradlew clean
echo ✅ Gradle clean complete
echo.

echo [7/7] Building fresh AAB with new logo...
call gradlew bundleRelease
echo.

if %ERRORLEVEL% EQU 0 (
    echo =============================================================================
    echo ✅ BUILD SUCCESSFUL!
    echo =============================================================================
    echo 📍 AAB Location: app\build\outputs\bundle\release\app-release.aab
    echo 📱 The new logo should now be included in the build!
    echo.
) else (
    echo =============================================================================
    echo ❌ BUILD FAILED
    echo =============================================================================
    echo Please check the error messages above.
    echo.
)

cd ..
pause
