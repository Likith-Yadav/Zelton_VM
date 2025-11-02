@echo off
echo =============================================================================
echo 🏠 FIXING ICON CROPPING - Making Whole House Visible
echo =============================================================================
echo.
echo IMPORTANT: Your icon.png needs padding around the house!
echo Android adaptive icons crop the edges - keep house in center 66%% area
echo.
pause

REM Set Java environment
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.16.8-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

REM Set Android SDK environment
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%

echo [1/6] Updating icon background color to purple...
powershell -Command "(Get-Content 'android\app\src\main\res\values\colors.xml') -replace '<color name=\"iconBackground\">#ffffff</color>', '<color name=\"iconBackground\">#9B7EDE</color>' | Set-Content 'android\app\src\main\res\values\colors.xml'"
echo ✅ Background color updated
echo.

echo [2/6] Clearing Android build cache...
cd android
if exist app\build rmdir /s /q app\build
if exist app\.cxx rmdir /s /q app\.cxx
if exist build rmdir /s /q build
cd ..
echo ✅ Build cache cleared
echo.

echo [3/6] Clearing Android icon resources...
if exist android\app\src\main\res\mipmap-* rmdir /s /q android\app\src\main\res\mipmap-*
echo ✅ Old icon resources cleared
echo.

echo [4/6] Regenerating Android project with updated icon settings...
call npx expo prebuild --platform android --clean
echo ✅ Android project regenerated
echo.

echo [5/6] Updating icon background color again after regeneration...
powershell -Command "(Get-Content 'android\app\src\main\res\values\colors.xml') -replace '<color name=\"iconBackground\">#ffffff</color>', '<color name=\"iconBackground\">#9B7EDE</color>' | Set-Content 'android\app\src\main\res\values\colors.xml'"
echo ✅ Background color confirmed
echo.

echo [6/6] Building APK with fixed icon...
cd android
if exist gradlew.bat (
    call gradlew.bat assembleRelease
) else (
    echo ❌ gradlew.bat not found. Make sure you're in the correct directory.
)
cd ..
echo.

if exist android\app\build\outputs\apk\release\app-release.apk (
    echo =============================================================================
    echo ✅ BUILD SUCCESSFUL!
    echo =============================================================================
    echo 📍 APK Location: android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo ⚠️  IF THE HOUSE IS STILL CROPPED:
    echo     Your icon.png file needs more padding around the house.
    echo     The house should be in the center 66%% of the image to avoid cropping.
    echo     Add transparent or purple padding around the edges of your icon.png
    echo.
) else (
    echo =============================================================================
    echo ❌ BUILD FAILED
    echo =============================================================================
    echo Please check the error messages above.
    echo.
)

pause
