/**
 * PauseMenu — in-game pause overlay for the shmup mode.
 * Shows current run stats and lets the player resume, restart, or quit.
 */

interface PauseMenuProps {
  score: number;
  kills: number;
  timeMs: number;
  weaponLevel: number;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function PauseMenu({
  score,
  kills,
  timeMs,
  weaponLevel,
  onResume,
  onRestart,
  onQuit,
}: PauseMenuProps) {
  return (
    <div className="pause-overlay" onClick={onResume}>
      <div className="pause-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="pause-title">PAUSED</h2>

        <div className="pause-stats">
          <div className="pause-stat">
            <span className="pause-stat-label">Score</span>
            <span className="pause-stat-value">{score.toLocaleString()}</span>
          </div>
          <div className="pause-stat">
            <span className="pause-stat-label">Kills</span>
            <span className="pause-stat-value">{kills}</span>
          </div>
          <div className="pause-stat">
            <span className="pause-stat-label">Time</span>
            <span className="pause-stat-value">{formatTime(timeMs)}</span>
          </div>
          <div className="pause-stat">
            <span className="pause-stat-label">Weapon</span>
            <span className="pause-stat-value">Lv {weaponLevel}</span>
          </div>
        </div>

        <div className="pause-actions">
          <button className="btn btn-primary pause-btn" onClick={onResume}>
            Resume
          </button>
          <button className="btn btn-secondary pause-btn" onClick={onRestart}>
            Restart
          </button>
          <button className="btn btn-text pause-btn pause-quit" onClick={onQuit}>
            Quit to Menu
          </button>
        </div>

        <p className="pause-hint">Press Escape to resume</p>
      </div>
    </div>
  );
}
