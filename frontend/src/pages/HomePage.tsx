import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export default function HomePage() {
  const navigate = useNavigate();
  const { setPlayerName, setCurrentMode } = useGameStore();
  const [name, setName] = useState('');

  const handleModeSelect = (mode: 'ai_guess' | 'human_guess') => {
    if (name.trim()) {
      setPlayerName(name);
    }
    setCurrentMode(mode);
    navigate(mode === 'ai_guess' ? '/ai-guess' : '/human-guess');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <h1 className="text-7xl font-bold mb-4 cyber-glow text-cyber-accent animate-glow">
          PLOTTWIST ARENA
        </h1>
        <p className="text-xl mb-8 text-cyber-text">
          Battle AI in the ultimate plot twist showdown
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="w-full max-w-md mb-8"
      >
        <input
          type="text"
          placeholder="Enter your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 cyber-input text-cyber-text rounded-lg"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-8"
      >
        <div
          onClick={() => handleModeSelect('ai_guess')}
          className="cyber-border bg-cyber-card p-8 rounded-lg cursor-pointer hover:scale-105 transition-transform"
        >
          <h2 className="text-3xl font-bold text-cyber-accent mb-4">MODE 1</h2>
          <h3 className="text-2xl font-semibold mb-3">AI Guesses Your Twist</h3>
          <p className="text-cyber-text mb-4">
            You provide a story setup and think of a plot twist.
          </p>
          <p className="text-cyber-text mb-4">
            The AI tries to predict your twist.
          </p>
          <p className="text-cyber-text">
            Score based on how close it gets!
          </p>
        </div>

        <div
          onClick={() => handleModeSelect('human_guess')}
          className="cyber-border bg-cyber-card p-8 rounded-lg cursor-pointer hover:scale-105 transition-transform"
        >
          <h2 className="text-3xl font-bold text-cyber-secondary mb-4">MODE 2</h2>
          <h3 className="text-2xl font-semibold mb-3">You Guess AI's Twist</h3>
          <p className="text-cyber-text mb-4">
            The AI generates a mysterious story setup.
          </p>
          <p className="text-cyber-text mb-4">
            You try to guess the hidden plot twist.
          </p>
          <p className="text-cyber-text">
            Reveal the twist and see your score!
          </p>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        onClick={() => navigate('/leaderboard')}
        className="px-8 py-3 cyber-button text-cyber-bg font-bold rounded-lg text-lg"
      >
        VIEW LEADERBOARD
      </motion.button>
    </div>
  );
}
