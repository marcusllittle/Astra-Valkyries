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

  const formatTime = (timeMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

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
      <h2>{result.mode === "shmup" ? "Arcade Run Complete!" : "Track Complete!"}</h2>

      <div
        className="grade-display"
        style={{ color: GRADE_COLORS[result.grade] }}
      >
        {result.grade}
      </div>

      <div className="results-grid">
        {result.mode === "shmup" ? (
          <>
            <div className="result-item">
              <span className="result-label">Score</span>
              <span className="result-value">{result.score.toLocaleString()}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Kills</span>
              <span className="result-value">{result.kills}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Time Survived</span>
              <span className="result-value">{formatTime(result.timeSurvivedMs)}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Best Mult</span>
              <span className="result-value">{result.bestMultiplier.toFixed(2)}x</span>
            </div>
            <div className="result-item">
              <span className="result-label">Weapon Lv</span>
              <span className="result-value">{result.weaponLevel}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Hull Hits</span>
              <span className="result-value miss-count">{result.damageTaken}</span>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="credits-earned">
        <span className="credit-icon">✦</span> +{result.creditsEarned} Credits
      </div>

      <div className="results-buttons">
        <button
          className="btn btn-primary"
          onClick={() => navigate(result.mode === "shmup" ? "/shmup" : "/tracks")}
        >
          Play Again
        </button>
        <button className="btn btn-secondary" onClick={() => navigate("/")}>
          Home
        </button>
      </div>
    </div>
  );
}
