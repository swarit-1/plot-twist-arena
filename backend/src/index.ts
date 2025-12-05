import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aiGuessRouter } from './routes/ai-guess';
import { humanGuessRouter } from './routes/human-guess';
import { leaderboardRouter } from './routes/leaderboard';
import { db } from './db/client';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', aiGuessRouter);
app.use('/api', humanGuessRouter);
app.use('/api', leaderboardRouter);

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await db.initialize();
    console.log('Database initialized');

    app.listen(port, () => {
      console.log(`Backend server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
