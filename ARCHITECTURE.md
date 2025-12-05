# PlotTwist Arena - Technical Architecture

## System Overview

PlotTwist Arena is a full-stack application with AI model serving capabilities. The system consists of four main components that work together to deliver an interactive plot twist gaming experience.

## Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         User Browser                          │
│                    (React SPA - Port 5173)                    │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP/REST
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                      Express Backend                          │
│                      (Node.js - Port 3001)                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Routes: /api/ai-guess, /api/human-guess,              │  │
│  │         /api/leaderboard, /api/score-twist            │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────┬──────────────────────────┬───────────────────┘
                │                          │
                │ HTTP                     │ SQL
                │                          │
┌───────────────▼──────────┐  ┌────────────▼──────────────────┐
│   FastAPI Model Server   │  │      PostgreSQL Database       │
│   (Python - Port 8001)   │  │        (Port 5432)             │
│  ┌────────────────────┐  │  │  ┌──────────────────────────┐ │
│  │ LLM: Llama/TinyLM  │  │  │  │ Tables:                  │ │
│  │ Embeddings: MiniLM │  │  │  │  - game_sessions         │ │
│  └────────────────────┘  │  │  │  - game_results          │ │
└──────────────────────────┘  │  │  - leaderboard           │ │
                              │  └──────────────────────────┘ │
                              └───────────────────────────────┘
```

## Data Flow

### Mode 1: AI Guesses Player's Twist

```
1. User Input
   ├─ Story setup (text)
   ├─ Genre (optional)
   └─ Actual twist (hidden from AI)

2. Frontend → Backend
   POST /api/ai-guess
   {
     story_setup: "...",
     genre: "mystery",
     actual_twist: "..."
   }

3. Backend → Model Server
   POST /predict-twist
   {
     story_setup: "...",
     genre: "mystery",
     num_predictions: 3
   }

4. Model Server Processing
   ├─ Construct prompt with story setup
   ├─ Generate with fine-tuned LLM
   ├─ Parse multiple predictions
   └─ Return ranked predictions

5. Backend → Database
   INSERT game_session
   RETURN session_id, predictions

6. User Selection
   User picks closest prediction

7. Frontend → Backend
   POST /api/score-twist
   {
     session_id: 123,
     actual_twist: "...",
     selected_prediction: "..."
   }

8. Backend → Model Server
   POST /semantic-score
   {
     guess: selected_prediction,
     actual_twist: "..."
   }

9. Model Server Scoring
   ├─ Encode both texts with sentence transformer
   ├─ Compute cosine similarity
   ├─ Scale to 0-100 score
   └─ Generate justification

10. Backend → Database
    INSERT game_result, leaderboard
    RETURN score, justification

11. Frontend Display
    Show score with animation
```

### Mode 2: Player Guesses AI's Twist

```
1. Story Generation Request
   Frontend → Backend
   POST /api/generate-story
   { genre: "sci-fi", difficulty: "medium" }

2. Backend → Model Server
   POST /generate-story
   { genre: "sci-fi", difficulty: "medium" }

3. Model Server
   ├─ Generate story setup + twist
   ├─ Keep twist hidden
   └─ Return setup only to frontend

4. Frontend Display
   Show story setup
   Hide twist (stored in backend session)

5. Player Guess
   User types their guess

6. Frontend → Backend
   POST /api/human-guess
   {
     session_id: 124,
     story_setup: "...",
     hidden_twist: "...",
     player_guess: "..."
   }

7. Semantic Scoring
   Same as Mode 1 scoring flow

8. Frontend Display
   ├─ Show score
   ├─ Reveal actual twist
   └─ Show comparison
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (cyber theme)
- **State**: Zustand
- **Routing**: React Router v6
- **Animations**: Framer Motion
- **HTTP**: Axios

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript
- **Validation**: Zod
- **Database Client**: node-postgres (pg)
- **CORS**: cors middleware

### Model Server
- **Framework**: FastAPI
- **Language**: Python 3.10
- **LLM**: Transformers (Hugging Face)
  - Base: Llama-3.2-1B or TinyLlama-1.1B
  - Fine-tuning: PEFT (LoRA)
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)
- **Compute**: PyTorch with CUDA/CPU support

### Database
- **System**: PostgreSQL 15
- **Schema**: Relational (sessions, results, leaderboard)
- **Indexing**: B-tree on score for leaderboard

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Multi-service setup
- **Development**: Hot reload on all services

## Model Training Pipeline

### Dataset Generation

```python
# dataset-builder/scrape_twists.py

1. Template-based generation
   ├─ 10+ hand-crafted examples
   └─ 1000+ synthetic variations

2. Format
   {
     id: "twist_XXXXXX",
     story_genre: "mystery",
     story_setup: "...",
     twist: "...",
     tags: [...]
   }

3. Splits
   ├─ Train: 80% (800 examples)
   ├─ Val: 10% (100 examples)
   └─ Test: 10% (100 examples)
```

### Training Process

```python
# model-server/train_model.py

1. Load base model
   ├─ Llama-3.2-1B-Instruct
   └─ TinyLlama-1.1B-Chat (fallback)

2. Configure LoRA
   {
     r: 16,
     alpha: 32,
     target_modules: [q_proj, k_proj, v_proj, o_proj],
     dropout: 0.05
   }

3. Format prompts
   Two tasks alternating:
   ├─ Task 1: Predict twist from setup
   └─ Task 2: Generate setup + twist

4. Training
   ├─ Epochs: 3
   ├─ Batch size: 4
   ├─ Gradient accumulation: 4
   ├─ Learning rate: 2e-4
   └─ Mixed precision: FP16

5. Save
   └─ models/fine_tuned_model/
```

### Inference

```python
# model-server/main.py

1. Load fine-tuned model + tokenizer
2. Create generation pipeline
3. Serve predictions via FastAPI

Endpoints:
├─ /predict-twist: Generate twist predictions
├─ /generate-story: Create story + hidden twist
└─ /semantic-score: Score guess similarity
```

## Database Schema

### game_sessions
```sql
CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  mode VARCHAR(20) NOT NULL,        -- 'ai_guess' | 'human_guess'
  player_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### game_results
```sql
CREATE TABLE game_results (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES game_sessions(id),
  mode VARCHAR(20) NOT NULL,
  story_setup TEXT NOT NULL,
  actual_twist TEXT NOT NULL,
  guessed_twist TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL,      -- 0.00 to 100.00
  justification TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### leaderboard
```sql
CREATE TABLE leaderboard (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(100) NOT NULL,
  mode VARCHAR(20) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  game_result_id INTEGER REFERENCES game_results(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_score
ON leaderboard(mode, score DESC, created_at DESC);
```

## API Contracts

### Type Definitions (Shared)

```typescript
// Frontend & Backend shared types

interface AiGuessRequest {
  story_setup: string;
  genre?: string;
  player_name?: string;
  actual_twist: string;
}

interface AiGuessResponse {
  session_id: number;
  predictions: string[];
  confidence_scores: number[];
}

interface ScoreResponse {
  score: number;
  justification: string;
  breakdown: {
    cosine_similarity: number;
    semantic_overlap: number;
    guess_length: number;
    actual_length: number;
  };
}
```

### Python Types (Model Server)

```python
from pydantic import BaseModel

class PredictTwistRequest(BaseModel):
    story_setup: str
    genre: Optional[str] = None
    num_predictions: int = 3

class SemanticScoreRequest(BaseModel):
    guess: str
    actual_twist: str
```

## Security Considerations

### Input Validation
- Zod schemas on backend
- Pydantic models on model server
- SQL parameterization (no injection)

### Rate Limiting
- TODO: Add rate limiting middleware
- Prevent abuse of model endpoints

### Data Privacy
- Player names are optional
- No PII collection
- Session data retained for leaderboard only

### Model Safety
- Prompt injection mitigation via structured prompts
- Content filtering (future)
- Generation limits (max_tokens)

## Performance Optimizations

### Frontend
- Code splitting by route
- Lazy loading components
- Image optimization
- CSS purging (Tailwind)

### Backend
- Connection pooling (PostgreSQL)
- Index on leaderboard queries
- Async operations where possible

### Model Server
- Model loaded once at startup
- Batch inference potential (future)
- FP16 inference on GPU
- Sentence transformer caching

### Database
- Indexed leaderboard queries
- Prepared statements
- Connection pooling

## Deployment Strategy

### Development
```bash
docker-compose up
# All services with hot reload
```

### Production
```yaml
# docker-compose.prod.yml
services:
  frontend:
    build: production
    nginx static serving
  backend:
    replicas: 3
    load balanced
  model-server:
    GPU instance
    model persistence
  database:
    managed PostgreSQL
    backups enabled
```

### Scaling Plan
1. **Horizontal**: Load balance backend + model server
2. **Vertical**: GPU upgrades for model server
3. **Caching**: Redis for session data
4. **CDN**: Static frontend assets

## Monitoring & Observability

### Metrics to Track
- Request latency (p50, p95, p99)
- Model inference time
- Database query performance
- Error rates by endpoint
- Leaderboard query volume

### Logging
- Structured JSON logs
- Log levels: INFO, WARN, ERROR
- Request/response logging
- Model prediction logging (sampling)

### Health Checks
- `/health` on all services
- Database connectivity
- Model loading status

## Future Enhancements

### Features
- User accounts & authentication
- Twist difficulty ratings
- Genre-specific leaderboards
- Social sharing
- Daily challenges

### Technical
- WebSocket for real-time multiplayer
- Model A/B testing
- Advanced prompt engineering
- Multi-model ensemble
- Fine-tuning on user data (opt-in)

### Infrastructure
- Kubernetes deployment
- Auto-scaling
- Model versioning
- Canary deployments
- Comprehensive monitoring (Prometheus + Grafana)
