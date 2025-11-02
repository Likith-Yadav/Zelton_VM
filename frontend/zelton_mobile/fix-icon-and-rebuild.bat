@echo off
echo =============================================================================
echo 🎨 FIXING ICON AND REBUILDING
echo =============================================================================
echo.

REM Set Java environment
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.16.8-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

REM Set Android SDK environment
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%

echo [1/5] Clearing Android build cache...
cd android
if exist app\build rmdir /s /q app\build
if exist app\.cxx rmdir /s /q app\.cxx
if exist build rmdir /s /q build
if exist .gradle rmdir /s /q .gradle
cd ..
echo ✅ Build cache cleared
echo.

echo [2/5] Clearing Android icon resources...
if exist android\app\src\main\res\mipmap-* rmdir /s /q android\app\src\main\res\mipmap-*
echo ✅ Icon resources cleared
echo.

echo [3/5] Regenerating Android project with new icon...
call npx expo prebuild --platform android --clean
echo ✅ Android project regenerated
echo.

echo [4/5] Verifying keystore exists...
cd android\app
if not exist zelton-release-key.keystore (
    echo Creating keystore...
    keytool -genkey -v -keystore zelton-release-key.keystore -alias zelton-key-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass zelton123 -keypass zelton123 -dname "CN=Zelton Livings, OU=Development, O=Zelton Livings, L=City, S=State, C=IN"
)
cd ..\..
echo ✅ Keystore verified
echo.

echo [5/5] Building fresh APK with new icon...
cd android
call gradlew assembleRelease
cd ..
echo.

if exist android\app\build\outputs\apk\release\app-release.apk (
    echo =============================================================================
    echo ✅ BUILD SUCCESSFUL!
    echo =============================================================================
    echo 📍 APK Location: android\app\build\outputs\apk\release\app-release.apk
    echo 📱 The new icon should now be in the APK!
    echo.
) else (
    echo =============================================================================
    echo ❌ BUILD FAILED
    echo =============================================================================
    echo Please check the error messages above.
    echo.
)

pause
