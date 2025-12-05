import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { modelClient } from '../services/model-client';
import { db } from '../db/client';

export const aiGuessRouter = Router();

const aiGuessSchema = z.object({
  story_setup: z.string().min(10),
  genre: z.string().optional(),
  player_name: z.string().optional(),
  actual_twist: z.string().min(5),
  selected_prediction_index: z.number().int().min(0).optional(),
});

const scoreTwistSchema = z.object({
  session_id: z.number().int(),
  actual_twist: z.string().min(5),
  selected_prediction: z.string().min(5),
});

// AI guesses the twist - get predictions
aiGuessRouter.post('/ai-guess', async (req: Request, res: Response) => {
  try {
    const { story_setup, genre, player_name } = aiGuessSchema.parse(req.body);

    // Create game session
    const sessionResult = await db.query(
      'INSERT INTO game_sessions (mode, player_name) VALUES ($1, $2) RETURNING id',
      ['ai_guess', player_name || 'Anonymous']
    );
    const sessionId = sessionResult.rows[0].id;

    // Get AI predictions
    const predictions = await modelClient.predictTwist({
      story_setup,
      genre,
      num_predictions: 3,
    });

    res.json({
      session_id: sessionId,
      predictions: predictions.predictions,
      confidence_scores: predictions.confidence_scores,
    });
  } catch (error: any) {
    console.error('AI guess error:', error);
    res.status(400).json({ error: error.message || 'Failed to get AI predictions' });
  }
});

// Score the AI's guess
aiGuessRouter.post('/score-twist', async (req: Request, res: Response) => {
  try {
    const { session_id, actual_twist, selected_prediction } = scoreTwistSchema.parse(req.body);

    // Get semantic score
    const scoreResult = await modelClient.scoreGuess({
      guess: selected_prediction,
      actual_twist: actual_twist,
    });

    // Save result
    const resultInsert = await db.query(
      `INSERT INTO game_results (session_id, mode, story_setup, actual_twist, guessed_twist, score, justification)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        session_id,
        'ai_guess',
        '', // We don't have setup here, could pass it from frontend
        actual_twist,
        selected_prediction,
        scoreResult.score,
        scoreResult.justification,
      ]
    );

    const resultId = resultInsert.rows[0].id;

    // Get player name for leaderboard
    const sessionData = await db.query('SELECT player_name FROM game_sessions WHERE id = $1', [session_id]);
    const playerName = sessionData.rows[0]?.player_name || 'Anonymous';

    // Add to leaderboard
    await db.query(
      'INSERT INTO leaderboard (player_name, mode, score, game_result_id) VALUES ($1, $2, $3, $4)',
      [playerName, 'ai_guess', scoreResult.score, resultId]
    );

    res.json({
      score: scoreResult.score,
      justification: scoreResult.justification,
      breakdown: scoreResult.similarity_breakdown,
    });
  } catch (error: any) {
    console.error('Score twist error:', error);
    res.status(400).json({ error: error.message || 'Failed to score twist' });
  }
});
