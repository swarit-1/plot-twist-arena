import axios from 'axios';

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:8001';

export interface PredictTwistRequest {
  story_setup: string;
  genre?: string;
  num_predictions?: number;
}

export interface PredictTwistResponse {
  predictions: string[];
  confidence_scores: number[];
}

export interface GenerateStoryRequest {
  genre?: string;
  difficulty?: string;
}

export interface GenerateStoryResponse {
  story_setup: string;
  hidden_twist: string;
  genre: string;
}

export interface SemanticScoreRequest {
  guess: string;
  actual_twist: string;
}

export interface SemanticScoreResponse {
  score: number;
  justification: string;
  similarity_breakdown: {
    cosine_similarity: number;
    semantic_overlap: number;
    guess_length: number;
    actual_length: number;
  };
}

export class ModelClient {
  async predictTwist(request: PredictTwistRequest): Promise<PredictTwistResponse> {
    const response = await axios.post(`${MODEL_SERVER_URL}/predict-twist`, {
      story_setup: request.story_setup,
      genre: request.genre,
      num_predictions: request.num_predictions || 3,
    });
    return response.data;
  }

  async generateStory(request: GenerateStoryRequest): Promise<GenerateStoryResponse> {
    const response = await axios.post(`${MODEL_SERVER_URL}/generate-story`, {
      genre: request.genre,
      difficulty: request.difficulty || 'medium',
    });
    return response.data;
  }

  async scoreGuess(request: SemanticScoreRequest): Promise<SemanticScoreResponse> {
    const response = await axios.post(`${MODEL_SERVER_URL}/semantic-score`, {
      guess: request.guess,
      actual_twist: request.actual_twist,
    });
    return response.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${MODEL_SERVER_URL}/health`);
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

export const modelClient = new ModelClient();
