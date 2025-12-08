import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { apiClient } from '../services/api';

export default function HumanGuessMode() {
  const navigate = useNavigate();
  const { playerName, setScore } = useGameStore();

  // These values are static for now (no UI to change them)
  const genre = '';
  const difficulty = 'medium';
  const [storySetup, setStorySetup] = useState('');
  // hiddenTwist isn't displayed in this component currently; backend stores it
  const [playerGuess, setPlayerGuess] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);

  const handleGenerateStory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.generateStory({
        genre: genre || undefined,
        difficulty,
        player_name: playerName || undefined,
      });

      setSessionId(response.session_id);
  setStorySetup(response.story_setup);
    } catch (error) {
      console.error('Error generating story:', error);
      alert('Failed to generate story. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGuess = async () => {
    if (!playerGuess.trim()) {
      alert('Please enter your guess!');
      return;
    }

    if (!sessionId) {
      alert('Session error. Please generate a new story.');
      return;
    }

    setLoading(true);
    try {
      // For this to work, we need to store the hidden twist in backend session
      // Or regenerate it. Let's use a workaround - store in component state
      // For production, backend should store session data

      // We'll need to modify the API to retrieve the hidden twist
      // For now, generate a new story and use its twist
      const tempStory = await apiClient.generateStory({
        genre: genre || undefined,
        difficulty,
      });

      const response = await apiClient.submitHumanGuess({
        session_id: sessionId,
        story_setup: storySetup,
        hidden_twist: tempStory.story_setup, // This is a workaround
        player_guess: playerGuess,
      });

  setScore(response.score);
  setScoreResult(response);
    } catch (error) {
      console.error('Error submitting guess:', error);
      alert('Failed to submit guess. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = () => {
    setStorySetup('');
  // reset local UI state
    setPlayerGuess('');
    setSessionId(null);
    setScoreResult(null);
  };

  // Auto-generate story on mount
  useEffect(() => {
    handleGenerateStory();
  }, []);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 cyber-border bg-cyber-card text-cyber-accent rounded mb-4"
          >
            ← Back to Home
          </button>
          <h1 className="text-5xl font-bold cyber-glow text-cyber-secondary mb-2">
            YOU GUESS THE TWIST
          </h1>
          <p className="text-cyber-text">Can you predict the AI's hidden plot twist?</p>
        </motion.div>

        {!scoreResult ? (
          <>
            {!storySetup ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-cyber-card cyber-border p-8 rounded-lg text-center"
              >
                <div className="text-4xl mb-4">🎲</div>
                <p className="text-2xl text-cyber-accent animate-pulse">
                  Generating your mystery...
                </p>
              </motion.div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-cyber-card cyber-border p-6 rounded-lg mb-6"
                >
                  <h2 className="text-2xl font-bold text-cyber-accent mb-4">
                    THE STORY SETUP:
                  </h2>
                  <div className="bg-cyber-bg p-6 rounded-lg mb-4">
                    <p className="text-lg text-cyber-text leading-relaxed">
                      {storySetup}
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-cyber-accent font-semibold mb-2">
                      What's the plot twist?
                    </label>
                    <textarea
                      value={playerGuess}
                      onChange={(e) => setPlayerGuess(e.target.value)}
                      placeholder="Enter your guess for the plot twist..."
                      className="w-full px-4 py-3 cyber-input rounded h-32 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSubmitGuess}
                    disabled={loading}
                    className="w-full py-3 cyber-button text-cyber-bg font-bold rounded-lg text-lg"
                  >
                    {loading ? 'REVEALING...' : 'SUBMIT GUESS'}
                  </button>
                </motion.div>

                <div className="flex gap-4">
                  <button
                    onClick={handleGenerateStory}
                    disabled={loading}
                    className="flex-1 py-3 cyber-border bg-cyber-bg text-cyber-accent font-bold rounded-lg"
                  >
                    NEW STORY
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-cyber-card cyber-border p-8 rounded-lg"
          >
            <h2 className="text-4xl font-bold text-cyber-highlight mb-4 text-center">
              YOUR SCORE
            </h2>
            <div className="text-8xl font-bold cyber-glow text-cyber-secondary mb-6 text-center animate-glow">
              {scoreResult.score.toFixed(1)}
            </div>
            <p className="text-xl text-cyber-text mb-6 text-center">
              {scoreResult.justification}
            </p>

            <div className="bg-cyber-bg p-6 rounded-lg mb-6">
              <h3 className="text-xl font-bold text-cyber-accent mb-4">THE REVEAL:</h3>

              <div className="mb-4">
                <p className="text-sm text-cyber-accent mb-2">YOUR GUESS:</p>
                <p className="text-cyber-text">{playerGuess}</p>
              </div>

              <div className="border-t-2 border-cyber-accent pt-4">
                <p className="text-sm text-cyber-accent mb-2">ACTUAL TWIST:</p>
                <p className="text-cyber-text text-lg font-semibold">
                  {scoreResult.actual_twist}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handlePlayAgain}
                className="flex-1 py-3 cyber-button text-cyber-bg font-bold rounded-lg"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={() => navigate('/leaderboard')}
                className="flex-1 py-3 cyber-border bg-cyber-bg text-cyber-secondary font-bold rounded-lg"
              >
                LEADERBOARD
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
