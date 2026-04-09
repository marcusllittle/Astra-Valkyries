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
import { getDialogueForMap } from "../data/dialogues";
import DialogueBox from "../components/DialogueBox";
import { getShmupMapById } from "../lib/shmupWaves";

const GRADE_COLORS: Record<string, string> = {
  S: "#ffd43b",
  A: "#51cf66",
  B: "#339af0",
  C: "#ff922b",
  D: "#ff6b6b",
};

const DEBRIEF_BACKDROPS: Record<string, string> = {
  "nebula-runway": "/assets/cutins/scenes/nebula_runway_debrief.png",
  "solar-rift": "/assets/cutins/scenes/solar_rift_briefing.png",
  "abyss-crown": "/assets/cutins/scenes/abyss_crown_briefing.png",
};

const DEBRIEF_NOTES: Record<string, { label: string; accent: string }> = {
  "nebula-runway": { label: "Nebula corridor secured", accent: "#66d9ef" },
  "solar-rift": { label: "Thermal front survived", accent: "#ff9f43" },
  "abyss-crown": { label: "Void breach contained", accent: "#74c0fc" },
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
  const { addCredits, save } = useGame();
  const wallet = useWallet();
  const isFirstRun = save.totalRuns <= 1;
  const awardAppliedRef = useRef(false);
  const [sharedReward, setSharedReward] = useState<number | null>(null);
  const [rewardStatus, setRewardStatus] = useState<string | null>(null);
  const [showDebrief, setShowDebrief] = useState(false);
  const [debriefLineIdx, setDebriefLineIdx] = useState(0);

  const shmupResult = (location.state as { shmupResult?: ShmupRunResult } | undefined)?.shmupResult;
  const mapId = (location.state as { mapId?: string } | undefined)?.mapId;
  const grade = shmupResult ? gradeShmupRun(shmupResult) : null;
  const creditsEarned = grade ? creditsForGrade(grade) : 0;

  const debriefScript = mapId ? getDialogueForMap(mapId, "post_mission") : undefined;
  const debriefNode = debriefScript?.nodes.find((n) => n.id === debriefScript.startNodeId);
  const debriefLines = debriefNode?.lines ?? [];
  const debriefBackdrop = mapId ? DEBRIEF_BACKDROPS[mapId] : undefined;
  const activeMap = getShmupMapById(mapId);
  const debriefNote = mapId ? DEBRIEF_NOTES[mapId] : undefined;

  const handleReturnToPort = () => {
    navigate("/spaceport");
  };

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

  useEffect(() => {
    if (!shmupResult || !grade || !wallet.address || wallet.status !== "connected") return;
    if (sessionStorage.getItem(`${rewardKey}:shared`) === "1") return;

    const durationS = (shmupResult.timeSurvivedMs ?? 0) / 1000;
    const mapId = "shmup_arcade";

    astraReward(wallet.address, shmupResult.score, grade, durationS, mapId)
      .then((res) => {
        if (res.ok && res.reward && res.reward > 0) {
          sessionStorage.setItem(`${rewardKey}:shared`, "1");
          setSharedReward(res.reward);
          wallet.refreshBalance();
        } else if (!res.ok) {
          setRewardStatus(res.reason ?? "not_eligible");
          if (res.reason === "duplicate_run" || res.reason === "daily_cap_reached") {
            sessionStorage.setItem(`${rewardKey}:shared`, "1");
          }
        }
      })
      .catch(() => {
        setRewardStatus("network_error");
      });
  }, [shmupResult, grade, wallet.address, wallet.status, rewardKey, wallet]);

  useEffect(() => {
    if (!debriefLines.length || !shmupResult) return;
    const timer = setTimeout(() => setShowDebrief(true), 900);
    return () => clearTimeout(timer);
  }, [debriefLines.length, shmupResult]);

  if (showDebrief && debriefLines.length > 0 && debriefLineIdx < debriefLines.length) {
    return (
      <div className="briefing-screen-shell debrief-screen-shell">
        <div className="briefing-screen-atmosphere" aria-hidden="true" />
        <div className="briefing-screen-grid debrief-screen-grid">
          <section className="briefing-hero-panel debrief-hero-panel">
            <button className="btn btn-secondary briefing-skip-btn" onClick={() => setShowDebrief(false)}>
              Skip
            </button>
            <div className="briefing-hero-copy">
              <span className="briefing-kicker">After Action Debrief</span>
              <h1 className="briefing-title">{activeMap?.name ?? mapId?.replace(/-/g, " ") ?? "Mission"}</h1>
              {activeMap?.debrief ? <p className="briefing-subtitle">{activeMap.debrief}</p> : null}
            </div>
            {debriefNote ? (
              <div className="briefing-map-note" style={{ borderColor: `${debriefNote.accent}44` }}>
                <span className="briefing-map-note-label">Status</span>
                <strong style={{ color: debriefNote.accent }}>{debriefNote.label}</strong>
              </div>
            ) : null}
          </section>

          <section className="briefing-dialogue-stage briefing-dialogue-stage-art debrief-dialogue-stage">
            <div className="briefing-stage-backdrop">
              {debriefBackdrop ? (
                <img className="briefing-art-image" src={debriefBackdrop} alt="Mission debrief art" />
              ) : (
                <div className="briefing-art-placeholder">✦</div>
              )}
              <div className="briefing-stage-wash" />
            </div>
            <DialogueBox
              line={debriefLines[debriefLineIdx]}
              onNext={() => {
                if (debriefLineIdx < debriefLines.length - 1) {
                  setDebriefLineIdx((i) => i + 1);
                } else {
                  setShowDebrief(false);
                }
              }}
            />
          </section>
        </div>
      </div>
    );
  }

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

      <div className="results-victory-copy">
        {grade === "S"
          ? "That was a command-level sortie."
          : grade === "A"
            ? "Strong clear, strong momentum."
            : grade === "B"
              ? "Solid run, room to sharpen the build."
              : "You cleared it. Tighten one thing and go again."}
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

      <div className="results-focus-pill">
        <span className="result-label">Next Focus</span>
        <strong>{isFirstRun ? "Refine loadout" : "Push a cleaner grade"}</strong>
      </div>
      {wallet.status !== "connected" && (
        <div className="reward-status-note">Wallet rewards available when connected</div>
      )}
      {rewardStatus && (
        <div className="reward-status-note">
          {rewardStatus === "daily_cap_reached" && "Daily HavnAI earn cap reached"}
          {rewardStatus === "cooldown" && "HavnAI reward on cooldown — wait and play again"}
          {rewardStatus === "score_too_low" && "Score below 5,000 — no HavnAI credits earned"}
          {rewardStatus === "run_too_short" && "Run too short — survive longer to earn credits"}
          {rewardStatus === "duplicate_run" && "Duplicate run detected"}
          {rewardStatus === "network_error" && "Could not reach HavnAI server — credits will sync next run"}
          {!['daily_cap_reached', 'cooldown', 'score_too_low', 'run_too_short', 'duplicate_run', 'network_error'].includes(rewardStatus) && `HavnAI: ${rewardStatus}`}
        </div>
      )}

      {isFirstRun ? (
        <div className="results-next-step-callout">
          <strong>Loadout updated.</strong> Choose your next route from the port.
        </div>
      ) : null}

      <div className="results-buttons">
        <button className="btn btn-primary" onClick={() => navigate(isFirstRun ? "/hangar" : "/shmup")}>
          {isFirstRun ? "Open Loadout" : "Play Again"}
        </button>
        <button className="btn btn-secondary" onClick={handleReturnToPort}>
          Return to Port
        </button>
      </div>
    </div>
  );
}
