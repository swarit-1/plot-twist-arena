import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { modelClient } from '../services/model-client';
import { db } from '../db/client';

export const humanGuessRouter = Router();

const generateStorySchema = z.object({
  genre: z.string().optional(),
  difficulty: z.string().optional(),
  player_name: z.string().optional(),
});

const humanGuessSchema = z.object({
  session_id: z.number().int(),
  story_setup: z.string(),
  hidden_twist: z.string(),
  player_guess: z.string().min(5),
});

// Generate story for human to guess
humanGuessRouter.post('/generate-story', async (req: Request, res: Response) => {
  try {
    const { genre, difficulty, player_name } = generateStorySchema.parse(req.body);

    // Create game session
    const sessionResult = await db.query(
      'INSERT INTO game_sessions (mode, player_name) VALUES ($1, $2) RETURNING id',
      ['human_guess', player_name || 'Anonymous']
    );
    const sessionId = sessionResult.rows[0].id;

    // Generate story with hidden twist
    const story = await modelClient.generateStory({
      genre,
      difficulty: difficulty || 'medium',
    });

    res.json({
      session_id: sessionId,
      story_setup: story.story_setup,
      genre: story.genre,
      // Hidden twist is NOT sent to frontend
      _hidden_twist: story.hidden_twist, // For our reference only
    });
  } catch (error: any) {
    console.error('Generate story error:', error);
    res.status(400).json({ error: error.message || 'Failed to generate story' });
  }
});

// Submit human's guess and score it
humanGuessRouter.post('/human-guess', async (req: Request, res: Response) => {
  try {
    const { session_id, story_setup, hidden_twist, player_guess } = humanGuessSchema.parse(req.body);

    // Score the guess
    const scoreResult = await modelClient.scoreGuess({
      guess: player_guess,
      actual_twist: hidden_twist,
    });

    // Save result
    const resultInsert = await db.query(
      `INSERT INTO game_results (session_id, mode, story_setup, actual_twist, guessed_twist, score, justification)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        session_id,
        'human_guess',
        story_setup,
        hidden_twist,
        player_guess,
        scoreResult.score,
        scoreResult.justification,
      ]
    );

    const resultId = resultInsert.rows[0].id;

    // Get player name
    const sessionData = await db.query('SELECT player_name FROM game_sessions WHERE id = $1', [session_id]);
    const playerName = sessionData.rows[0]?.player_name || 'Anonymous';

    // Add to leaderboard
    await db.query(
      'INSERT INTO leaderboard (player_name, mode, score, game_result_id) VALUES ($1, $2, $3, $4)',
      [playerName, 'human_guess', scoreResult.score, resultId]
    );

    res.json({
      score: scoreResult.score,
      justification: scoreResult.justification,
      actual_twist: hidden_twist,
      breakdown: scoreResult.similarity_breakdown,
    });
  } catch (error: any) {
    console.error('Human guess error:', error);
    res.status(400).json({ error: error.message || 'Failed to score guess' });
  }
});
