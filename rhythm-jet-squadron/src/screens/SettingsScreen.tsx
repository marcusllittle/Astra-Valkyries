/**
 * Settings Screen - Adjust game settings and reset save data.
 */

import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { save, updateSettings, resetSave } = useGame();
  const { settings } = save;

  return (
    <div className="screen settings-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <h2>Settings</h2>
      </div>

      <div className="settings-form">
        <div className="setting-row">
          <label>Note Speed</label>
          <input
            type="range"
            min={200}
            max={800}
            step={50}
            value={settings.noteSpeed}
            onChange={(e) =>
              updateSettings({ noteSpeed: Number(e.target.value) })
            }
          />
          <span>{settings.noteSpeed} px/s</span>
        </div>

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

      <div className="settings-danger">
        <h3>Danger Zone</h3>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm("Reset ALL save data? This cannot be undone.")) {
              resetSave();
            }
          }}
        >
          Reset Save Data
        </button>
      </div>
    </div>
  );
}
