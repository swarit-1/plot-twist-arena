import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { apiClient } from '../services/api';

export default function AiGuessMode() {
  const navigate = useNavigate();
  const { playerName, setSessionId, setScore } = useGameStore();

  const [storySetup, setStorySetup] = useState('');
  const [genre, setGenre] = useState('');
  const [actualTwist, setActualTwist] = useState('');
  const [predictions, setPredictions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [sessionId, setLocalSessionId] = useState<number | null>(null);

  const handleGetPredictions = async () => {
    if (!storySetup.trim() || !actualTwist.trim()) {
      alert('Please fill in both story setup and your twist!');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.getAiGuess({
        story_setup: storySetup,
        genre: genre || undefined,
        player_name: playerName || undefined,
        actual_twist: actualTwist,
      });

      setSessionId(response.session_id);
      setLocalSessionId(response.session_id);
      setPredictions(response.predictions);
    } catch (error) {
      console.error('Error getting AI predictions:', error);
      alert('Failed to get AI predictions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreTwist = async () => {
    if (selectedIndex === null || !sessionId) {
      alert('Please select a prediction!');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.scoreTwist({
        session_id: sessionId,
        actual_twist: actualTwist,
        selected_prediction: predictions[selectedIndex],
      });

      setScore(response.score);
      setScoreResult(response);
    } catch (error) {
      console.error('Error scoring twist:', error);
      alert('Failed to score twist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = () => {
    setStorySetup('');
    setGenre('');
    setActualTwist('');
    setPredictions([]);
    setSelectedIndex(null);
    setScoreResult(null);
    setLocalSessionId(null);
  };

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
          <h1 className="text-5xl font-bold cyber-glow text-cyber-accent mb-2">
            AI GUESSES YOUR TWIST
          </h1>
          <p className="text-cyber-text">Let the AI try to predict your plot twist!</p>
        </motion.div>

        {!scoreResult ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-cyber-card cyber-border p-6 rounded-lg mb-6"
            >
              <div className="mb-4">
                <label className="block text-cyber-accent font-semibold mb-2">
                  Story Genre (optional)
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-4 py-2 cyber-input rounded"
                  disabled={predictions.length > 0}
                >
                  <option value="">Select genre...</option>
                  <option value="mystery">Mystery</option>
                  <option value="thriller">Thriller</option>
                  <option value="sci-fi">Sci-Fi</option>
                  <option value="horror">Horror</option>
                  <option value="drama">Drama</option>
                  <option value="fantasy">Fantasy</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-cyber-accent font-semibold mb-2">
                  Story Setup
                </label>
                <textarea
                  value={storySetup}
                  onChange={(e) => setStorySetup(e.target.value)}
                  placeholder="Describe your story setup..."
                  className="w-full px-4 py-3 cyber-input rounded h-32 resize-none"
                  disabled={predictions.length > 0}
                />
              </div>

              <div className="mb-4">
                <label className="block text-cyber-accent font-semibold mb-2">
                  Your Intended Plot Twist
                </label>
                <textarea
                  value={actualTwist}
                  onChange={(e) => setActualTwist(e.target.value)}
                  placeholder="What's your plot twist?"
                  className="w-full px-4 py-3 cyber-input rounded h-24 resize-none"
                  disabled={predictions.length > 0}
                />
              </div>

              {predictions.length === 0 && (
                <button
                  onClick={handleGetPredictions}
                  disabled={loading}
                  className="w-full py-3 cyber-button text-cyber-bg font-bold rounded-lg text-lg"
                >
                  {loading ? 'AI IS THINKING...' : 'GET AI PREDICTIONS'}
                </button>
              )}
            </motion.div>

            {predictions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-cyber-card cyber-border p-6 rounded-lg"
              >
                <h2 className="text-2xl font-bold text-cyber-accent mb-4">
                  AI's Predictions:
                </h2>

                <div className="space-y-4 mb-6">
                  {predictions.map((prediction, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedIndex(index)}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        selectedIndex === index
                          ? 'cyber-border bg-cyber-bg'
                          : 'border-2 border-cyber-card bg-cyber-bg hover:border-cyber-accent'
                      }`}
                    >
                      <p className="text-cyber-text">
                        <span className="font-bold text-cyber-accent">#{index + 1}:</span>{' '}
                        {prediction}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleScoreTwist}
                  disabled={loading || selectedIndex === null}
                  className="w-full py-3 cyber-button text-cyber-bg font-bold rounded-lg text-lg disabled:opacity-50"
                >
                  {loading ? 'SCORING...' : 'SCORE THIS PREDICTION'}
                </button>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-cyber-card cyber-border p-8 rounded-lg text-center"
          >
            <h2 className="text-4xl font-bold text-cyber-highlight mb-4">SCORE</h2>
            <div className="text-8xl font-bold cyber-glow text-cyber-accent mb-6 animate-glow">
              {scoreResult.score.toFixed(1)}
            </div>
            <p className="text-xl text-cyber-text mb-6">{scoreResult.justification}</p>

            <div className="bg-cyber-bg p-4 rounded-lg mb-6">
              <p className="text-sm text-cyber-accent mb-2">YOUR TWIST:</p>
              <p className="text-cyber-text mb-4">{actualTwist}</p>
              <p className="text-sm text-cyber-accent mb-2">AI'S BEST GUESS:</p>
              <p className="text-cyber-text">{predictions[selectedIndex!]}</p>
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
                className="flex-1 py-3 cyber-border bg-cyber-bg text-cyber-accent font-bold rounded-lg"
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
