import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient, LeaderboardEntry } from '../services/api';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'all' | 'ai_guess' | 'human_guess'>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [mode]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getLeaderboard(
        mode === 'all' ? undefined : mode,
        20
      );
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModeDisplay = (entryMode: string) => {
    return entryMode === 'ai_guess' ? 'AI Guess' : 'Human Guess';
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
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
          <h1 className="text-5xl font-bold cyber-glow text-cyber-highlight mb-2">
            LEADERBOARD
          </h1>
          <p className="text-cyber-text">Top scores across all game modes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 flex gap-4"
        >
          <button
            onClick={() => setMode('all')}
            className={`px-6 py-2 rounded font-bold ${
              mode === 'all'
                ? 'cyber-button text-cyber-bg'
                : 'cyber-border bg-cyber-card text-cyber-accent'
            }`}
          >
            ALL MODES
          </button>
          <button
            onClick={() => setMode('ai_guess')}
            className={`px-6 py-2 rounded font-bold ${
              mode === 'ai_guess'
                ? 'cyber-button text-cyber-bg'
                : 'cyber-border bg-cyber-card text-cyber-accent'
            }`}
          >
            AI GUESS
          </button>
          <button
            onClick={() => setMode('human_guess')}
            className={`px-6 py-2 rounded font-bold ${
              mode === 'human_guess'
                ? 'cyber-button text-cyber-bg'
                : 'cyber-border bg-cyber-card text-cyber-accent'
            }`}
          >
            HUMAN GUESS
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-cyber-card cyber-border rounded-lg overflow-hidden"
        >
          {loading ? (
            <div className="p-8 text-center text-cyber-accent animate-pulse">
              Loading scores...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-cyber-text">
              No scores yet. Be the first to play!
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-cyber-bg">
                <tr>
                  <th className="px-6 py-4 text-left text-cyber-accent font-bold">RANK</th>
                  <th className="px-6 py-4 text-left text-cyber-accent font-bold">PLAYER</th>
                  <th className="px-6 py-4 text-left text-cyber-accent font-bold">MODE</th>
                  <th className="px-6 py-4 text-right text-cyber-accent font-bold">SCORE</th>
                  <th className="px-6 py-4 text-right text-cyber-accent font-bold">DATE</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-cyber-bg hover:bg-cyber-bg transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`font-bold ${
                          index === 0
                            ? 'text-cyber-highlight text-2xl'
                            : index === 1
                            ? 'text-cyber-accent text-xl'
                            : index === 2
                            ? 'text-cyber-secondary text-lg'
                            : 'text-cyber-text'
                        }`}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-cyber-text font-semibold">
                      {entry.player_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-sm bg-cyber-bg text-cyber-accent">
                        {getModeDisplay(entry.mode)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-2xl font-bold cyber-glow text-cyber-accent">
                        {parseFloat(entry.score.toString()).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-cyber-text text-sm">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </div>
    </div>
  );
}
