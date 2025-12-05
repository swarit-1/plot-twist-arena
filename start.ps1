# PlotTwist Arena - Windows Startup Script
# Starts all services in separate PowerShell windows

Write-Host "=== PlotTwist Arena Startup ===" -ForegroundColor Cyan
Write-Host ""

# Check if dependencies are installed
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    cd backend
    npm install
    cd ..
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
}

# Check if dataset exists
if (-not (Test-Path "dataset\processed\train.json")) {
    Write-Host "Generating dataset..." -ForegroundColor Yellow
    cd dataset-builder
    python scrape_twists.py
    cd ..
}

Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Start Model Server
Write-Host "[1/3] Starting Model Server on port 8001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host '=== Model Server ===' -ForegroundColor Magenta; cd '$PWD\model-server'; python -m uvicorn main:app --reload --port 8001"

Start-Sleep -Seconds 5

# Start Backend
Write-Host "[2/3] Starting Backend API on port 3001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host '=== Backend API ===' -ForegroundColor Green; cd '$PWD\backend'; npm run dev"

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "[3/3] Starting Frontend on port 5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host '=== Frontend ===' -ForegroundColor Yellow; cd '$PWD\frontend'; npm run dev"

Write-Host ""
Write-Host "=== All Services Starting! ===" -ForegroundColor Green
Write-Host ""
Write-Host "The application will be available at:" -ForegroundColor Cyan
Write-Host "  http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop services, press Ctrl+C in each window" -ForegroundColor Gray
Write-Host ""
Write-Host "Waiting 10 seconds for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Try to open browser
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"
