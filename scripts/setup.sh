#!/bin/bash
set -e

echo "=== PlotTwist Arena Setup Script ==="

# Create environment files
echo "Creating environment files..."
cp backend/.env.example backend/.env 2>/dev/null || true
cp frontend/.env.example frontend/.env 2>/dev/null || true

# Install dependencies
echo "Installing dependencies..."

# Backend
echo "Installing backend dependencies..."
cd backend && npm install && cd ..

# Frontend
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Dataset builder
echo "Installing dataset builder dependencies..."
cd dataset-builder && pip install -r requirements.txt && cd ..

# Model server
echo "Installing model server dependencies..."
cd model-server && pip install -r requirements.txt && cd ..

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Generate dataset: npm run scrape:dataset"
echo "2. Train model (optional): npm run train:model"
echo "3. Start services: docker-compose up"
echo ""
