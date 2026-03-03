/**
 * Results Screen - Show score breakdown after completing a track.
 */

import { useLocation, useNavigate } from "react-router-dom";
import type { GameResult } from "../types";

const GRADE_COLORS: Record<string, string> = {
  S: "#ffd43b",
  A: "#51cf66",
  B: "#339af0",
  C: "#ff922b",
  D: "#ff6b6b",
};

export default function ResultsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state as GameResult | undefined;

  if (!result) {
    return (
      <div className="screen">
        <p>No results to display.</p>
        <button className="btn" onClick={() => navigate("/")}>Home</button>
      </div>
    );
  }

  return (
    <div className="screen results-screen">
      <h2>Track Complete!</h2>

      <div
        className="grade-display"
        style={{ color: GRADE_COLORS[result.grade] }}
      >
        {result.grade}
      </div>

      <div className="results-grid">
        <div className="result-item">
          <span className="result-label">Score</span>
          <span className="result-value">{result.score.toLocaleString()}</span>
        </div>
        <div className="result-item">
          <span className="result-label">Accuracy</span>
          <span className="result-value">{result.accuracy}%</span>
        </div>
        <div className="result-item">
          <span className="result-label">Max Combo</span>
          <span className="result-value">{result.maxCombo}x</span>
        </div>
        <div className="result-item">
          <span className="result-label">Perfect</span>
          <span className="result-value perfect-count">{result.perfects}</span>
        </div>
        <div className="result-item">
          <span className="result-label">Good</span>
          <span className="result-value good-count">{result.goods}</span>
        </div>
        <div className="result-item">
          <span className="result-label">Miss</span>
          <span className="result-value miss-count">{result.misses}</span>
        </div>
      </div>

      <div className="credits-earned">
        <span className="credit-icon">✦</span> +{result.creditsEarned} Credits
      </div>

      <div className="results-buttons">
        <button className="btn btn-primary" onClick={() => navigate("/tracks")}>
          Play Again
        </button>
        <button className="btn btn-secondary" onClick={() => navigate("/")}>
          Home
        </button>
      </div>
    </div>
  );
}
