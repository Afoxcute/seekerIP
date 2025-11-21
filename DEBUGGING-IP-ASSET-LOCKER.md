# Debugging IP Asset Locker HTML Error

## Problem
Frontend still showing:
```
Error loading IP Asset Locker data: SyntaxError: Unexpected token '<', "<!doctype "...
```

## Root Cause Analysis

The HTML error means the backend is returning an HTML error page instead of JSON. This happens when:

1. **Backend service is not running** - Express returns default HTML error page
2. **Backend is on production URL** - Production backend may not have IP Asset Locker routes
3. **Network/CORS issues** - Request fails before reaching backend
4. **Backend crashes** - Service returns error page instead of JSON

## Solution Implemented

### 1. Smart URL Detection
The frontend now automatically detects environment:
```typescript
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000/api/ip-asset-locker'
  : 'https://seekerip-production-f87d.up.railway.app/api/ip-asset-locker';
```

- **Local development**: Uses `http://localhost:5000`
- **Production**: Uses Railway URL

### 2. Mock Data Fallback
If backend is unavailable, returns mock data instead of crashing:
```typescript
private getMockData<T>(endpoint: string): T {
  console.warn(`⚠️ Backend unavailable, returning mock data for ${endpoint}`);
  // Returns empty/default data
}
```

### 3. Better Error Handling
All API calls now have try-catch with fallback:
```typescript
async getStats(): Promise<IPAssetLockerStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    return this.handleResponse<IPAssetLockerStats>(response, '/stats');
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return this.getMockData<IPAssetLockerStats>('/stats');
  }
}
```

## How to Debug

### Step 1: Check Browser Console
Open DevTools (F12) and look for messages like:
```
⚠️ Backend unavailable, returning mock data for /stats
Failed to fetch stats: Error: API Error (404): /stats - Backend may not be running...
```

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Look for requests to `/api/ip-asset-locker/stats`
3. Check response:
   - **200**: Success - should be JSON
   - **404**: Endpoint not found - backend may not have routes
   - **500**: Server error - backend crashed
   - **No response**: Backend not running

### Step 3: Test Backend Directly

**If using local backend:**
```bash
# Terminal 1: Start backend
cd backend
yarn dev

# Terminal 2: Test endpoint
curl http://localhost:5000/api/ip-asset-locker/stats
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "totalMintedHBAR": "0",
    "totalHBARTokensMinted": "0",
    "totalLockedAssets": 0
  }
}
```

**If getting HTML error:**
```bash
# Backend is returning error page
# Check if service is running and routes are registered
```

### Step 4: Check What URL Frontend is Using

Open browser console and run:
```javascript
console.log(window.location.hostname)
// If 'localhost' or '127.0.0.1': uses local backend
// Otherwise: uses production URL
```

## Common Scenarios

### Scenario 1: Local Development
```
Frontend: http://localhost:5173
Backend: http://localhost:5000
Status: ✅ Should work if backend is running
```

**Fix:**
```bash
# Terminal 1
cd backend && yarn dev

# Terminal 2
cd app && yarn dev --host
```

### Scenario 2: Production Deployment
```
Frontend: https://seekerip.example.com
Backend: https://seekerip-production-f87d.up.railway.app
Status: ❌ May fail if backend doesn't have routes
```

**Fix:**
1. Deploy updated backend with error handlers
2. Verify routes are registered on production
3. Check Railway logs for errors

### Scenario 3: Mixed Environment
```
Frontend: http://localhost:5173 (local)
Backend: https://seekerip-production-f87d.up.railway.app (production)
Status: ⚠️ May work but uses production data
```

**Fix:** Change to use local backend:
```typescript
// In ipAssetLockerService.ts
const API_BASE_URL = 'http://localhost:5000/api/ip-asset-locker';
```

## Verification Checklist

- [ ] Backend is running (`yarn dev` in `/backend`)
- [ ] Backend shows: `🚀 Backend server running at http://localhost:5000`
- [ ] Frontend detects correct environment (check console)
- [ ] Network requests show 200 status (not 404 or 500)
- [ ] Response is JSON (not HTML)
- [ ] Mock data appears in console if backend unavailable

## Files Modified

1. **`app/src/services/ipAssetLockerService.ts`**
   - Added environment detection
   - Added mock data fallback
   - Added try-catch to all API methods
   - Better error messages

2. **`backend/src/index.ts`**
   - Added 404 JSON handler
   - Added error handler

3. **`backend/src/app.ts`**
   - Added IP Asset Locker routes
   - Added 404 JSON handler
   - Added error handler

## Next Steps

1. **Rebuild frontend:**
   ```bash
   cd app && yarn build
   ```

2. **Start backend:**
   ```bash
   cd backend && yarn dev
   ```

3. **Start frontend:**
   ```bash
   cd app && yarn dev --host
   ```

4. **Check console** for warnings/errors

5. **If still seeing HTML errors:**
   - Verify backend is actually running (check terminal output)
   - Check Network tab in DevTools for response content
   - Look for error messages in backend console
   - Verify routes are registered (test `/api/ip-asset-locker/stats` directly)

## Production Deployment

To deploy to production with IP Asset Locker support:

1. **Update backend on Railway:**
   ```bash
   git push  # Deploy updated backend with error handlers
   ```

2. **Verify production backend:**
   ```bash
   curl https://seekerip-production-f87d.up.railway.app/api/ip-asset-locker/stats
   ```

3. **Rebuild and deploy frontend:**
   ```bash
   yarn build
   # Deploy dist/ folder
   ```

## Support

If you're still seeing the HTML error:

1. **Check backend logs** - Look for error messages
2. **Verify network connectivity** - Can you reach the backend URL?
3. **Check CORS** - Are CORS headers present?
4. **Test endpoint directly** - Use curl or Postman
5. **Check browser console** - Look for detailed error messages

The mock data fallback should prevent crashes, but you'll see warnings in the console indicating the backend is unavailable.
