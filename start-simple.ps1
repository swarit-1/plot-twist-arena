# PlotTwist Arena - Simple Startup (No Database Required)
# This version runs without PostgreSQL for quick testing

Write-Host "=== PlotTwist Arena - Quick Start ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will start the app WITHOUT PostgreSQL" -ForegroundColor Yellow
Write-Host "Leaderboard will not persist, but the game will work!" -ForegroundColor Yellow
Write-Host ""

# Create .env files if missing
if (-not (Test-Path "backend\.env")) {
    Write-Host "Creating backend .env file..." -ForegroundColor Green
    @"
PORT=3001
DATABASE_URL=postgresql://plottwist:plottwist_dev@localhost:5432/plottwist
MODEL_SERVER_URL=http://localhost:8001
NODE_ENV=development
"@ | Out-File -FilePath "backend\.env" -Encoding utf8
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "Creating frontend .env file..." -ForegroundColor Green
    @"
VITE_API_URL=http://localhost:3001
"@ | Out-File -FilePath "frontend\.env" -Encoding utf8
}

# Check if node_modules exist
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies (this may take a minute)..." -ForegroundColor Yellow
    Push-Location backend
    npm install --silent
    Pop-Location
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies (this may take a minute)..." -ForegroundColor Yellow
    Push-Location frontend
    npm install --silent
    Pop-Location
}

# Generate dataset if needed
if (-not (Test-Path "dataset\processed\train.json")) {
    Write-Host "Generating plot twist dataset..." -ForegroundColor Yellow
    Push-Location dataset-builder
    python scrape_twists.py
    Pop-Location
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Start Model Server
Write-Host "[1/3] Starting Model Server (port 8001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "`$host.UI.RawUI.WindowTitle='Model Server'; Write-Host '=== MODEL SERVER ===' -ForegroundColor Magenta; cd '$PWD\model-server'; python -m uvicorn main:app --reload --port 8001"

Start-Sleep -Seconds 8

# Start Backend
Write-Host "[2/3] Starting Backend API (port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "`$host.UI.RawUI.WindowTitle='Backend API'; Write-Host '=== BACKEND API ===' -ForegroundColor Green; cd '$PWD\backend'; npm run dev"

Start-Sleep -Seconds 5

# Start Frontend
Write-Host "[3/3] Starting Frontend (port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "`$host.UI.RawUI.WindowTitle='Frontend'; Write-Host '=== FRONTEND ===' -ForegroundColor Yellow; cd '$PWD\frontend'; npm run dev"

Write-Host ""
Write-Host "=== Services Starting! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "Open your browser to: " -NoNewline
Write-Host "http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop: Close each PowerShell window or press Ctrl+C" -ForegroundColor Gray
Write-Host ""

# Try to open browser
try {
    Start-Process "http://localhost:5173"
    Write-Host "Browser opened!" -ForegroundColor Green
} catch {
    Write-Host "Could not auto-open browser. Please open manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Tip: To enable leaderboard persistence, start PostgreSQL:" -ForegroundColor Cyan
Write-Host "  docker run -d --name plottwist-db -e POSTGRES_DB=plottwist -e POSTGRES_USER=plottwist -e POSTGRES_PASSWORD=plottwist_dev -p 5432:5432 postgres:15-alpine" -ForegroundColor Gray
