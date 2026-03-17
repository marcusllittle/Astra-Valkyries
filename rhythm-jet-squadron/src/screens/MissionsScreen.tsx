import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getDailyMissions, getWeeklyMissions, checkMissionProgress } from "../lib/missions";

export default function MissionsScreen() {
  const navigate = useNavigate();
  const { save, claimMission } = useGame();

  const dailyMissions = getDailyMissions();
  const weeklyMissions = getWeeklyMissions();

  const renderMission = (mission: ReturnType<typeof getDailyMissions>[0]) => {
    const rawProgress = save.missionProgress[mission.id] ?? 0;
    const { progress, completed: complete } = checkMissionProgress(mission, rawProgress);
    const claimed = save.missionsClaimed.includes(mission.id);
    const pct = Math.min(100, Math.round((progress / mission.target) * 100));

    return (
      <div key={mission.id} className={`mission-card ${claimed ? "claimed" : complete ? "complete" : ""}`}>
        <div className="mission-header">
          <span className="mission-name">{mission.label}</span>
          {claimed && <span className="mission-badge claimed-badge">CLAIMED</span>}
          {!claimed && complete && <span className="mission-badge complete-badge">COMPLETE</span>}
        </div>
        <div className="mission-progress-bar">
          <div className="mission-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="mission-progress-text">
          {progress} / {mission.target}
        </div>
        <div className="mission-reward">
          <span className="credit-icon">✦</span> {mission.reward.credits}
          {mission.reward.xp > 0 && <span className="xp-reward"> +{mission.reward.xp} XP</span>}
        </div>
        {complete && !claimed && (
          <button className="btn btn-primary btn-sm" onClick={() => claimMission(mission.id)}>
            CLAIM
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="screen missions-screen">
      <header className="screen-header">
        <button className="btn btn-back" onClick={() => navigate(-1)}>← BACK</button>
        <h2>MISSIONS</h2>
      </header>

      <section className="missions-section">
        <h3 className="missions-section-title">DAILY MISSIONS</h3>
        <div className="missions-list">
          {dailyMissions.map(renderMission)}
        </div>
      </section>

      <section className="missions-section">
        <h3 className="missions-section-title">WEEKLY MISSIONS</h3>
        <div className="missions-list">
          {weeklyMissions.map(renderMission)}
        </div>
      </section>
    </div>
  );
}
