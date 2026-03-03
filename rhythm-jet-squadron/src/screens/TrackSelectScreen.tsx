/**
 * Track Select Screen - Pick from 3 demo tracks to play.
 */

import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import type { Track } from "../types";
import tracksData from "../data/tracks.json";

export default function TrackSelectScreen() {
  const navigate = useNavigate();
  const { save } = useGame();
  const tracks = tracksData as Track[];

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="screen track-select-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/hangar")}>← Back</button>
        <h2>Select Track</h2>
      </div>

      <div className="track-list">
        {tracks.map((track) => {
          const highScore = save.highScores[track.id] ?? 0;
          return (
            <div
              key={track.id}
              className="track-card"
              onClick={() => navigate(`/play/${track.id}`)}
            >
              <div className="track-info">
                <h3>{track.title}</h3>
                <p className="track-artist">{track.artist}</p>
                <div className="track-meta">
                  <span className={`difficulty difficulty-${track.difficulty.toLowerCase()}`}>
                    {track.difficulty}
                  </span>
                  <span>{track.bpm} BPM</span>
                  <span>{formatDuration(track.duration)}</span>
                  <span>{track.beatmap.length} notes</span>
                </div>
                {highScore > 0 && (
                  <div className="track-high-score">
                    Best: {highScore.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="track-play-arrow">▶</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
