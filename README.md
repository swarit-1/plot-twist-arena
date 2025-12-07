# PlotTwist Arena

An AI-powered game where humans and AI compete to predict plot twists in creative stories.

## Overview

PlotTwist Arena is a dual-mode game that challenges players to think creatively about narrative twists:

- **Mode 1 - AI Guesses Your Twist**: You provide a story setup and think of a twist. The AI tries to predict it.
- **Mode 2 - You Guess AI's Twist**: The AI generates a story with a hidden twist. You try to guess it.

Both modes use semantic similarity scoring to evaluate how close the guesses are to the actual twists.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  React Frontend │─────▶│  Express API    │─────▶│  FastAPI Model   │
│  (Port 5173)    │      │  (Port 3001)    │      │  Server (8001)   │
└─────────────────┘      └─────────────────┘      └──────────────────┘
                                 │
                                 ▼
                         ┌─────────────────┐
                         │  PostgreSQL DB  │
                         │  (Port 5432)    │
                         └─────────────────┘
```

## Features

### 🎨 Frontend UX
- **Cinematic twist reveals** with animated typewriter effect and blur transitions
- **Keyboard accessible** navigation with ARIA labels and focus management
- **Responsive design** optimized for mobile, tablet, and desktop
- **Interactive guess cards** with expandable AI reasoning
- Neon cyber-mystery aesthetic (Tailwind CSS)
- Smooth animations (Framer Motion)

### ⚡ Real-time Streaming
- **Server-Sent Events (SSE)** for low-latency predictions
- **Progressive disclosure** of AI guesses as they're generated
- Real-time progress indicators and status updates

### 🎯 Advanced Scoring
- **Hybrid scoring system** combining:
  - Semantic similarity (sentence transformers)
  - Lexical overlap (BLEU-like)
  - Tag matching
- **Detailed explanations** with confidence scores
- Breakdown of shared/missing elements

### 🧠 Retrieval-Augmented Generation (RAG)
- **FAISS-powered retrieval** of similar plot twists
- **Few-shot prompting** with top-K examples
- Improved prediction accuracy and reduced hallucinations
- Auditable retrieval tracking

### 📊 Dataset Quality
- **Taxonomy** of 40+ twist types across 8 categories
- **Deduplication** using embedding clustering
- **Augmentation** with paraphrasing and variations
- 10,000+ high-quality examples

### 👥 Multiplayer
- **WebSocket-based** 1v1 challenge mode
- **Room system** with codes for easy joining
- **Real-time scoring** and turn management
- Persistent match history

### 📈 Observability
- **Structured logging** with correlation IDs
- **Prometheus metrics** for monitoring
- **Grafana dashboard** template
- Health check endpoints
- CI/CD with GitHub Actions

### 🛡️ Safety & Localization
- **Content moderation** to block inappropriate twists
- **i18n support** (English/Spanish)
- Rate limiting and input validation

### ⚡ Performance
- **Redis caching** for predictions and RAG results
- In-memory LRU fallback
- Response time optimization
- Horizontal scaling support

### 📦 Production Ready
- Complete Docker Compose setup
- Kubernetes manifests
- Deployment guides (AWS, GCP, Vercel)
- Monitoring and backup strategies

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.10+
- PostgreSQL 15+ (optional - app works without it)
- Docker & Docker Compose (optional)

### Option 1: Simple Start (Windows - No Database Required)

**Fastest way to get started on Windows:**

```powershell
# One command to start everything
.\start-simple.ps1
```

This will:
- Install dependencies automatically
- Generate the plot twist dataset
- Start all 3 services (Model Server, Backend, Frontend)
- Open your browser to http://localhost:5173

The app works without PostgreSQL! Leaderboard won't persist, but the game is fully functional.

**Check service status:**
```powershell
.\check-services.ps1
```

### Option 2: Docker (Full Featured)

**Requires Docker Desktop to be running:**

```bash
# Start all services including PostgreSQL
docker-compose up --build

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
# Model Server: http://localhost:8001
```

### Option 3: Manual Setup (All Platforms)

#### 1. Install Dependencies

**Windows:**
```powershell
.\scripts\setup.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

#### 2. Setup Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
 
# Frontend
cp frontend/.env.example frontend/.env
```

#### 3. Start PostgreSQL

```bash
# Using Docker
docker run -d \
  --name plottwist-db \
  -e POSTGRES_DB=plottwist \
  -e POSTGRES_USER=plottwist \
  -e POSTGRES_PASSWORD=plottwist_dev \
  -p 5432:5432 \
  postgres:15-alpine
```

#### 4. Generate Dataset

```bash
cd dataset-builder
python scrape_twists.py
cd ..
```

This creates:
- `dataset/raw/plot_twists.json` - Full dataset
- `dataset/processed/train.json` - Training split (80%)
- `dataset/processed/val.json` - Validation split (10%)
- `dataset/processed/test.json` - Test split (10%)

#### 5. Train Model (Optional)

```bash
cd model-server

# Quick training with TinyLlama
python train_model.py \
  --model_name "TinyLlama/TinyLlama-1.1B-Chat-v1.0" \
  --dataset_path "../dataset/processed" \
  --output_dir "models/fine_tuned_model"

# Or use a larger model (requires more GPU memory)
python train_model.py \
  --model_name "meta-llama/Llama-3.2-1B-Instruct" \
  --dataset_path "../dataset/processed" \
  --output_dir "models/fine_tuned_model"

cd ..
```

**Note:** The model server will work without training using the base model, but fine-tuning improves twist prediction quality.

#### 6. Start Services

**Terminal 1 - Model Server:**
```bash
cd model-server
python -m uvicorn main:app --reload --port 8001
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

#### 7. Access Application

Open [http://localhost:5173](http://localhost:5173) in your browser.

## API Documentation

### Model Server Endpoints

#### POST /predict-twist
Predicts plot twists from a story setup.

```json
Request:
{
  "story_setup": "A detective investigates a locked room murder.",
  "genre": "mystery",
  "num_predictions": 3
}

Response:
{
  "predictions": [
    "The detective is actually the killer...",
    "The victim faked their own death...",
    "..."
  ],
  "confidence_scores": [1.0, 0.9, 0.8]
}
```

#### POST /generate-story
Generates a story setup with hidden twist.

```json
Request:
{
  "genre": "sci-fi",
  "difficulty": "medium"
}

Response:
{
  "story_setup": "...",
  "hidden_twist": "...",
  "genre": "sci-fi"
}
```

#### POST /semantic-score
Scores semantic similarity between guess and actual twist.

```json
Request:
{
  "guess": "The protagonist is an AI",
  "actual_twist": "The main character is artificial intelligence"
}

Response:
{
  "score": 92.5,
  "justification": "Excellent! Your guess captures the twist almost perfectly.",
  "similarity_breakdown": {
    "cosine_similarity": 0.925,
    "semantic_overlap": 92.5,
    "guess_length": 5,
    "actual_length": 6
  }
}
```

### Backend API Endpoints

#### POST /api/ai-guess
Start Mode 1 game session (AI guesses your twist).

```json
Request:
{
  "story_setup": "...",
  "genre": "mystery",
  "player_name": "Player1",
  "actual_twist": "..."
}

Response:
{
  "session_id": 123,
  "predictions": [...],
  "confidence_scores": [...]
}
```

#### POST /api/score-twist
Score AI's prediction in Mode 1.

```json
Request:
{
  "session_id": 123,
  "actual_twist": "...",
  "selected_prediction": "..."
}

Response:
{
  "score": 85.5,
  "justification": "...",
  "breakdown": {...}
}
```

#### POST /api/generate-story
Generate story for Mode 2 (human guesses).

```json
Request:
{
  "genre": "thriller",
  "difficulty": "hard",
  "player_name": "Player1"
}

Response:
{
  "session_id": 124,
  "story_setup": "...",
  "genre": "thriller"
}
```

#### POST /api/human-guess
Submit guess in Mode 2.

```json
Request:
{
  "session_id": 124,
  "story_setup": "...",
  "hidden_twist": "...",
  "player_guess": "..."
}

Response:
{
  "score": 78.3,
  "justification": "...",
  "actual_twist": "...",
  "breakdown": {...}
}
```

#### GET /api/leaderboard
Get leaderboard entries.

Query params:
- `mode` (optional): "ai_guess" | "human_guess"
- `limit` (optional): number (default: 10)

```json
Response:
{
  "leaderboard": [
    {
      "player_name": "Alice",
      "mode": "ai_guess",
      "score": 95.5,
      "created_at": "2025-01-01T12:00:00Z"
    },
    ...
  ]
}
```

## Development

### Project Structure

```
plot-twist-arena/
├── frontend/                # React frontend
│   ├── src/
│   │   ├── pages/          # Game pages
│   │   ├── services/       # API client
│   │   └── store/          # Zustand state
│   └── package.json
├── backend/                 # Express API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Model client
│   │   └── db/             # Database
│   └── package.json
├── model-server/           # FastAPI model server
│   ├── main.py            # Server endpoints
│   ├── train_model.py     # Training script
│   └── requirements.txt
├── dataset-builder/        # Dataset generation
│   ├── scrape_twists.py   # Dataset builder
│   └── requirements.txt
├── scripts/               # Setup scripts
└── docker-compose.yml     # Multi-service orchestration
```

### Database Schema

**game_sessions**
- id (serial primary key)
- mode (varchar)
- player_name (varchar)
- created_at (timestamp)

**game_results**
- id (serial primary key)
- session_id (foreign key)
- mode (varchar)
- story_setup (text)
- actual_twist (text)
- guessed_twist (text)
- score (decimal)
- justification (text)
- created_at (timestamp)

**leaderboard**
- id (serial primary key)
- player_name (varchar)
- mode (varchar)
- score (decimal)
- game_result_id (foreign key)
- created_at (timestamp)

## Model Training Details

### Dataset Format

Each training example:
```json
{
  "id": "twist_000001",
  "story_genre": "mystery",
  "story_setup": "A detective investigates...",
  "twist": "The detective is the killer...",
  "tags": ["unreliable narrator", "crime", "deception"]
}
```

### Training Configuration

- Base model: TinyLlama-1.1B or Llama-3.2-1B
- Fine-tuning: LoRA (r=16, alpha=32)
- Epochs: 3
- Batch size: 4 (with gradient accumulation)
- Learning rate: 2e-4
- Optimizer: AdamW
- Mixed precision: FP16 (GPU) / FP32 (CPU)

### Evaluation

The model is evaluated on:
1. Perplexity on test set
2. Manual review of generated twists
3. Semantic similarity scores

## Production Deployment

### Environment Variables

**Backend (.env):**
```
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/plottwist
MODEL_SERVER_URL=http://model-server:8001
NODE_ENV=production
```

**Frontend (.env):**
```
VITE_API_URL=https://api.yourapp.com
```

**Model Server:**
```
MODEL_PATH=/app/models/fine_tuned_model
DEVICE=cuda
```

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Scaling Considerations

- **Model Server**: Use GPU instances (AWS p3, GCP GPU VMs)
- **Backend**: Horizontal scaling with load balancer
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)
- **Frontend**: Static hosting (Netlify, Vercel, S3+CloudFront)

## Troubleshooting

### "AI failed to get predictions" Error

This means the backend can't reach the model server. Check:

1. **Is the backend running?**
   ```powershell
   # Check if port 3001 is active
   netstat -ano | findstr :3001
   ```
   If not running, start it: `cd backend && npm run dev`

2. **Is the model server running?**
   ```powershell
   # Check if port 8001 is active
   netstat -ano | findstr :8001
   ```
   If not running, start it: `cd model-server && python -m uvicorn main:app --reload --port 8001`

3. **Check service status:**
   ```powershell
   .\check-services.ps1
   ```

4. **Restart all services:**
   ```powershell
   .\start-simple.ps1
   ```

### Backend won't start

**Missing .env file:**
```powershell
# Create from example
Copy-Item backend\.env.example backend\.env
```

**Database connection error:**
The app now runs WITHOUT PostgreSQL! Database errors are warnings, not failures. If you see:
```
⚠ PostgreSQL not available, using in-memory fallback
```
This is fine! The game works without a database (leaderboard just won't persist).

To enable full database features:
```powershell
docker run -d --name plottwist-db -e POSTGRES_DB=plottwist -e POSTGRES_USER=plottwist -e POSTGRES_PASSWORD=plottwist_dev -p 5432:5432 postgres:15-alpine
```

### Model server won't start
- Check Python version: `python --version` (need 3.10+)
- Install dependencies: `cd model-server && pip install -r requirements.txt`
- The server will auto-download TinyLlama on first run (this takes a few minutes)

### Port already in use

Find and kill the process:
```powershell
# Find what's using the port
netstat -ano | findstr :3001

# Kill the process (replace PID with number from above)
taskkill /PID <PID> /F
```

### Frontend can't connect to backend
- Check `frontend/.env` has: `VITE_API_URL=http://localhost:3001`
- Restart frontend: `cd frontend && npm run dev`
- Clear browser cache and reload

### Training fails with OOM
- Reduce batch size in train_model.py
- Use gradient accumulation
- Try smaller model (TinyLlama)
- Enable quantization (8-bit)

### Services start but nothing happens

Wait 10-15 seconds after starting services. The model server needs time to:
1. Download the base model (first time only - ~2GB)
2. Load the model into memory
3. Start the API server

Watch the Model Server window for "Models loaded successfully"

## License

MIT License

## Contributing

Contributions welcome! Please open issues for bugs or feature requests.

## Acknowledgments

- Hugging Face Transformers
- Sentence Transformers
- React & Vite
- Tailwind CSS
- FastAPI
