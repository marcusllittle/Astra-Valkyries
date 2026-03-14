/**
 * Results Screen - Show score breakdown after completing a rhythm track.
 * Submits shared economy reward when wallet is connected.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { astraReward } from "../lib/havnApi";
import type { RhythmGameResult, Track } from "../types";
import tracksData from "../data/tracks.json";

const tracks = tracksData as Track[];

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
  const wallet = useWallet();
  const result = location.state as RhythmGameResult | undefined;

  const [sharedReward, setSharedReward] = useState<number | null>(null);
  const [rewardStatus, setRewardStatus] = useState<string | null>(null);

  const rewardKey = useMemo(() => {
    if (!result) return null;
    return [
      "rhythm-reward",
      result.trackId,
      result.score,
      result.accuracy,
      result.maxCombo,
    ].join(":");
  }, [result]);

  // ── Shared credits reward (when wallet connected) ───────
  useEffect(() => {
    if (!result || !wallet.address || wallet.status !== "connected") return;
    if (!rewardKey || sessionStorage.getItem(`${rewardKey}:shared`) === "1") return;

    const track = tracks.find((t) => t.id === result.trackId);
    const durationS = track?.duration ?? 60;

    astraReward(wallet.address, result.score, result.grade, durationS, result.trackId)
      .then((res) => {
        sessionStorage.setItem(`${rewardKey}:shared`, "1");
        if (res.ok && res.reward && res.reward > 0) {
          setSharedReward(res.reward);
          wallet.refreshBalance();
        } else if (!res.ok) {
          setRewardStatus(res.reason ?? "not_eligible");
        }
      })
      .catch(() => {
        setRewardStatus("network_error");
      });
  }, [result, wallet.address, wallet.status, rewardKey, wallet]);

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

      {sharedReward !== null && sharedReward > 0 && (
        <div className="credits-earned credits-earned-shared">
          <span className="shared-icon">&#x26A1;</span> +{sharedReward} HavnAI Credits
        </div>
      )}
      {rewardStatus === "daily_cap_reached" && (
        <div className="reward-status-note">Daily HavnAI earn cap reached</div>
      )}
      {rewardStatus === "cooldown" && (
        <div className="reward-status-note">HavnAI reward on cooldown</div>
      )}

      <div className="results-buttons">
        <button
          className="btn btn-primary"
          onClick={() => navigate("/tracks")}
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
