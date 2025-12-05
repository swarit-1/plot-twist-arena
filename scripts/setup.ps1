# PlotTwist Arena Setup Script for Windows
Write-Host "=== PlotTwist Arena Setup Script ===" -ForegroundColor Cyan

# Create environment files
Write-Host "Creating environment files..." -ForegroundColor Yellow
Copy-Item -Path "backend\.env.example" -Destination "backend\.env" -ErrorAction SilentlyContinue
Copy-Item -Path "frontend\.env.example" -Destination "frontend\.env" -ErrorAction SilentlyContinue

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Backend
Write-Host "Installing backend dependencies..." -ForegroundColor Green
Set-Location backend
npm install
Set-Location ..

# Frontend
Write-Host "Installing frontend dependencies..." -ForegroundColor Green
Set-Location frontend
npm install
Set-Location ..

# Dataset builder
Write-Host "Installing dataset builder dependencies..." -ForegroundColor Green
Set-Location dataset-builder
pip install -r requirements.txt
Set-Location ..

# Model server
Write-Host "Installing model server dependencies..." -ForegroundColor Green
Set-Location model-server
pip install -r requirements.txt
Set-Location ..

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Generate dataset: npm run scrape:dataset"
Write-Host "2. Train model (optional): npm run train:model"
Write-Host "3. Start services: docker-compose up"
Write-Host ""
