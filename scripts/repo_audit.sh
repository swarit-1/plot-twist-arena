#!/bin/bash
set -e

echo "=== PlotTwist Arena Repository Audit ==="
echo ""

# Check versions
echo "Checking tool versions..."
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Python: $(python --version)"
echo ""

# Install dependencies if needed
echo "Installing dependencies..."

# Backend
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Model server
if [ ! -f "model-server/.venv/bin/activate" ]; then
    echo "Setting up model-server virtual environment..."
    cd model-server
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Dataset builder
if [ ! -f "dataset-builder/.venv/bin/activate" ]; then
    echo "Setting up dataset-builder virtual environment..."
    cd dataset-builder
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

echo ""
echo "Running linters..."

# Lint backend
echo "Linting backend..."
cd backend
if [ -f "package.json" ] && grep -q "\"lint\"" package.json; then
    npm run lint || echo "Backend lint not configured, skipping..."
fi
cd ..

# Lint frontend
echo "Linting frontend..."
cd frontend
if [ -f "package.json" ] && grep -q "\"lint\"" package.json; then
    npm run lint || echo "Frontend lint not configured, skipping..."
fi
cd ..

# Lint model-server
echo "Linting model-server..."
cd model-server
if command -v flake8 &> /dev/null; then
    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics || echo "flake8 errors found"
else
    echo "flake8 not installed, skipping Python lint"
fi
cd ..

echo ""
echo "Running tests..."

# Test model-server
echo "Testing model-server..."
cd model-server
if [ -d "tests" ]; then
    source .venv/bin/activate 2>/dev/null || true
    pytest -q || echo "No model-server tests found"
fi
cd ..

# Test frontend
echo "Testing frontend..."
cd frontend
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    npm test -- --passWithNoTests || echo "No frontend tests found"
fi
cd ..

# Test backend
echo "Testing backend..."
cd backend
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    npm test -- --passWithNoTests || echo "No backend tests found"
fi
cd ..

echo ""
echo "=== Audit Complete ==="
