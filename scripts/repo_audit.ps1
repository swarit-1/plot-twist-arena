# PlotTwist Arena Repository Audit (Windows)

Write-Host "=== PlotTwist Arena Repository Audit ===" -ForegroundColor Cyan
Write-Host ""

# Check versions
Write-Host "Checking tool versions..." -ForegroundColor Yellow
Write-Host "Node: $(node --version)"
Write-Host "npm: $(npm --version)"
Write-Host "Python: $(python --version)"
Write-Host ""

# Install dependencies if needed
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Backend
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Green
    Push-Location backend
    npm install
    Pop-Location
}

# Frontend
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Green
    Push-Location frontend
    npm install
    Pop-Location
}

# Model server (skip venv for Windows simplicity, assume global install)
Write-Host "Checking model-server dependencies..." -ForegroundColor Green
Push-Location model-server
pip install -r requirements.txt --quiet 2>$null
Pop-Location

# Dataset builder
Write-Host "Checking dataset-builder dependencies..." -ForegroundColor Green
Push-Location dataset-builder
pip install -r requirements.txt --quiet 2>$null
Pop-Location

Write-Host ""
Write-Host "Running linters..." -ForegroundColor Yellow

# Lint backend
Write-Host "Linting backend..." -ForegroundColor Green
Push-Location backend
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.scripts.lint) {
        npm run lint 2>$null
    }
}
Pop-Location

# Lint frontend
Write-Host "Linting frontend..." -ForegroundColor Green
Push-Location frontend
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.scripts.lint) {
        npm run lint 2>$null
    }
}
Pop-Location

# Lint model-server
Write-Host "Linting model-server..." -ForegroundColor Green
Push-Location model-server
if (Get-Command flake8 -ErrorAction SilentlyContinue) {
    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics 2>$null
}
Pop-Location

Write-Host ""
Write-Host "Running tests..." -ForegroundColor Yellow

# Test model-server
Write-Host "Testing model-server..." -ForegroundColor Green
Push-Location model-server
if (Test-Path "tests") {
    pytest -q 2>$null
}
Pop-Location

# Test frontend
Write-Host "Testing frontend..." -ForegroundColor Green
Push-Location frontend
if (Test-Path "package.json") {
    npm test -- --passWithNoTests 2>$null
}
Pop-Location

# Test backend
Write-Host "Testing backend..." -ForegroundColor Green
Push-Location backend
if (Test-Path "package.json") {
    npm test -- --passWithNoTests 2>$null
}
Pop-Location

Write-Host ""
Write-Host "=== Audit Complete ===" -ForegroundColor Cyan
