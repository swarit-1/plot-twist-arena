import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AiGuessRequest {
  story_setup: string;
  genre?: string;
  player_name?: string;
  actual_twist: string;
}

export interface AiGuessResponse {
  session_id: number;
  predictions: string[];
  confidence_scores: number[];
}

export interface ScoreTwistRequest {
  session_id: number;
  actual_twist: string;
  selected_prediction: string;
}

export interface ScoreTwistResponse {
  score: number;
  justification: string;
  breakdown: {
    cosine_similarity: number;
    semantic_overlap: number;
    guess_length: number;
    actual_length: number;
  };
}

export interface GenerateStoryRequest {
  genre?: string;
  difficulty?: string;
  player_name?: string;
}

export interface GenerateStoryResponse {
  session_id: number;
  story_setup: string;
  genre: string;
}

export interface HumanGuessRequest {
  session_id: number;
  story_setup: string;
  hidden_twist: string;
  player_guess: string;
}

export interface HumanGuessResponse {
  score: number;
  justification: string;
  actual_twist: string;
  breakdown: {
    cosine_similarity: number;
    semantic_overlap: number;
    guess_length: number;
    actual_length: number;
  };
}

export interface LeaderboardEntry {
  player_name: string;
  mode: string;
  score: number;
  created_at: string;
}

export const apiClient = {
  // Mode 1: AI Guesses
  async getAiGuess(request: AiGuessRequest): Promise<AiGuessResponse> {
    const response = await api.post('/ai-guess', request);
    return response.data;
  },

  async scoreTwist(request: ScoreTwistRequest): Promise<ScoreTwistResponse> {
    const response = await api.post('/score-twist', request);
    return response.data;
  },

  // Mode 2: Human Guesses
  async generateStory(request: GenerateStoryRequest): Promise<GenerateStoryResponse> {
    const response = await api.post('/generate-story', request);
    return response.data;
  },

  async submitHumanGuess(request: HumanGuessRequest): Promise<HumanGuessResponse> {
    const response = await api.post('/human-guess', request);
    return response.data;
  },

  // Leaderboard
  async getLeaderboard(mode?: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    const params = new URLSearchParams();
    if (mode) params.append('mode', mode);
    params.append('limit', limit.toString());

    const response = await api.get(`/leaderboard?${params.toString()}`);
    return response.data.leaderboard;
  },
};
