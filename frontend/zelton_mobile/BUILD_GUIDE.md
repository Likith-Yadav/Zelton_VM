# 🚀 Zelton Mobile Build Guide

## 📱 Build Files Created

### ✅ Android App Bundle (AAB) - For Google Play Store
- **Location**: `android\app\build\outputs\bundle\release\app-release.aab`
- **Size**: ~144MB
- **Purpose**: Upload to Google Play Console for distribution
- **Build Command**: `.\build-aab.bat`

### ✅ APK - For Direct Installation
- **Location**: `android\app\build\outputs\apk\release\app-release.apk`
- **Size**: ~86MB
- **Purpose**: Direct installation on Android devices
- **Build Command**: `.\build-apk.bat`

## 🔧 How to Switch Between Build Types

### Method 1: Use Build Scripts (Recommended)
```bash
# Build APK for direct installation
.\build-apk.bat

# Build AAB for Google Play Store
.\build-aab.bat
```

### Method 2: Manual Configuration
Edit `android\app\build.gradle` and change line 11:
```gradle
// For APK builds
def BUILD_FORMAT = "APK"

// For AAB builds  
def BUILD_FORMAT = "AAB"
```

## 📋 Build Configuration Details

### Signing Configuration
- **Keystore**: `zelton-release-key.keystore`
- **Alias**: `zelton-key-alias`
- **Password**: `zelton123`
- **Location**: `android\app\zelton-release-key.keystore`

### App Details
- **Package Name**: `com.zeltonlivings.mobile`
- **Version**: 1.0.0
- **Version Code**: 1
- **Target SDK**: 34
- **Min SDK**: 21

## 🎯 Next Steps

### For Google Play Store (AAB)
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app or select existing app
3. Upload `app-release.aab` to Production track
4. Fill in store listing details
5. Submit for review

### For Direct Distribution (APK)
1. Share `app-release.apk` with users
2. Users need to enable "Install from unknown sources"
3. Install directly on Android devices

## 🔍 Build Environment Setup

The build scripts automatically configure:
- **Java**: OpenJDK 17 (`C:\Program Files\Microsoft\jdk-17.0.16.8-hotspot`)
- **Android SDK**: `C:\Users\%USERNAME%\AppData\Local\Android\Sdk`
- **Gradle**: Configured for both APK and AAB builds

## 📝 Important Notes

1. **Keystore Security**: Keep `zelton-release-key.keystore` safe - you'll need it for all future updates
2. **Version Updates**: Increment `versionCode` in `build.gradle` for each new release
3. **Dependencies**: The build removes `react-native-reanimated` and `react-native-worklets` to avoid compilation issues
4. **New Architecture**: Disabled (`newArchEnabled: false`) for compatibility

## 🛠️ Troubleshooting

If builds fail:
1. Ensure Java and Android SDK paths are correct
2. Check `android\local.properties` exists with correct SDK path
3. Run `npx expo prebuild --clean` if native files are corrupted
4. Verify all dependencies are installed with `npm install`

---
**Build completed successfully!** 🎉
Both APK and AAB files are ready for distribution.
