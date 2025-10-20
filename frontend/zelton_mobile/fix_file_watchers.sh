#!/bin/bash

# Fix for ENOSPC error - File watchers limit
echo "🔧 Fixing file watchers limit for React Native/Expo development..."

# Check current limit
echo "Current file watchers limit:"
cat /proc/sys/fs/inotify/max_user_watches

# Try to increase the limit temporarily
echo "Attempting to increase file watchers limit..."

# Method 1: Try with sudo
if command -v sudo &> /dev/null; then
    echo "Trying with sudo..."
    echo 524288 | sudo tee /proc/sys/fs/inotify/max_user_watches 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Successfully increased file watchers limit with sudo"
        echo "New limit:"
        cat /proc/sys/fs/inotify/max_user_watches
    else
        echo "❌ Failed to increase limit with sudo"
    fi
else
    echo "❌ sudo not available"
fi

# Method 2: Check if we can write directly
if [ -w /proc/sys/fs/inotify/max_user_watches ]; then
    echo "Trying direct write..."
    echo 524288 > /proc/sys/fs/inotify/max_user_watches
    if [ $? -eq 0 ]; then
        echo "✅ Successfully increased file watchers limit directly"
        echo "New limit:"
        cat /proc/sys/fs/inotify/max_user_watches
    else
        echo "❌ Failed to increase limit directly"
    fi
else
    echo "❌ No write permission to /proc/sys/fs/inotify/max_user_watches"
fi

echo ""
echo "📋 Manual steps if the above failed:"
echo "1. Run: echo 524288 | sudo tee /proc/sys/fs/inotify/max_user_watches"
echo "2. Or run: sudo sysctl fs.inotify.max_user_watches=524288"
echo "3. For permanent fix: echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf"
echo ""
echo "🚀 After fixing, try running: npm start"
