@echo off
REM This script applies the release signing configuration to build.gradle
REM Run this after regenerating the Android project if signing config is missing

echo Applying release signing configuration to build.gradle...

powershell -Command "$gradleFile = 'android\app\build.gradle'; if (-not (Test-Path $gradleFile)) { Write-Host 'build.gradle not found!'; exit 1 }; $content = Get-Content $gradleFile -Raw; $hasReleaseSigning = $content -match 'signingConfigs\s*\{[^}]*release\s*\{'; if (-not $hasReleaseSigning) { Write-Host 'Adding release signing config...'; $releaseConfig = @'`n        release {`n            storeFile file(''zelton-release-key.keystore'')`n            storePassword ''zelton123''`n            keyAlias ''zelton-key-alias''`n            keyPassword ''zelton123''`n        }'@; $content = $content -replace '(signingConfigs\s*\{[^\}]*debug[^\}]*\})', (`"`$1`$releaseConfig`"); Set-Content $gradleFile $content; Write-Host 'Release signing config added'; } else { Write-Host 'Release signing config already exists' }; $usesReleaseSigning = $content -match 'release\s*\{[^\}]*signingConfig signingConfigs\.release'; if (-not $usesReleaseSigning) { Write-Host 'Updating release build type to use release signing...'; $content = Get-Content $gradleFile -Raw; $content = $content -replace 'release\s*\{([^\}]*?)signingConfig signingConfigs\.debug', 'release {`$1signingConfig signingConfigs.release'; Set-Content $gradleFile $content; Write-Host 'Release build type updated'; } else { Write-Host 'Release build type already uses release signing' }"

echo.
echo ✅ Signing configuration applied!
echo.

