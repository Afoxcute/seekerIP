# Backend Setup & Troubleshooting Guide

## Problem
Frontend receiving HTML error pages instead of JSON:
```
Error loading IP Asset Locker data: SyntaxError: Unexpected token '<', "<!doctype "...
```

## Root Cause
The backend was returning 404 HTML error pages instead of JSON responses when endpoints weren't found or the service wasn't running.

## Solution Implemented

### 1. Added IP Asset Locker Routes to `app.ts`
- Previously only `index.ts` had the routes
- Now both files have consistent route registration

### 2. Added JSON Error Handlers
Both `index.ts` and `app.ts` now include:

**404 Handler:**
```typescript
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist...'
  });
});
```

**Error Handler:**
```typescript
app.use((err: any, _req, res, _next) => {
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});
```

## How to Run Backend

### Step 1: Install Dependencies
```bash
cd backend
yarn install
```

### Step 2: Set Up Environment Variables
Create `.env` file in `/backend` with required variables:
```env
PORT=5000
HEDERA_OPERATOR_ID=your_operator_id
HEDERA_OPERATOR_KEY=your_operator_key
HEDERA_RPC_URL=https://testnet.hashio.io/api
WALLET_PRIVATE_KEY=your_private_key
```

### Step 3: Start Backend
```bash
# Development mode
yarn dev

# Or production mode
yarn start
```

**Expected Output:**
```
🚀 Backend server running at http://localhost:5000
```

## Verify Backend is Running

### Test Root Endpoint
```bash
curl http://localhost:5000/
```

**Expected Response:**
```json
{
  "message": "✅ Yakoa + Hedera + Arbitration backend is running!",
  "version": "1.0.0",
  "endpoints": {
    "register": "/api/register",
    "yakoa": "/api/yakoa",
    "license": "/api/license",
    "arbitration": "/api/arbitration",
    "ipAssetLocker": "/api/ip-asset-locker"
  }
}
```

### Test IP Asset Locker Stats
```bash
curl http://localhost:5000/api/ip-asset-locker/stats
```

**Expected Response:**
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

### Test 404 Handler
```bash
curl http://localhost:5000/api/nonexistent
```

**Expected Response (NOT HTML):**
```json
{
  "success": false,
  "error": "Endpoint not found",
  "message": "The requested endpoint does not exist..."
}
```

## Frontend Configuration

### Verify Backend URL in Frontend
Check `app/src/services/ipAssetLockerService.ts`:
```typescript
const API_BASE_URL = 'https://seekerip-production-f87d.up.railway.app/api/ip-asset-locker';
```

For local development, change to:
```typescript
const API_BASE_URL = 'http://localhost:5000/api/ip-asset-locker';
```

## Troubleshooting

### Issue: Still seeing "<!doctype" errors

**Solution 1: Check if backend is running**
```bash
# In a new terminal, check if port 5000 is listening
netstat -an | grep 5000  # On Windows
lsof -i :5000            # On Mac/Linux
```

**Solution 2: Rebuild backend**
```bash
cd backend
yarn build
yarn dev
```

**Solution 3: Check for port conflicts**
```bash
# Kill process on port 5000
taskkill /PID <PID> /F  # Windows
kill -9 <PID>           # Mac/Linux
```

### Issue: Backend starts but endpoints return errors

**Check logs:**
```bash
# Look for error messages in the console output
# Common issues:
# - Missing environment variables
# - Contract addresses not set
# - RPC endpoint unreachable
```

**Verify environment variables:**
```bash
# In backend directory
cat .env  # Check if all required vars are set
```

### Issue: CORS errors in frontend

**Already fixed:** CORS middleware is enabled in both `index.ts` and `app.ts`:
```typescript
app.use(cors());
```

## Files Modified

- `backend/src/index.ts` - Added 404 and error handlers
- `backend/src/app.ts` - Added IP Asset Locker routes and error handlers

## Next Steps

1. **Start Backend:**
   ```bash
   cd backend && yarn dev
   ```

2. **Verify it's running:**
   ```bash
   curl http://localhost:5000/
   ```

3. **Start Frontend:**
   ```bash
   cd app && yarn dev --host
   ```

4. **Check browser console** for detailed error messages

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Backend may not be running` | Backend service not started | Run `yarn dev` in backend |
| `API Error (404)` | Endpoint doesn't exist | Check route is registered |
| `API Error (500)` | Server error | Check backend logs for details |
| `<!doctype` error | HTML response instead of JSON | Backend not running or wrong URL |

## Architecture

```
Frontend (http://localhost:5173)
    ↓
ipAssetLockerService (app/src/services)
    ↓
API Calls to Backend
    ↓
Backend (http://localhost:5000)
    ↓
IP Asset Locker Routes (backend/src/routes/ip-asset-locker.ts)
    ↓
IP Asset Locker Service (backend/src/services/ip-asset-locker-service.ts)
    ↓
Hedera Network
```

## Quick Start Command

```bash
# Terminal 1: Start Backend
cd backend && yarn dev

# Terminal 2: Start Frontend
cd app && yarn dev --host
```

Then open: `http://localhost:5173`
