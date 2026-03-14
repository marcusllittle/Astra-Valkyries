import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { useWallet } from "../context/WalletContext";
import {
  creditsForGrade,
  gradeShmupRun,
  type ShmupRunResult,
} from "../lib/shmupResults";
import { astraReward } from "../lib/havnApi";

const GRADE_COLORS: Record<string, string> = {
  S: "#ffd43b",
  A: "#51cf66",
  B: "#339af0",
  C: "#ff922b",
  D: "#ff6b6b",
};

function formatTime(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ShmupResultsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addCredits } = useGame();
  const wallet = useWallet();
  const awardAppliedRef = useRef(false);
  const [sharedReward, setSharedReward] = useState<number | null>(null);
  const [rewardStatus, setRewardStatus] = useState<string | null>(null);
  const shmupResult = (location.state as { shmupResult?: ShmupRunResult } | undefined)?.shmupResult;
  const grade = shmupResult ? gradeShmupRun(shmupResult) : null;
  const creditsEarned = grade ? creditsForGrade(grade) : 0;

  const rewardKey = useMemo(() => {
    if (!shmupResult) return null;
    return [
      "shmup-reward",
      shmupResult.score,
      shmupResult.kills,
      shmupResult.timeSurvivedMs,
      shmupResult.bossDefeated ? 1 : 0,
      shmupResult.stage ?? 0,
      shmupResult.maxWeaponLevel ?? 0,
    ].join(":");
  }, [shmupResult]);

  // ── Local credits (always awarded) ──────────────────────
  useEffect(() => {
    if (!shmupResult || !rewardKey || awardAppliedRef.current) return;

    if (sessionStorage.getItem(rewardKey) === "1") {
      awardAppliedRef.current = true;
      return;
    }

    addCredits(creditsEarned);
    sessionStorage.setItem(rewardKey, "1");
    awardAppliedRef.current = true;
  }, [addCredits, creditsEarned, rewardKey, shmupResult]);

  // ── Shared credits reward (when wallet connected) ───────
  useEffect(() => {
    if (!shmupResult || !grade || !wallet.address || wallet.status !== "connected") return;
    if (sessionStorage.getItem(`${rewardKey}:shared`) === "1") return;

    const durationS = (shmupResult.timeSurvivedMs ?? 0) / 1000;
    const mapId = "shmup_arcade";

    astraReward(wallet.address, shmupResult.score, grade, durationS, mapId)
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
  }, [shmupResult, grade, wallet.address, wallet.status, rewardKey, wallet]);

  if (!shmupResult || !grade) {
    return (
      <div className="screen">
        <p>No shmup results to display.</p>
        <button className="btn" onClick={() => navigate("/")}>Home</button>
      </div>
    );
  }

  return (
    <div className="screen results-screen">
      <h2>Arcade Run Complete!</h2>

      <div
        className="grade-display"
        style={{ color: GRADE_COLORS[grade] }}
      >
        {grade}
      </div>

      <div className="results-grid">
        <div className="result-item">
          <span className="result-label">Score</span>
          <span className="result-value">{shmupResult.score.toLocaleString()}</span>
        </div>
        <div className="result-item">
          <span className="result-label">Kills</span>
          <span className="result-value">{shmupResult.kills}</span>
        </div>
        <div className="result-item">
          <span className="result-label">Time Survived</span>
          <span className="result-value">{formatTime(shmupResult.timeSurvivedMs)}</span>
        </div>
        <div className="result-item">
          <span className="result-label">Boss Defeated</span>
          <span className="result-value">{shmupResult.bossDefeated ? "Yes" : "No"}</span>
        </div>
        <div className="result-item">
          <span className="result-label">Stage</span>
          <span className="result-value">{shmupResult.stage ?? 1}</span>
        </div>
        <div className="result-item">
          <span className="result-label">Max Weapon</span>
          <span className="result-value">{shmupResult.maxWeaponLevel ?? 1}</span>
        </div>
      </div>

      <div className="credits-earned">
        <span className="credit-icon">✦</span> +{creditsEarned} Credits
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
        <button className="btn btn-primary" onClick={() => navigate("/shmup")}>
          Play Again
        </button>
        <button className="btn btn-secondary" onClick={() => navigate("/")}>
          Home
        </button>
      </div>
    </div>
  );
}
