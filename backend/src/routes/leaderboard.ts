import { Router, Request, Response } from 'express';
import { db } from '../db/client';

export const leaderboardRouter = Router();

// Get leaderboard
leaderboardRouter.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const mode = req.query.mode as string;
    const limit = parseInt(req.query.limit as string) || 10;

    let query = `
      SELECT
        player_name,
        mode,
        score,
        created_at
      FROM leaderboard
    `;

    const params: any[] = [];

    if (mode && (mode === 'ai_guess' || mode === 'human_guess')) {
      query += ' WHERE mode = $1';
      params.push(mode);
    }

    query += ' ORDER BY score DESC, created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await db.query(query, params);

    res.json({
      leaderboard: result.rows,
    });
  } catch (error: any) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Submit score (alternative endpoint)
leaderboardRouter.post('/submit-score', async (req: Request, res: Response) => {
  try {
    const { player_name, mode, score, game_result_id } = req.body;

    await db.query(
      'INSERT INTO leaderboard (player_name, mode, score, game_result_id) VALUES ($1, $2, $3, $4)',
      [player_name || 'Anonymous', mode, score, game_result_id]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Submit score error:', error);
    res.status(400).json({ error: 'Failed to submit score' });
  }
});
