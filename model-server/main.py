"""
PlotTwist Arena - Model Server
FastAPI server for serving fine-tuned LLM and scoring
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from sentence_transformers import SentenceTransformer, util
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PlotTwist Arena Model Server")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
model_path = os.getenv("MODEL_PATH", "models/fine_tuned_model")
device = "cuda" if torch.cuda.is_available() else "cpu"

# Global model holders
twist_model = None
twist_tokenizer = None
embedding_model = None
generation_pipeline = None

class PredictTwistRequest(BaseModel):
    story_setup: str
    genre: Optional[str] = None
    num_predictions: int = 3

class PredictTwistResponse(BaseModel):
    predictions: List[str]
    confidence_scores: List[float]

class GenerateStoryRequest(BaseModel):
    genre: Optional[str] = None
    difficulty: str = "medium"

class GenerateStoryResponse(BaseModel):
    story_setup: str
    hidden_twist: str
    genre: str

class SemanticScoreRequest(BaseModel):
    guess: str
    actual_twist: str

class SemanticScoreResponse(BaseModel):
    score: float
    justification: str
    similarity_breakdown: dict

@app.on_event("startup")
async def load_models():
    """Load models on startup"""
    global twist_model, twist_tokenizer, embedding_model, generation_pipeline

    logger.info(f"Loading models on device: {device}")

    # Try to load fine-tuned model, fallback to base model
    try:
        if os.path.exists(model_path):
            logger.info(f"Loading fine-tuned model from {model_path}")
            twist_tokenizer = AutoTokenizer.from_pretrained(model_path)
            twist_model = AutoModelForCausalLM.from_pretrained(
                model_path,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                device_map="auto" if device == "cuda" else None
            )
        else:
            logger.warning(f"Fine-tuned model not found at {model_path}, using base model")
            model_name = "meta-llama/Llama-3.2-1B-Instruct"
            twist_tokenizer = AutoTokenizer.from_pretrained(model_name)
            twist_model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                device_map="auto" if device == "cuda" else None
            )

        if device == "cpu":
            twist_model = twist_model.to(device)

        # Create generation pipeline
        generation_pipeline = pipeline(
            "text-generation",
            model=twist_model,
            tokenizer=twist_tokenizer,
            device=0 if device == "cuda" else -1
        )

    except Exception as e:
        logger.error(f"Error loading twist model: {e}")
        logger.info("Falling back to TinyLlama")
        model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        twist_tokenizer = AutoTokenizer.from_pretrained(model_name)
        twist_model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        )
        if device == "cpu":
            twist_model = twist_model.to(device)

        generation_pipeline = pipeline(
            "text-generation",
            model=twist_model,
            tokenizer=twist_tokenizer,
            device=0 if device == "cuda" else -1
        )

    # Load sentence transformer for semantic scoring
    logger.info("Loading sentence transformer for semantic scoring")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

    logger.info("Models loaded successfully")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "device": device,
        "models_loaded": twist_model is not None and embedding_model is not None
    }

@app.post("/predict-twist", response_model=PredictTwistResponse)
async def predict_twist(request: PredictTwistRequest):
    """AI guesses the plot twist from story setup"""
    if twist_model is None or twist_tokenizer is None:
        raise HTTPException(status_code=503, message="Model not loaded")

    try:
        # Create prompt
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a plot twist prediction expert. Given a story setup, predict the most likely plot twist.
Generate {request.num_predictions} different possible plot twists.<|eot_id|><|start_header_id|>user<|end_header_id|>
Story Genre: {request.genre or 'unknown'}
Story Setup: {request.story_setup}

Predict {request.num_predictions} possible plot twists (number each):<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""

        # Generate predictions
        outputs = generation_pipeline(
            prompt,
            max_new_tokens=300,
            num_return_sequences=1,
            temperature=0.8,
            top_p=0.9,
            do_sample=True
        )

        generated_text = outputs[0]['generated_text']
        response_text = generated_text.split("<|start_header_id|>assistant<|end_header_id|>")[-1].strip()

        # Parse predictions
        predictions = []
        lines = response_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-')):
                # Remove numbering
                clean_line = line.lstrip('0123456789.-) ').strip()
                if clean_line and len(clean_line) > 10:
                    predictions.append(clean_line)

        # Ensure we have at least num_predictions
        while len(predictions) < request.num_predictions:
            predictions.append(f"The story has an unexpected twist involving {request.genre or 'mystery'} elements.")

        predictions = predictions[:request.num_predictions]
        confidence_scores = [1.0 - (i * 0.1) for i in range(len(predictions))]

        return PredictTwistResponse(
            predictions=predictions,
            confidence_scores=confidence_scores
        )

    except Exception as e:
        logger.error(f"Error predicting twist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-story", response_model=GenerateStoryResponse)
async def generate_story(request: GenerateStoryRequest):
    """AI generates a story setup with hidden twist"""
    if twist_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        genre = request.genre or "mystery"

        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a creative story writer. Generate a story setup and a hidden plot twist.
Format your response exactly as:
SETUP: [story setup]
TWIST: [hidden plot twist]<|eot_id|><|start_header_id|>user<|end_header_id|>
Generate a {genre} story with a clever plot twist. Difficulty: {request.difficulty}.<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""

        outputs = generation_pipeline(
            prompt,
            max_new_tokens=250,
            temperature=0.9,
            top_p=0.95,
            do_sample=True
        )

        generated_text = outputs[0]['generated_text']
        response_text = generated_text.split("<|start_header_id|>assistant<|end_header_id|>")[-1].strip()

        # Parse setup and twist
        setup = ""
        twist = ""

        for line in response_text.split('\n'):
            if line.startswith("SETUP:"):
                setup = line.replace("SETUP:", "").strip()
            elif line.startswith("TWIST:"):
                twist = line.replace("TWIST:", "").strip()

        # Fallbacks
        if not setup:
            setup = f"A mysterious event unfolds in a {genre} setting that challenges everything the protagonist knows."
        if not twist:
            twist = "The protagonist discovers they are not who they thought they were."

        return GenerateStoryResponse(
            story_setup=setup,
            hidden_twist=twist,
            genre=genre
        )

    except Exception as e:
        logger.error(f"Error generating story: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/semantic-score", response_model=SemanticScoreResponse)
async def semantic_score(request: SemanticScoreRequest):
    """Score semantic similarity between guess and actual twist"""
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")

    try:
        # Compute embeddings
        guess_embedding = embedding_model.encode(request.guess, convert_to_tensor=True)
        actual_embedding = embedding_model.encode(request.actual_twist, convert_to_tensor=True)

        # Compute cosine similarity
        similarity = util.cos_sim(guess_embedding, actual_embedding).item()

        # Convert to 0-100 score
        score = max(0, min(100, similarity * 100))

        # Generate justification
        if score >= 90:
            justification = "Excellent! Your guess captures the twist almost perfectly."
        elif score >= 75:
            justification = "Great job! Your guess is very close to the actual twist."
        elif score >= 60:
            justification = "Good effort! You captured some key elements of the twist."
        elif score >= 40:
            justification = "Decent attempt. You identified some aspects but missed key details."
        elif score >= 20:
            justification = "You're on the right track but the actual twist is quite different."
        else:
            justification = "The actual twist is very different from your guess."

        # Breakdown
        breakdown = {
            "cosine_similarity": similarity,
            "semantic_overlap": score,
            "guess_length": len(request.guess.split()),
            "actual_length": len(request.actual_twist.split())
        }

        return SemanticScoreResponse(
            score=score,
            justification=justification,
            similarity_breakdown=breakdown
        )

    except Exception as e:
        logger.error(f"Error computing semantic score: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
