/**
 * Play Screen - Canvas-based rhythm gameplay with 3 lanes.
 *
 * Notes scroll down from the top toward a hit line near the bottom.
 * Player presses A/S/D (or taps on-screen buttons) to hit notes.
 *
 * Supports pause/resume via Esc or the pause button.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import CutinOverlay from "../components/CutinOverlay";
import { SongClock, getJudgment } from "../lib/timing";
import { ScoreTracker } from "../lib/scoring";
import { getEffectivePerkValue } from "../lib/gacha";
import type { Track, BeatNote, Pilot, Outfit, GameResult, HitJudgment } from "../types";
import tracksData from "../data/tracks.json";
import pilotsData from "../data/pilots.json";
import outfitsData from "../data/outfits.json";

// ─── Visual constants ────────────────────────────────────

const LANE_COLORS = ["#ff6b6b", "#51cf66", "#339af0"];
const LANE_KEYS = ["A", "S", "D"];
const HIT_LINE_Y_RATIO = 0.85; // hit line at 85% of canvas height
const NOTE_RADIUS = 20;
const MISS_WINDOW_MS = 150; // notes missed this far past hit line

// Judgment flash colors
const JUDGMENT_COLORS: Record<HitJudgment, string> = {
  Perfect: "#ffd43b",
  Good: "#51cf66",
  Miss: "#ff6b6b",
};

interface ActiveNote extends BeatNote {
  id: number;
  hit: boolean;
  missed: boolean;
}

export default function PlayScreen() {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const { save, submitResult } = useGame();

  // Refs for the game loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef(new SongClock());
  const scorerRef = useRef(new ScoreTracker());
  const animFrameRef = useRef(0);
  const notesRef = useRef<ActiveNote[]>([]);
  const nextNoteIndexRef = useRef(0);
  const judgmentRef = useRef<{ text: string; color: string; time: number } | null>(null);
  const songEndedRef = useRef(false);
  const resultRef = useRef<GameResult | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feverActive, setFeverActive] = useState(false);
  const [feverMeter, setFeverMeter] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [activeCutin, setActiveCutin] = useState<{
    id: number;
    url: string;
    allowPointerThrough: boolean;
  } | null>(null);

  // Find track
  const track = (tracksData as Track[]).find((t) => t.id === trackId);

  // Get pilot/outfit perks
  const pilot = (pilotsData as Pilot[]).find((p) => p.id === save.selectedPilotId);
  const outfit = (outfitsData as Outfit[]).find((o) => o.id === save.selectedOutfitId);
  const ownedOutfit = save.ownedOutfits.find((o) => o.outfitId === save.selectedOutfitId);

  const noteSpeed = save.settings.noteSpeed;

  // ─── Initialize scorer with perks ─────────────────────

  useEffect(() => {
    const scorer = scorerRef.current;
    if (pilot) {
      if (pilot.perk.type === "comboBonus") scorer.comboScoreBonus = pilot.perk.value;
      if (pilot.perk.type === "feverDuration") scorer.feverDurationBonus = pilot.perk.value;
    }
    if (outfit && ownedOutfit) {
      const val = getEffectivePerkValue(outfit, ownedOutfit.stars);
      switch (outfit.perk.type) {
        case "scoreFlat": scorer.scoreFlatBonus = val; break;
        case "scoreMult": scorer.scoreMultBonus = val; break;
        case "comboBonus": scorer.comboScoreBonus += val; break;
        case "feverRate": scorer.feverRateBonus = val; break;
        case "feverDuration": scorer.feverDurationBonus += val; break;
        case "comboShield": scorer.comboShields = val; break;
      }
    }
  }, [pilot, outfit, ownedOutfit]);

  // ─── Countdown then start ─────────────────────────────

  useEffect(() => {
    if (!track) return;

    let timer: ReturnType<typeof setTimeout>;
    let count = 3;

    const tick = () => {
      count--;
      if (count > 0) {
        setCountdown(count);
        timer = setTimeout(tick, 1000);
      } else {
        setCountdown(null);
        // Start the clock and game loop
        clockRef.current.start();
        startGameLoop();
      }
    };

    timer = setTimeout(tick, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  // ─── Hit detection ────────────────────────────────────

  const perfectBonus =
    (pilot?.perk.type === "perfectWindow" ? pilot.perk.value : 0) +
    (outfit?.perk.type === "perfectWindow" && ownedOutfit
      ? getEffectivePerkValue(outfit, ownedOutfit.stars)
      : 0);

  const handleLaneHit = useCallback(
    (lane: number) => {
      if (clockRef.current.isPaused || songEndedRef.current) return;

      const elapsed = clockRef.current.elapsed;
      const notes = notesRef.current;
      const scorer = scorerRef.current;

      // Find nearest unhit note in this lane within the Good window
      let bestNote: ActiveNote | null = null;
      let bestDelta = Infinity;

      for (const note of notes) {
        if (note.hit || note.missed || note.lane !== lane) continue;
        const delta = elapsed - note.t;
        if (Math.abs(delta) < Math.abs(bestDelta) && Math.abs(delta) <= 150) {
          bestDelta = delta;
          bestNote = note;
        }
      }

      if (!bestNote) return;

      const judgment = getJudgment(bestDelta, perfectBonus);
      bestNote.hit = true;
      scorer.registerHit(judgment, elapsed);

      // Auto-activate fever when ready
      if (scorer.feverReady) {
        scorer.activateFever(elapsed);

        const feverCutinUrl =
          pilot?.feverCutinUrl ??
          pilot?.cutinUrl ??
          outfit?.cutinUrl;

        if (feverCutinUrl) {
          setActiveCutin({
            id: Date.now(),
            url: feverCutinUrl,
            allowPointerThrough: true,
          });
        }
      }

      // Show judgment flash
      judgmentRef.current = {
        text: judgment,
        color: JUDGMENT_COLORS[judgment],
        time: elapsed,
      };

      // Update React state for HUD
      setScore(scorer.score);
      setCombo(scorer.combo);
      setFeverActive(scorer.feverActive);
      setFeverMeter(scorer.feverMeter);
    },
    [perfectBonus, pilot, outfit]
  );

  // ─── Keyboard input ──────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.key === "Escape") {
        togglePause();
        return;
      }

      const key = e.key.toLowerCase();
      const laneIndex = ["a", "s", "d"].indexOf(key);
      if (laneIndex >= 0) handleLaneHit(laneIndex);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleLaneHit]);

  // ─── Pause/resume ─────────────────────────────────────

  const togglePause = useCallback(() => {
    const clock = clockRef.current;
    if (!clock.isRunning) return;

    if (clock.isPaused) {
      clock.resume();
      setIsPaused(false);
      startGameLoop();
    } else {
      clock.pause();
      setIsPaused(true);
      cancelAnimationFrame(animFrameRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Game loop ────────────────────────────────────────

  const startGameLoop = useCallback(() => {
    if (!track) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const beatmap = track.beatmap as BeatNote[];
    const durationMs = track.duration * 1000;
    const laneWidth = canvas.width / 3;
    const hitLineY = canvas.height * HIT_LINE_Y_RATIO;

    // Time (in ms) for a note to travel from top to hit line
    const travelTime = (hitLineY / noteSpeed) * 1000;

    const loop = () => {
      const clock = clockRef.current;
      if (!clock.isRunning || clock.isPaused) return;

      const elapsed = clock.elapsed;
      const scorer = scorerRef.current;

      // ── Spawn notes that are about to appear ──
      while (
        nextNoteIndexRef.current < beatmap.length &&
        beatmap[nextNoteIndexRef.current].t <= elapsed + travelTime
      ) {
        const raw = beatmap[nextNoteIndexRef.current];
        notesRef.current.push({
          ...raw,
          id: nextNoteIndexRef.current,
          hit: false,
          missed: false,
        });
        nextNoteIndexRef.current++;
      }

      // ── Check for missed notes ──
      for (const note of notesRef.current) {
        if (!note.hit && !note.missed && elapsed - note.t > MISS_WINDOW_MS) {
          note.missed = true;
          scorer.registerMissedNote();
          judgmentRef.current = {
            text: "Miss",
            color: JUDGMENT_COLORS.Miss,
            time: elapsed,
          };
          setScore(scorer.score);
          setCombo(scorer.combo);
          setFeverMeter(scorer.feverMeter);
        }
      }

      // ── Check fever expiry ──
      if (scorer.feverActive && elapsed >= scorer.feverEndTime) {
        scorer.feverActive = false;
        setFeverActive(false);
      }

      // ── Prune off-screen notes ──
      notesRef.current = notesRef.current.filter(
        (n) => !n.hit && !n.missed || elapsed - n.t < 500
      );

      // ── Draw ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      if (scorer.feverActive) {
        ctx.fillStyle = "rgba(255, 200, 0, 0.08)";
      } else {
        ctx.fillStyle = "#0a0a1a";
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Lane dividers
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, 0);
        ctx.lineTo(i * laneWidth, canvas.height);
        ctx.stroke();
      }

      // Hit line
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, hitLineY);
      ctx.lineTo(canvas.width, hitLineY);
      ctx.stroke();

      // Lane labels at hit line
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < 3; i++) {
        ctx.fillText(LANE_KEYS[i], (i + 0.5) * laneWidth, hitLineY + 24);
      }

      // Draw notes
      for (const note of notesRef.current) {
        if (note.hit || note.missed) continue;

        // Y position: note starts above canvas and scrolls down to hit line
        const timeDelta = note.t - elapsed;
        const y = hitLineY - (timeDelta / 1000) * noteSpeed;
        const x = (note.lane + 0.5) * laneWidth;

        if (y < -NOTE_RADIUS || y > canvas.height + NOTE_RADIUS) continue;

        // Note circle
        ctx.beginPath();
        ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = LANE_COLORS[note.lane];
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // ── Judgment flash ──
      const jdg = judgmentRef.current;
      if (jdg && elapsed - jdg.time < 400) {
        const alpha = 1 - (elapsed - jdg.time) / 400;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = jdg.color;
        ctx.fillText(jdg.text, canvas.width / 2, hitLineY - 50);
        ctx.restore();
      }

      // ── Fever banner ──
      if (scorer.feverActive) {
        ctx.save();
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd43b";
        ctx.shadowColor = "#ffd43b";
        ctx.shadowBlur = 20;
        ctx.fillText("✦ FEVER ✦", canvas.width / 2, 40);
        ctx.restore();
      }

      // ── Song end check ──
      if (elapsed >= durationMs && !songEndedRef.current) {
        songEndedRef.current = true;
        clock.stop();
        const result = scorer.buildResult(track.id);
        resultRef.current = result;
        submitResult(result);
        // Navigate to results after a short delay
        setTimeout(() => {
          navigate("/results", { state: result });
        }, 500);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, noteSpeed, navigate, submitResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clockRef.current.stop();
    };
  }, []);

  // ─── Canvas resize ────────────────────────────────────

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.min(window.innerWidth, 480);
      canvas.height = Math.min(window.innerHeight - 120, 700);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── Render ───────────────────────────────────────────

  if (!track) {
    return (
      <div className="screen">
        <p>Track not found.</p>
        <button className="btn" onClick={() => navigate("/tracks")}>Back</button>
      </div>
    );
  }

  return (
    <div className="screen play-screen">
      {/* HUD */}
      <div className="play-hud">
        <div className="hud-left">
          <div className="hud-score">{score.toLocaleString()}</div>
          <div className="hud-combo">
            {combo > 0 && <span className="combo-text">{combo}x combo</span>}
          </div>
        </div>
        <div className="hud-center">
          <div className="hud-track-title">{track.title}</div>
        </div>
        <div className="hud-right">
          <button className="btn btn-small" onClick={togglePause}>
            {isPaused ? "▶" : "⏸"}
          </button>
        </div>
      </div>

      {/* Fever meter bar */}
      <div className="fever-bar-container">
        <div
          className={`fever-bar ${feverActive ? "fever-active" : ""}`}
          style={{ width: `${feverActive ? 100 : feverMeter}%` }}
        />
        <span className="fever-label">
          {feverActive ? "FEVER!" : `Fever ${Math.round(feverMeter)}%`}
        </span>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="play-canvas" />

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdown}</div>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && (
        <div className="pause-overlay">
          <div className="pause-menu">
            <h2>Paused</h2>
            <button className="btn btn-primary" onClick={togglePause}>
              Resume
            </button>
            <button className="btn btn-secondary" onClick={() => navigate("/tracks")}>
              Quit
            </button>
          </div>
        </div>
      )}

      {activeCutin && (
        <CutinOverlay
          key={activeCutin.id}
          src={activeCutin.url}
          allowPointerThrough={activeCutin.allowPointerThrough}
          onComplete={() => setActiveCutin(null)}
        />
      )}

      {/* Mobile on-screen buttons */}
      <div className="mobile-buttons">
        {[0, 1, 2].map((lane) => (
          <button
            key={lane}
            className="mobile-lane-btn"
            style={{ backgroundColor: LANE_COLORS[lane] }}
            onTouchStart={(e) => {
              e.preventDefault();
              handleLaneHit(lane);
            }}
            onMouseDown={() => handleLaneHit(lane)}
          >
            {LANE_KEYS[lane]}
          </button>
        ))}
      </div>
    </div>
  );
}
