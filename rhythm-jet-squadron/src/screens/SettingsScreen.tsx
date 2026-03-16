/**
 * Settings Screen - Game settings, achievements, and account management.
 */

import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { syncVolumes } from "../lib/audioEngine";
import { ACHIEVEMENTS } from "../lib/achievements";
import { markTutorialSeen } from "../components/TutorialOverlay";

const CATEGORY_LABELS: Record<string, string> = {
  gameplay: "Gameplay",
  collection: "Collection",
  economy: "Economy",
  mastery: "Mastery",
};

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { save, updateSettings, resetSave, unlockedAchievements } = useGame();
  const { settings } = save;

  useEffect(() => {
    syncVolumes(settings.musicVolume, settings.sfxVolume);
  }, [settings.musicVolume, settings.sfxVolume]);

  const unlockedCount = Object.keys(unlockedAchievements).length;

  const groupedAchievements = useMemo(() => {
    const groups: Record<string, typeof ACHIEVEMENTS> = {};
    for (const a of ACHIEVEMENTS) {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    }
    return groups;
  }, []);

  return (
    <div className="screen settings-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <h2>Settings</h2>
      </div>

      {/* Audio & Display */}
      <section className="settings-section panel-surface">
        <h3>Audio &amp; Display</h3>
        <div className="settings-form">
          <div className="setting-row">
            <label>Music Volume</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.musicVolume * 100)}
              onChange={(e) =>
                updateSettings({ musicVolume: Number(e.target.value) / 100 })
              }
            />
            <span>{Math.round(settings.musicVolume * 100)}%</span>
          </div>

          <div className="setting-row">
            <label>SFX Volume</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) =>
                updateSettings({ sfxVolume: Number(e.target.value) / 100 })
              }
            />
            <span>{Math.round(settings.sfxVolume * 100)}%</span>
          </div>

          <div className="setting-row">
            <label>Show FPS</label>
            <input
              type="checkbox"
              checked={settings.showFPS}
              onChange={(e) => updateSettings({ showFPS: e.target.checked })}
            />
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="settings-section panel-surface">
        <h3>Controls</h3>
        <div className="settings-controls-grid">
          <div className="control-binding">
            <kbd>WASD / Arrows</kbd>
            <span>Move ship</span>
          </div>
          <div className="control-binding">
            <kbd>Shift</kbd>
            <span>Secondary weapon</span>
          </div>
          <div className="control-binding">
            <kbd>Escape</kbd>
            <span>Pause game</span>
          </div>
          <div className="control-binding">
            <kbd>Touch Pad</kbd>
            <span>Move (mobile)</span>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="settings-section panel-surface">
        <h3>Achievements ({unlockedCount}/{ACHIEVEMENTS.length})</h3>
        <div className="achievements-progress-bar">
          <div
            className="achievements-progress-fill"
            style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
          />
        </div>
        {Object.entries(groupedAchievements).map(([category, achievements]) => (
          <div key={category} className="achievement-category">
            <h4 className="achievement-category-title">{CATEGORY_LABELS[category] ?? category}</h4>
            <div className="achievement-list">
              {achievements.map((a) => {
                const unlocked = Boolean(unlockedAchievements[a.id]);
                return (
                  <div
                    key={a.id}
                    className={`achievement-item ${unlocked ? "achievement-unlocked" : "achievement-locked"}`}
                  >
                    <span className="achievement-icon">{unlocked ? a.icon : "?"}</span>
                    <div className="achievement-info">
                      <strong>{unlocked ? a.title : "???"}</strong>
                      <span>{unlocked ? a.description : "Keep playing to unlock"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Danger Zone */}
      <section className="settings-section settings-danger panel-surface">
        <h3>Data Management</h3>
        <div className="settings-danger-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              try { localStorage.removeItem("astra.tutorialSeen"); } catch { /* */ }
              markTutorialSeen(); // no-op but clear
              try { localStorage.removeItem("astra.tutorialSeen"); } catch { /* */ }
              alert("Tutorial will show again on your next game launch.");
            }}
          >
            Reset Tutorial
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm("Reset ALL save data? This cannot be undone.")) {
                resetSave();
              }
            }}
          >
            Reset All Save Data
          </button>
        </div>
      </section>
    </div>
  );
}
