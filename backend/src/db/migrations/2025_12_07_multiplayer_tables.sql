-- Multiplayer tables for challenge mode

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  creator_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  max_players INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  story_setup TEXT,
  hidden_twist TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Match participants
CREATE TABLE IF NOT EXISTS match_participants (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  guess TEXT,
  score DECIMAL(5,2),
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match rounds for detailed tracking
CREATE TABLE IF NOT EXISTS match_rounds (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  setup TEXT NOT NULL,
  twist TEXT NOT NULL,
  opponent_guess TEXT,
  score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_matches_room ON matches(room_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_match ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_rounds_match ON match_rounds(match_id);
