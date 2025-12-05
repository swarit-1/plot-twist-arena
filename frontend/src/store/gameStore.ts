import { create } from 'zustand';

interface GameState {
  playerName: string;
  sessionId: number | null;
  currentMode: 'ai_guess' | 'human_guess' | null;
  score: number | null;
  storySetup: string;
  hiddenTwist: string;

  setPlayerName: (name: string) => void;
  setSessionId: (id: number) => void;
  setCurrentMode: (mode: 'ai_guess' | 'human_guess') => void;
  setScore: (score: number) => void;
  setStorySetup: (setup: string) => void;
  setHiddenTwist: (twist: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerName: '',
  sessionId: null,
  currentMode: null,
  score: null,
  storySetup: '',
  hiddenTwist: '',

  setPlayerName: (name) => set({ playerName: name }),
  setSessionId: (id) => set({ sessionId: id }),
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setScore: (score) => set({ score }),
  setStorySetup: (setup) => set({ storySetup: setup }),
  setHiddenTwist: (twist) => set({ hiddenTwist: twist }),
  resetGame: () => set({
    sessionId: null,
    score: null,
    storySetup: '',
    hiddenTwist: '',
  }),
}));
