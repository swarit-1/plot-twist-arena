import { Pool, QueryResult } from 'pg';

class Database {
  private pool: Pool | null = null;

  async initialize() {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://plottwist:plottwist_dev@localhost:5432/plottwist';

    this.pool = new Pool({
      connectionString: databaseUrl,
    });

    // Test connection
    await this.pool.query('SELECT NOW()');

    // Create tables if they don't exist
    await this.createTables();
  }

  private async createTables() {
    if (!this.pool) throw new Error('Database not initialized');

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        mode VARCHAR(20) NOT NULL,
        player_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS game_results (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES game_sessions(id),
        mode VARCHAR(20) NOT NULL,
        story_setup TEXT NOT NULL,
        actual_twist TEXT NOT NULL,
        guessed_twist TEXT NOT NULL,
        score DECIMAL(5,2) NOT NULL,
        justification TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(100) NOT NULL,
        mode VARCHAR(20) NOT NULL,
        score DECIMAL(5,2) NOT NULL,
        game_result_id INTEGER REFERENCES game_results(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(mode, score DESC, created_at DESC)
    `);
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) throw new Error('Database not initialized');
    return this.pool.query(text, params);
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

export const db = new Database();
