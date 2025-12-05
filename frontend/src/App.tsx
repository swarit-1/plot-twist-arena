import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AiGuessMode from './pages/AiGuessMode';
import HumanGuessMode from './pages/HumanGuessMode';
import Leaderboard from './pages/Leaderboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-cyber-bg">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ai-guess" element={<AiGuessMode />} />
          <Route path="/human-guess" element={<HumanGuessMode />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
