-- Add JSONB breakdown column to game_results table
-- This stores detailed scoring information

ALTER TABLE game_results
ADD COLUMN IF NOT EXISTS score_breakdown JSONB;

-- Add index for JSON queries
CREATE INDEX IF NOT EXISTS idx_game_results_score_breakdown
ON game_results USING GIN (score_breakdown);

-- Comment
COMMENT ON COLUMN game_results.score_breakdown IS 'Detailed breakdown of scoring: semantic, lexical, tags, confidence';
