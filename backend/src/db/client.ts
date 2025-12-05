import { Pool, QueryResult } from 'pg';

class Database {
  private pool: Pool | null = null;
  private useFallback: boolean = false;

  async initialize() {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://plottwist:plottwist_dev@localhost:5432/plottwist';

    try {
      this.pool = new Pool({
        connectionString: databaseUrl,
      });

      // Test connection
      await this.pool.query('SELECT NOW()');
      console.log('✓ Database connected successfully');

      // Create tables if they don't exist
      await this.createTables();
    } catch (error) {
      console.warn('⚠ PostgreSQL not available, using in-memory fallback');
      console.warn('Database features (leaderboard) will be limited.');
      console.warn('To enable full features, start PostgreSQL or use: docker run -d --name plottwist-db -e POSTGRES_DB=plottwist -e POSTGRES_USER=plottwist -e POSTGRES_PASSWORD=plottwist_dev -p 5432:5432 postgres:15-alpine');
      this.useFallback = true;
      // Don't throw - allow app to run without DB for testing
    }
  }

  private async createTables() {
    if (!this.pool || this.useFallback) return;

    try {

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

      console.log('✓ Database tables ready');
    } catch (error) {
      console.error('Error creating tables:', error);
    }
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    if (this.useFallback) {
      // Return mock data for fallback mode
      return {
        rows: [{ id: Math.floor(Math.random() * 10000) }],
        command: '',
        rowCount: 1,
        oid: 0,
        fields: []
      };
    }

    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    return this.pool.query(text, params);
  }

  isAvailable(): boolean {
    return !this.useFallback;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

export const db = new Database();
