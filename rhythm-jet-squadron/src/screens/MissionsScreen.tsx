import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getDailyMissions, getWeeklyMissions, checkMissionProgress } from "../lib/missions";

export default function MissionsScreen() {
  const navigate = useNavigate();
  const { save, claimMission } = useGame();

  const dailyMissions = getDailyMissions();
  const weeklyMissions = getWeeklyMissions();
  const allMissions = [...dailyMissions, ...weeklyMissions];
  const readyToClaim = allMissions.filter((mission) => {
    const rawProgress = save.missionProgress[mission.id] ?? 0;
    const { completed } = checkMissionProgress(mission, rawProgress);
    return completed && !save.missionsClaimed.includes(mission.id);
  }).length;

  const renderMission = (mission: ReturnType<typeof getDailyMissions>[0]) => {
    const rawProgress = save.missionProgress[mission.id] ?? 0;
    const { progress, completed: complete } = checkMissionProgress(mission, rawProgress);
    const claimed = save.missionsClaimed.includes(mission.id);
    const pct = Math.min(100, Math.round((progress / mission.target) * 100));
    const stateClass = claimed ? "mission-card--claimed" : complete ? "mission-card--complete" : "";

    return (
      <article key={mission.id} className={`mission-card ${stateClass}`.trim()}>
        <div className="mission-header">
          <div className="mission-title-block">
            <span className="mission-rotation">{mission.rotation}</span>
            <span className="mission-name">{mission.label}</span>
            <span className="mission-desc">{mission.description}</span>
          </div>
          {claimed && <span className="mission-badge mission-badge--claimed">CLAIMED</span>}
          {!claimed && complete && <span className="mission-badge mission-badge--complete">COMPLETE</span>}
        </div>

        <div className="mission-progress-meta">
          <span className="mission-progress-text">
            {progress} / {mission.target}
          </span>
          <span className="mission-progress-percent">{pct}%</span>
        </div>

        <div className="mission-progress-bar">
          <div className="mission-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="mission-reward">
          <span className="mission-reward-pill">
            <span className="credit-icon">✦</span> {mission.reward.credits} Credits
          </span>
          {mission.reward.xp > 0 && (
            <span className="mission-reward-pill mission-reward-pill--xp">+{mission.reward.xp} XP</span>
          )}
        </div>

        {complete && !claimed && (
          <button className="btn btn-primary btn-small mission-claim-btn" onClick={() => claimMission(mission.id)}>
            CLAIM
          </button>
        )}
      </article>
    );
  };

  return (
    <div className="screen missions-screen">
      <div className="missions-atmosphere" aria-hidden="true" />
      <div className="missions-key-art" aria-hidden="true" />

      <div className="missions-shell panel-surface">
        <header className="missions-command-bar">
          <div className="missions-command-stack">
            <button className="btn btn-back missions-back-btn" onClick={() => navigate(-1)}>
              ← BACK
            </button>

            <div className="missions-title-block">
              <span className="missions-kicker">Operations Board</span>
              <h1 className="missions-title">MISSIONS</h1>
              <p className="missions-subtitle">
                Premium sortie directives, rotating objectives, and claimable rewards for every successful operation.
              </p>
            </div>
          </div>

          <div className="missions-summary-grid">
            <div className="missions-summary-card">
              <span className="missions-summary-label">Daily Ops</span>
              <strong className="missions-summary-value">{dailyMissions.length}</strong>
              <span className="missions-summary-meta">Fresh directives online</span>
            </div>

            <div className="missions-summary-card">
              <span className="missions-summary-label">Weekly Ops</span>
              <strong className="missions-summary-value">{weeklyMissions.length}</strong>
              <span className="missions-summary-meta">Long-range campaign goals</span>
            </div>

            <div className="missions-summary-card">
              <span className="missions-summary-label">Ready To Claim</span>
              <strong className="missions-summary-value missions-summary-value-gold">{readyToClaim}</strong>
              <span className="missions-summary-meta">Rewards awaiting confirmation</span>
            </div>
          </div>
        </header>

        <div className="missions-panels">
          <section className="missions-section panel-surface">
            <div className="missions-section-head">
              <div>
                <span className="missions-section-kicker">Daily Rotation</span>
                <h2 className="missions-section-title">Daily Missions</h2>
              </div>
              <p className="missions-section-note">Short-cycle objectives built to keep the squadron sharp.</p>
            </div>

            <div className="missions-list">
              {dailyMissions.map(renderMission)}
            </div>
          </section>

          <section className="missions-section panel-surface">
            <div className="missions-section-head">
              <div>
                <span className="missions-section-kicker">Campaign Rotation</span>
                <h2 className="missions-section-title">Weekly Missions</h2>
              </div>
              <p className="missions-section-note">Longer-burn objectives with bigger payouts and higher stakes.</p>
            </div>

            <div className="missions-list">
              {weeklyMissions.map(renderMission)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
