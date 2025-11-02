# Fixing Icon Cropping Issue

## Problem
The house icon is being cropped at the top because Android adaptive icons only show the center **66%** of the foreground image (the "safe zone"). Content near the edges gets cropped on circular/square icons.

## Solution

### Option 1: Add Padding to Your Icon (RECOMMENDED)
Your `icon.png` file needs padding around the house:

1. Open your `assets/icon.png` in an image editor (Photoshop, GIMP, etc.)
2. Add **transparent or purple padding** around the edges:
   - The house should be in the **center 66%** of the image
   - For a 1024x1024 icon, the house should be within a 675x675 pixel area in the center
3. Save the updated icon
4. Run `.\fix-icon-cropping.bat` to rebuild

### Option 2: Use Adaptive Icon Foreground/Background
If your icon.png already has proper padding, the current setup should work after regenerating.

## Current Configuration
- **Background Color**: Purple (#9B7EDE) - matches your house icon background
- **Foreground Image**: `assets/icon.png` (your house icon)

## How to Test
1. Run `.\fix-icon-cropping.bat`
2. Install the APK on your device
3. Check if the entire house (including roof peak) is visible

## Icon Specifications
- **Recommended Size**: 1024x1024 pixels
- **Safe Zone**: Center 66% (house should be within 675x675 area)
- **Format**: PNG with transparency
- **Background**: Purple (#9B7EDE) for adaptive icon background

