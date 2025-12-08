#!/usr/bin/env bash
set -e

# ANSI colors
cyan='\033[36m'
yellow='\033[33m'
green='\033[32m'
gray='\033[90m'
reset='\033[0m'

echo -e "${cyan}=== PlotTwist Arena - Quick Start (macOS) ===${reset}"
echo ""
echo -e "${yellow}This will start the app WITHOUT PostgreSQL${reset}"
echo -e "${yellow}Leaderboard will not persist, but the game will work!${reset}"
echo ""

# Go to project root (directory where this script lives)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

#####################################
# Create .env files if missing
#####################################

if [ ! -f "backend/.env" ]; then
  echo -e "${green}Creating backend .env file...${reset}"
  cat > backend/.env << 'EOF'
PORT=3001
DATABASE_URL=postgresql://plottwist:plottwist_dev@localhost:5432/plottwist
MODEL_SERVER_URL=http://localhost:8001
NODE_ENV=development
EOF
fi

if [ ! -f "frontend/.env" ]; then
  echo -e "${green}Creating frontend .env file...${reset}"
  cat > frontend/.env << 'EOF'
VITE_API_URL=http://localhost:3001
EOF
fi

#####################################
# Install dependencies if needed
#####################################

if [ ! -d "backend/node_modules" ]; then
  echo -e "${yellow}Installing backend dependencies (this may take a minute)...${reset}"
  (cd backend && npm install)
fi

if [ ! -d "frontend/node_modules" ]; then
  echo -e "${yellow}Installing frontend dependencies (this may take a minute)...${reset}"
  (cd frontend && npm install)
fi

#####################################
# Generate dataset if needed
#####################################

if [ ! -f "dataset/processed/train.json" ]; then
  echo -e "${yellow}Generating plot twist dataset...${reset}"
  (cd dataset-builder && python3 scrape_twists.py)
fi

echo ""
echo -e "${green}Starting services...${reset}"
echo ""

# Array to track PIDs so we can kill them on Ctrl+C
pids=()

#####################################
# Start Model Server
#####################################
echo -e "${cyan}[1/3] Starting Model Server (port 8001)...${reset}"
(
  cd model-server
  python3 -m uvicorn main:app --reload --port 8001
) &
pids+=($!)

sleep 5

#####################################
# Start Backend
#####################################
echo -e "${cyan}[2/3] Starting Backend API (port 3001)...${reset}"
(
  cd backend
  npm run dev
) &
pids+=($!)

sleep 5

#####################################
# Start Frontend
#####################################
echo -e "${cyan}[3/3] Starting Frontend (port 5173)...${reset}"
(
  cd frontend
  npm run dev
) &
pids+=($!)

echo ""
echo -e "${green}=== Services Starting! ===${reset}"
echo ""
echo -e "Open your browser to: ${yellow}http://localhost:5173${reset}"
echo ""

# Try to open browser on macOS
if command -v open >/dev/null 2>&1; then
  open "http://localhost:5173" || true
fi

echo -e "${gray}To stop: press Ctrl+C in this terminal${reset}"
echo ""

#####################################
# Clean shutdown on Ctrl+C
#####################################
trap 'echo; echo "Stopping services..."; for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; exit 0' INT TERM

# Wait for all background processes
wait
