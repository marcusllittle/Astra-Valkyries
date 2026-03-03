/**
 * Home Screen - Main menu with navigation buttons.
 */

import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { save } = useGame();

  return (
    <div className="screen home-screen">
      <div className="home-header">
        <h1 className="game-title">Astra Valkyries</h1>
        <p className="subtitle">Suit up. Lock in. Take flight.</p>
      </div>

      <div className="home-credits">
        <span className="credit-icon">✦</span> {save.credits} Credits
      </div>

      <nav className="home-buttons">
        <button className="btn btn-primary btn-large" onClick={() => navigate("/hangar")}>
          Play
        </button>
        <button className="btn btn-secondary" onClick={() => navigate("/collection")}>
          Collection
        </button>
        <button className="btn btn-secondary" onClick={() => navigate("/shop")}>
          Shop
        </button>
        <button className="btn btn-secondary" onClick={() => navigate("/settings")}>
          Settings
        </button>
      </nav>
    </div>
  );
}
