# Fixing "AI Failed to Get Predictions" Error

## The Problem

The error "AI failed to get predictions" means the **Backend** (port 3001) cannot connect to the **Model Server** (port 8001).

## Current Status

I've checked your system and found:
- ✓ Frontend (port 5173) - RUNNING
- ✓ Model Server (port 8001) - RUNNING
- ✗ **Backend (port 3001) - NOT RUNNING** ← This is the problem!

## The Solution

You need to start the backend server. Here's how:

### Option 1: Restart Everything (Easiest)

Close all service windows and run:

```powershell
.\start-simple.ps1
```

This will start all 3 services in the correct order.

### Option 2: Start Just the Backend

Open a new PowerShell window in the project folder and run:

```powershell
cd backend
npm run dev
```

Wait for the message: `Backend server running on port 3001`

Then try the game again!

## Verify It's Working

Run this in PowerShell:

```powershell
.\check-services.ps1
```

You should see:
- ✓ Frontend (port 5173) - RUNNING
- ✓ Backend (port 3001) - RUNNING
- ✓ Model Server (port 8001) - RUNNING

## Why Did This Happen?

The backend requires:
1. A `.env` file (I've created this for you ✓)
2. Node.js dependencies installed (check with: `Test-Path backend\node_modules`)
3. The backend server running (this is what was missing)

## Next Steps

1. Run `.\start-simple.ps1` to start all services
2. Wait 10 seconds for everything to initialize
3. The browser should open automatically to http://localhost:5173
4. Try the game - it should work now!

## Still Not Working?

Check each service window for error messages:
- **Model Server window**: Should say "Models loaded successfully"
- **Backend window**: Should say "Backend server running on port 3001"
- **Frontend window**: Should show the Vite dev server running

If you see any red error messages, let me know what they say!
