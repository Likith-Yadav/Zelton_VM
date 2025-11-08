# 🔐 Keystore Backup System

This project has an automated keystore backup and restore system to ensure your release signing key is always preserved, even if you delete or regenerate the Android folder.

## ⚠️ IMPORTANT WARNING

**Losing your keystore means you can NEVER update your app on Google Play Store!**

If you lose the keystore file:
- You won't be able to update your existing app
- You'll have to create a completely new app listing
- All reviews, ratings, and user data from the old app won't transfer

## 📁 Files

- `zelton-release-key.keystore.backup` - Your backup keystore file (stored in project root)
- `android/app/zelton-release-key.keystore` - Active keystore (generated/restored automatically)
- `backup-keystore.bat` - Manually backup your keystore
- `restore-keystore.bat` - Manually restore your keystore

## 🔄 Automatic Restore

Both `build-aab.bat` and `build-apk.bat` automatically:
1. Check if keystore exists in `android/app/`
2. If missing, restore from `zelton-release-key.keystore.backup`
3. If backup is also missing, generate a new keystore (⚠️ WARNING: This breaks updates!)

## 📋 Manual Operations

### Create a Backup

```bash
.\backup-keystore.bat
```

This copies your current keystore from `android/app/zelton-release-key.keystore` to `zelton-release-key.keystore.backup` in the project root.

### Restore from Backup

```bash
.\restore-keystore.bat
```

This restores your keystore from the backup file to `android/app/zelton-release-key.keystore`.

## 🛡️ Additional Security Recommendations

1. **Store Multiple Backups**: Keep copies of `zelton-release-key.keystore.backup` in:
   - Cloud storage (Google Drive, Dropbox, etc.)
   - External hard drive
   - Password manager (if it supports file attachments)

2. **Keep Passwords Safe**: The keystore password is `zelton123` (stored in `build.gradle`). Consider:
   - Using a stronger password
   - Storing the password in a secure password manager
   - Documenting the password separately from the keystore

3. **Version Control**: ⚠️ The keystore backup is in `.gitignore` and should **NEVER** be committed to Git.

4. **Team Sharing**: If multiple developers need to build, securely share the backup file and password outside of Git.

## 🔑 Keystore Details

- **Alias**: `zelton-key-alias`
- **Password**: `zelton123`
- **Validity**: 10,000 days (~27 years)
- **Algorithm**: RSA 2048-bit

## 🚨 What Happens If You Lose It?

If you lose the keystore and backup:
1. You cannot update your existing app on Google Play
2. Users won't be able to install updates
3. You'll need to publish a completely new app with a new package name
4. All existing users would need to manually download the new app

**Always keep multiple backups in different locations!**

