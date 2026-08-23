import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import pilotsData from "../data/pilots.json";
import outfitsData from "../data/outfits.json";
import { useWallet } from "../context/WalletContext";
import {
  creditsForGrade,
  gradeShmupRun,
  type ShmupRunResult,
} from "../lib/shmupResults";
import { astraReward, generateRewardImage, type CampaignContribution } from "../lib/havnApi";
import { getDialogueForMap } from "../data/dialogues";
import DialogueBox from "../components/DialogueBox";
import CutinOverlay from "../components/CutinOverlay";
import { getShmupMapById } from "../lib/shmupWaves";
import { sfxRunGrade } from "../lib/retroSfx";
import { getPilotReturnClip, unseenCinematicClips } from "../lib/missionCinematics";

const GRADE_COLORS: Record<string, string> = {
  S: "#ffd43b",
  A: "#51cf66",
  B: "#339af0",
  C: "#ff922b",
  D: "#ff6b6b",
};

const DEBRIEF_BACKDROPS: Record<string, string> = {
  "nebula-runway": "/assets/cutins/scenes/nebula_runway_debrief.png",
  "solar-rift": "/assets/cutins/scenes/solar_rift_debrief.png",
  "abyss-crown": "/assets/cutins/scenes/abyss_crown_debrief.png",
};
const DEBRIEF_FALLBACK = "/assets/cutins/scenes/nebula_runway_debrief.png";

const DEBRIEF_NOTES: Record<string, { win: { label: string; accent: string }; loss: { label: string; accent: string } }> = {
  "nebula-runway": {
    win: { label: "Nebula corridor secured", accent: "#66d9ef" },
    loss: { label: "Corridor breach failed", accent: "#ff8787" },
  },
  "solar-rift": {
    win: { label: "Thermal front survived", accent: "#ff9f43" },
    loss: { label: "Solar pressure overwhelmed", accent: "#ff6b6b" },
  },
  "abyss-crown": {
    win: { label: "Void breach contained", accent: "#74c0fc" },
    loss: { label: "Void channel still unstable", accent: "#a5d8ff" },
  },
};

const LOSS_DEBRIEF_LINES = {
  "nebula-runway": {
    commandOpen: "Nebula Runway remains contested. The corridor never fully opened and convoy traffic is still pinned behind the line.",
    pilotLine: "We saw the opening, just didn't hold it long enough. That one's fixable.",
    commandClose: "Rearm, tighten the route, and hit the Dreadnought before the screen thickens again.",
  },
  "solar-rift": {
    commandOpen: "Solar Rift is still unstable. The Helios Tyrant kept control of the lane and the thermal wall is only getting meaner.",
    pilotLine: "Too much drift, not enough punishment. Fine. Next run we push first and make it react to us.",
    commandClose: "Maintain aggression, but clean up the exposure. This sector snowballs the moment you surrender tempo.",
  },
  "abyss-crown": {
    commandOpen: "Abyss Crown did not break. Signal clarity dropped out and the Leviathan still owns the descent channel.",
    pilotLine: "Not a dead end. Just incomplete data with teeth. I know more now than I did on entry.",
    commandClose: "Good. Use it. The next attempt needs cleaner positioning before the void closes around you again.",
  },
} as const;

function formatTime(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatMapName(mapId: string): string {
  return mapId.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ShmupResultsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addCredits, save, submitRunStats } = useGame();
  const wallet = useWallet();
  const isFirstRun = save.totalRuns <= 1;
  const awardAppliedRef = useRef(false);
  const [sharedReward, setSharedReward] = useState<number | null>(null);
  const [rewardStatus, setRewardStatus] = useState<string | null>(null);
  const [showDebrief, setShowDebrief] = useState(false);
  const [debriefLineIdx, setDebriefLineIdx] = useState(0);
  const [rankCutin, setRankCutin] = useState<string | null>(null);
  const [artQueued, setArtQueued] = useState(false);
  const [campaignContribution, setCampaignContribution] = useState<CampaignContribution | null>(null);

  const shmupResult = (location.state as { shmupResult?: ShmupRunResult } | undefined)?.shmupResult;
  const mapId = (location.state as { mapId?: string } | undefined)?.mapId;
  const runToken = (location.state as { runToken?: string | null } | undefined)?.runToken ?? null;
  const grade = shmupResult ? gradeShmupRun(shmupResult) : null;
  const creditsEarned = grade ? creditsForGrade(grade) : 0;
  const activeOutfit = outfitsData.find((o) => o.id === save.selectedOutfitId);

  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (!shmupResult) return;
    const target = shmupResult.score;
    const durationMs = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shmupResult]);

  const stingFiredRef = useRef(false);
  useEffect(() => {
    if (!grade || stingFiredRef.current) return;
    stingFiredRef.current = true;
    const id = window.setTimeout(() => sfxRunGrade(grade), 120);
    return () => window.clearTimeout(id);
  }, [grade]);

  // Fire the active outfit's cutin on S or A rank.
  const cutinFiredRef = useRef(false);
  useEffect(() => {
    if (!grade || cutinFiredRef.current || !activeOutfit?.cutinUrl) return;
    if (grade !== "S" && grade !== "A") return;
    cutinFiredRef.current = true;
    const delay = grade === "S" ? 380 : 820;
    const id = window.setTimeout(() => setRankCutin(activeOutfit.cutinUrl ?? null), delay);
    return () => window.clearTimeout(id);
  }, [grade, activeOutfit?.cutinUrl]);

  const didWinRun = Boolean(shmupResult?.bossDefeated);
  const debriefScript = didWinRun && mapId ? getDialogueForMap(mapId, "post_mission") : undefined;
  const debriefNode = debriefScript?.nodes.find((n) => n.id === debriefScript.startNodeId);
  const activePilot = pilotsData.find((pilot) => pilot.id === save.selectedPilotId);
  const lossTemplate = mapId ? LOSS_DEBRIEF_LINES[mapId as keyof typeof LOSS_DEBRIEF_LINES] : undefined;
  const debriefLines = didWinRun
    ? (debriefNode?.lines ?? [])
    : lossTemplate
      ? [
          { speaker: "Command", text: lossTemplate.commandOpen, position: "left" as const, mood: "serious" },
          { speaker: activePilot?.name ?? "Pilot", text: lossTemplate.pilotLine, position: "right" as const, mood: "neutral" },
          { speaker: "Command", text: lossTemplate.commandClose, position: "left" as const, mood: "serious" },
        ]
      : [];
  const debriefBackdrop = mapId ? DEBRIEF_BACKDROPS[mapId] : undefined;
  const activeMap = getShmupMapById(mapId);
  const debriefNote = mapId ? (didWinRun ? DEBRIEF_NOTES[mapId]?.win : DEBRIEF_NOTES[mapId]?.loss) : undefined;

  const handleReturnToPort = () => {
    const clips = unseenCinematicClips(
      [didWinRun ? getPilotReturnClip(save.selectedPilotId, mapId) : null],
      save.seenCutscenes,
    );
    if (clips.length > 0) {
      navigate("/video-cutscene", {
        state: { clips, returnTo: "/spaceport" },
      });
      return;
    }
    navigate("/spaceport");
  };

  const handleDebriefComplete = () => {
    if (didWinRun) {
      handleReturnToPort();
      return;
    }
    setShowDebrief(false);
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
    if (!shmupResult || !rewardKey || !grade || awardAppliedRef.current) return;
    if (sessionStorage.getItem(rewardKey) === "1") {
      awardAppliedRef.current = true;
      return;
    }
    addCredits(creditsEarned);
    // Progression rides the same guard as the credit award: one application
    // per run, surviving StrictMode double-invoke and a revisit via back.
    submitRunStats({
      pilotId: save.selectedPilotId ?? pilotsData[0].id,
      mapId: mapId ?? "nebula-runway",
      score: shmupResult.score,
      kills: shmupResult.kills,
      grade,
      bossDefeated: shmupResult.bossDefeated ?? false,
      flawlessWaves: shmupResult.flawlessWaves ?? 0,
    });
    sessionStorage.setItem(rewardKey, "1");
    awardAppliedRef.current = true;
  }, [addCredits, creditsEarned, rewardKey, shmupResult, grade, mapId, submitRunStats, save.selectedPilotId]);

  useEffect(() => {
    if (!shmupResult || !grade || !wallet.address || wallet.status !== "connected") return;
    if (sessionStorage.getItem(`${rewardKey}:shared`) === "1") return;
    // No run token means no server-side run was opened (no session at
    // launch); rendered as a derived hint below rather than state.
    if (!runToken) return;
    const durationS = (shmupResult.timeSurvivedMs ?? 0) / 1000;
    astraReward(wallet.address, shmupResult.score, grade, durationS, mapId ?? "unknown", runToken, wallet.sign)
      .then((res) => {
        if (res.ok && res.reward && res.reward > 0) {
          sessionStorage.setItem(`${rewardKey}:shared`, "1");
          setSharedReward(res.reward);
          setCampaignContribution(res.campaign_contribution ?? null);
          wallet.refreshBalance();
          // A 30-second preflight may already be rendering. The coordinator
          // binds it to this rewarded run and returns its job, avoiding a
          // duplicate post-results launch. Older coordinators use the fallback.
          if (res.run_id && save.selectedPilotId && save.selectedOutfitId && wallet.address) {
            if (res.artifact_job_id) {
              setArtQueued(true);
              return;
            }
            void generateRewardImage(
              wallet.address,
              res.run_id,
              save.selectedPilotId,
              save.selectedOutfitId,
              mapId ?? "nebula-runway",
              wallet.sign,
              save.preferredCreatorNodeId,
            ).then((gen) => {
              if (gen.ok) setArtQueued(true);
            });
          }
        } else if (!res.ok) {
          setRewardStatus(res.reason ?? "not_eligible");
          // The run token is single-use and burned on first submission, so
          // every server verdict is final for this run -- never resubmit.
          if (res.reason !== "session_required") {
            sessionStorage.setItem(`${rewardKey}:shared`, "1");
          }
        }
      })
      .catch(() => { setRewardStatus("network_error"); });
  }, [shmupResult, grade, wallet.address, wallet.status, rewardKey, wallet, runToken, mapId, save.selectedPilotId, save.selectedOutfitId, save.preferredCreatorNodeId]);

  if (showDebrief && debriefLines.length > 0 && debriefLineIdx < debriefLines.length) {
    return (
      <div className="briefing-screen-shell debrief-screen-shell">
        <div className="briefing-screen-atmosphere" aria-hidden="true" />
        <div className="briefing-screen-grid debrief-screen-grid">
          <section className="briefing-hero-panel debrief-hero-panel">
            <button className="btn btn-secondary briefing-skip-btn" onClick={handleDebriefComplete}>Skip</button>
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
                <img
                  className="briefing-art-image"
                  src={debriefBackdrop}
                  alt="Mission debrief art"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEBRIEF_FALLBACK; }}
                />
              ) : (
                <div className="briefing-art-placeholder">❆</div>
              )}
              <div className="briefing-stage-wash" />
            </div>
            <DialogueBox
              line={debriefLines[debriefLineIdx]}
              onNext={() => {
                if (debriefLineIdx < debriefLines.length - 1) {
                  setDebriefLineIdx((i) => i + 1);
                } else {
                  handleDebriefComplete();
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
      <div className="results-scene" aria-hidden="true">
        <img
          src={debriefBackdrop ?? DEBRIEF_FALLBACK}
          alt=""
          onError={(event) => { (event.target as HTMLImageElement).src = DEBRIEF_FALLBACK; }}
        />
      </div>
      <div className="results-atmosphere" aria-hidden="true" />

      <main className={`results-shell ${didWinRun ? "is-victory" : "is-defeat"}`}>
        <div className="results-grade-halo" style={{ color: GRADE_COLORS[grade] }} aria-hidden="true" />
        <header className="results-header">
          <span className="results-kicker">{didWinRun ? "Operation secured" : "Recovery required"}</span>
          <h1>{didWinRun ? "Mission Complete" : "Run Ended"}</h1>
          <span className="results-map-name">{activeMap?.name ?? formatMapName(mapId ?? "unknown sector")}</span>
        </header>

        <div
          className={`grade-display grade-stamp grade-stamp--${grade.toLowerCase()}`}
          style={{ color: GRADE_COLORS[grade] }}
        >
          {grade}
        </div>

        <p className="results-victory-copy">
          {didWinRun
            ? grade === "S"
              ? "Command-level sortie. The route belongs to the squadron."
              : "Sector control restored. There is still room to sharpen the flight."
            : (shmupResult.stage ?? 1) > 1
              ? "Deep push recorded. Rebuild around the pattern that ended it."
              : "Early loss recorded. Reset the route and take the opening cleanly."}
        </p>

        <section className="results-grid" aria-label="Run statistics">
          <div className="result-item"><span className="result-label">Score</span><span className="result-value">{displayScore.toLocaleString()}</span></div>
          <div className="result-item"><span className="result-label">Kills</span><span className="result-value">{shmupResult.kills}</span></div>
          <div className="result-item"><span className="result-label">Flight time</span><span className="result-value">{formatTime(shmupResult.timeSurvivedMs)}</span></div>
          <div className="result-item"><span className="result-label">Boss</span><span className="result-value">{shmupResult.bossDefeated ? "Destroyed" : "Active"}</span></div>
          <div className="result-item"><span className="result-label">Stage</span><span className="result-value">{shmupResult.stage ?? 1}</span></div>
          <div className="result-item"><span className="result-label">Max weapon</span><span className="result-value">{shmupResult.maxWeaponLevel ?? 1}</span></div>
          <div className="result-item result-item-flawless">
            <span className="result-label">Flawless routes</span>
            <span className="result-value">{shmupResult.flawlessWaves ?? 0}</span>
            <small>Best chain {shmupResult.bestFlawlessStreak ?? 0}</small>
          </div>
        </section>

        <section className="results-reward-strip" aria-label="Run rewards">
          <div className="credits-earned">+{creditsEarned} Credits</div>
          {sharedReward !== null && sharedReward > 0 ? (
            <div className="credits-earned credits-earned-shared">+{sharedReward} HavnAI Credits</div>
          ) : null}
        </section>

        <div className="results-status-stack">
          {artQueued ? <div className="reward-status-note reward-art-note">Victory artwork dispatched to the creator network</div> : null}
          {campaignContribution?.eligible && campaignContribution.combat_points > 0 ? (
            <div className="reward-status-note reward-campaign-note">Community front +{campaignContribution.combat_points} combat / {formatMapName(campaignContribution.target_map_id)}</div>
          ) : null}
          {wallet.status !== "connected" ? <div className="reward-status-note">Wallet rewards available when connected</div> : null}
          {wallet.status === "connected" && !runToken && !sharedReward ? <div className="reward-status-note">Reconnect before launch to earn HavnAI credits</div> : null}
          {rewardStatus ? (
            <div className="reward-status-note">
              {rewardStatus === "daily_cap_reached" && "Daily HavnAI earn cap reached"}
              {rewardStatus === "cooldown" && "HavnAI reward cooling down"}
              {rewardStatus === "score_too_low" && "Score below the HavnAI reward threshold"}
              {rewardStatus === "run_too_short" && "Run ended before the HavnAI reward threshold"}
              {rewardStatus === "duplicate_run" && "Run already settled"}
              {rewardStatus === "network_error" && "HavnAI coordinator unavailable"}
              {!['daily_cap_reached', 'cooldown', 'score_too_low', 'run_too_short', 'duplicate_run', 'network_error'].includes(rewardStatus) && `HavnAI: ${rewardStatus}`}
            </div>
          ) : null}
        </div>

        <div className="results-focus-pill">
          <span className="result-label">Next focus</span>
          <strong>{isFirstRun ? "Refine loadout" : (shmupResult.flawlessWaves ?? 0) === 0 ? "Hold a flawless route" : "Extend the clean-flight chain"}</strong>
        </div>

        <footer className="results-buttons">
          {debriefLines.length > 0 ? (
            <button className="btn btn-primary" onClick={() => { setDebriefLineIdx(0); setShowDebrief(true); }}>
              {didWinRun ? "Debrief & Return" : "Continue to Debrief"}
            </button>
          ) : null}
          <button className="btn btn-primary" onClick={() => navigate(isFirstRun ? "/hangar" : "/shmup")}>
            {isFirstRun ? "Open Loadout" : "Play Again"}
          </button>
          <button className="btn btn-secondary" onClick={handleReturnToPort}>Return to Port</button>
        </footer>
      </main>

      {rankCutin && (
        <CutinOverlay src={rankCutin} onComplete={() => setRankCutin(null)} allowPointerThrough />
      )}
    </div>
  );
}
