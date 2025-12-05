# Running PlotTwist Arena on Windows (Without Docker)

## Prerequisites

1. **Node.js 20+** - Download from https://nodejs.org/
2. **Python 3.10+** - Download from https://www.python.org/
3. **PostgreSQL 15+** - Download from https://www.postgresql.org/download/windows/

## Step-by-Step Setup

### 1. Install PostgreSQL

If you don't have PostgreSQL installed:

**Option A: Download and Install**
- Download PostgreSQL 15 from https://www.postgresql.org/download/windows/
- During installation, set password to: `plottwist_dev`
- Accept default port: 5432

**Option B: Use Docker for Database Only**
```powershell
# If Docker Desktop is running, just start the database:
docker run -d --name plottwist-db -e POSTGRES_DB=plottwist -e POSTGRES_USER=plottwist -e POSTGRES_PASSWORD=plottwist_dev -p 5432:5432 postgres:15-alpine
```

### 2. Install Dependencies

Open PowerShell in the project root:

```powershell
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..

# Model Server
cd model-server
pip install -r requirements.txt
cd ..

# Dataset Builder
cd dataset-builder
pip install -r requirements.txt
cd ..
```

### 3. Setup Environment Files

```powershell
# Copy environment files
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Edit `backend\.env` if needed:
```
PORT=3001
DATABASE_URL=postgresql://plottwist:plottwist_dev@localhost:5432/plottwist
MODEL_SERVER_URL=http://localhost:8001
NODE_ENV=development
```

### 4. Generate Dataset

```powershell
cd dataset-builder
python scrape_twists.py
cd ..
```

This creates:
- `dataset/raw/plot_twists.json`
- `dataset/processed/train.json`
- `dataset/processed/val.json`
- `dataset/processed/test.json`

### 5. (Optional) Train Model

**Skip this step to use base model** - The app works fine without training!

If you want to train:
```powershell
cd model-server
python train_model.py --model_name "TinyLlama/TinyLlama-1.1B-Chat-v1.0" --dataset_path "../dataset/processed" --output_dir "models/fine_tuned_model"
cd ..
```

⚠️ Training takes 30-60 minutes and requires ~8GB RAM

### 6. Start Services

Open **3 separate PowerShell windows**:

**Window 1 - Model Server:**
```powershell
cd model-server
python -m uvicorn main:app --reload --port 8001
```

Wait for: `Models loaded successfully`

**Window 2 - Backend API:**
```powershell
cd backend
npm run dev
```

Wait for: `Backend server running on port 3001`

**Window 3 - Frontend:**
```powershell
cd frontend
npm run dev
```

Wait for: `Local: http://localhost:5173/`

### 7. Open Application

Open your browser to: **http://localhost:5173**

## Quick Start Script

Save this as `start.ps1` in the project root:

```powershell
# Start all services in separate windows

# Model Server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd model-server; python -m uvicorn main:app --reload --port 8001"

# Wait a bit for model server to start
Start-Sleep -Seconds 5

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "All services starting..."
Write-Host "Frontend will be at: http://localhost:5173"
Write-Host "Press Ctrl+C in each window to stop services"
```

Then run:
```powershell
.\start.ps1
```

## Troubleshooting

### "Port already in use"

Find and kill the process:
```powershell
# Find process on port 3001, 5173, or 8001
netstat -ano | findstr :3001

# Kill process (replace PID with the number from above)
taskkill /PID <PID> /F
```

### Model Server Errors

If you see "Model not found":
- The app will automatically use TinyLlama base model
- This is fine for testing!
- Training is optional

### Database Connection Errors

Make sure PostgreSQL is running:
```powershell
# Check if PostgreSQL service is running
Get-Service -Name postgresql*

# If not running, start it:
Start-Service postgresql-x64-15
```

### Python Package Errors

Create a virtual environment:
```powershell
cd model-server
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Stopping Services

Press `Ctrl+C` in each PowerShell window, or:

```powershell
# Kill all node and python processes (nuclear option)
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```
