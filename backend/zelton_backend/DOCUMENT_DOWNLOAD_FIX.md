# Document Download Fix Summary

## Problem
- Tenant documents were not accessible via `https://api.zelton.in/backend/media/...`
- Files exist in `/ZeltonLivings/dbdata/media/tenant_documents/` but couldn't be accessed
- Both tenant and owner dashboard downloads failed with deprecation error

## Root Causes
1. **Nginx Configuration**: The nginx config was pointing to wrong media directory
2. **Missing Debug Logging**: Owner download endpoint lacked proper error logging
3. **Poor Error Handling**: Owner dashboard didn't show detailed error messages
4. **Deprecated FileSystem API**: Mobile app was using deprecated `expo-file-system` API instead of legacy import

## Changes Made

### 1. Fixed Nginx Configuration
**Files changed:**
- `/etc/nginx/nginx.conf`
- `/ZeltonLivings/appsdata/backend/zelton_backend/nginx.conf`
- `/ZeltonLivings/appsdata/backend/zelton_backend/nginx_backend.conf`

**Changes:**
- Updated media directory from `/ZeltonLivings/appsdata/backend/zelton_backend/media/` to `/ZeltonLivings/dbdata/media/`
- Added `/backend/media/` location block for `api.zelton.in` server
- Fixed indentation issues

**Before:**
```nginx
location /media/ {
    alias /ZeltonLivings/appsdata/backend/zelton_backend/media/;
}
```

**After:**
```nginx
location /media/ {
    alias /ZeltonLivings/dbdata/media/;
}

location /backend/media/ {
    alias /ZeltonLivings/dbdata/media/;
}
```

### 2. Improved Backend Error Logging
**File:** `backend/zelton_backend/core/views.py`

**Changes to TenantDocumentViewSet.download_document (lines 2831-2894):**
- Added debug logging for document ID, owner, and document lookup
- Added file existence checks
- Added debug_info in response
- Added better exception handling with traceback

### 3. Improved Frontend Error Handling
**File:** `frontend/zelton_mobile/src/screens/OwnerTenantDocumentsScreen.js`

**Changes to handleDownloadDocument (lines 69-155):**
- Added detailed console logging for response data
- Added debug_info logging
- Improved error messages to show URL and file name
- Better error handling with detailed error messages

### 4. Fixed Deprecated FileSystem API
**Files:**
- `frontend/zelton_mobile/src/screens/TenantDocumentsScreen.js`
- `frontend/zelton_mobile/src/screens/OwnerTenantDocumentsScreen.js`

**Changes:**
- Changed import from `expo-file-system` to `expo-file-system/legacy`
- This fixes the deprecation error: "Method downloadAsync imported from 'expo-file-system' is deprecated"

**Before:**
```javascript
import * as FileSystem from "expo-file-system";
```

**After:**
```javascript
import * as FileSystem from "expo-file-system/legacy";
```

## Actions Required

### 1. Reload Nginx ✅ DONE
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 2. Restart Django/Gunicorn ✅ DONE
```bash
pkill -HUP gunicorn
```

### 3. Restart Mobile App ⚠️ REQUIRED
**Important:** You MUST restart the Expo mobile app for the FileSystem fix to take effect:
1. Close the Expo app completely (force close)
2. Restart the development server: `npm start` or `expo start`
3. Reload the app on your device

### 4. Test the Fix
1. **From browser/curl:**
   ```bash
   curl -I https://api.zelton.in/backend/media/tenant_documents/2/rental_agreement_ab7a539a.png
   ```
   Should return: `200 OK`

2. **From mobile app:**
   - Login as owner
   - Navigate to a unit with tenant documents
   - Try to download a tenant document
   - Check the console logs for detailed debug information

### 4. Check Logs
```bash
# Check Django logs for debug output
tail -f /ZeltonLivings/dbdata/logs/django.log | grep "Owner download"

# Check Gunicorn error logs
tail -f /ZeltonLivings/appsdata/backend/zelton_backend/logs/gunicorn_error.log
```

## Expected Behavior After Fix

### Tenant Dashboard
- ✅ Should continue to work as before
- ✅ Download tenant documents successfully
- ✅ View documents successfully

### Owner Dashboard
- ✅ Should now download tenant documents successfully
- ✅ Better error messages if something fails
- ✅ Debug logging in backend for troubleshooting

### Admin Portal
- ✅ Document links should now work
- ✅ Files should be accessible via `/backend/media/` URL

## Verification Checklist
- [ ] Nginx reloaded successfully
- [ ] Gunicorn/Django restarted successfully
- [ ] Can access document via browser: `https://api.zelton.in/backend/media/tenant_documents/2/rental_agreement_ab7a539a.png`
- [ ] Owner dashboard can download tenant documents
- [ ] Tenant dashboard still works (download documents)
- [ ] Admin portal can view/download documents

## Files Modified
1. `/etc/nginx/nginx.conf` ✅
2. `/ZeltonLivings/appsdata/backend/zelton_backend/nginx.conf` ✅
3. `/ZeltonLivings/appsdata/backend/zelton_backend/nginx_backend.conf` ✅
4. `/ZeltonLivings/appsdata/backend/zelton_backend/core/views.py` ✅
5. `/ZeltonLivings/appsdata/frontend/zelton_mobile/src/screens/OwnerTenantDocumentsScreen.js` ✅
6. `/ZeltonLivings/appsdata/frontend/zelton_mobile/src/screens/TenantDocumentsScreen.js` ✅

## Important Notes
- All media files are now stored in `/ZeltonLivings/dbdata/media/` (as originally configured in Django settings)
- The `/ZeltonLivings/appsdata/backend/zelton_backend/media/` directory is no longer used
- Future uploads will go to the correct directory
- Old files in the wrong directory should be moved (if any exist)

