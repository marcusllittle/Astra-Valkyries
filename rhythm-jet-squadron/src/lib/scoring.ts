/**
 * Scoring, combo, fever, and grade calculation.
 */

import type { HitJudgment, GameResult } from "../types";

// ─── Score values ───────────────────────────────────────

const SCORE_PERFECT = 100;
const SCORE_GOOD = 60;
const SCORE_MISS = 0;

// Combo multiplier: 1 + floor(combo / 20) * 0.1, capped at 2.0
function comboMultiplier(combo: number): number {
  return Math.min(2.0, 1 + Math.floor(combo / 20) * 0.1);
}

// ─── Grade thresholds (by accuracy %) ──────────────────

function calculateGrade(accuracy: number): "S" | "A" | "B" | "C" | "D" {
  if (accuracy >= 95) return "S";
  if (accuracy >= 85) return "A";
  if (accuracy >= 70) return "B";
  if (accuracy >= 50) return "C";
  return "D";
}

// Credits earned per grade
const GRADE_CREDITS: Record<string, number> = {
  S: 300,
  A: 200,
  B: 150,
  C: 100,
  D: 50,
};

// ─── Fever meter ────────────────────────────────────────

const FEVER_MAX = 100;
const FEVER_PERFECT_GAIN = 8;
const FEVER_GOOD_GAIN = 4;
const FEVER_DURATION = 10_000; // 10 seconds base
const FEVER_SCORE_MULT = 1.5;

// ─── Score tracker class ────────────────────────────────

export class ScoreTracker {
  score: number = 0;
  combo: number = 0;
  maxCombo: number = 0;
  perfects: number = 0;
  goods: number = 0;
  misses: number = 0;
  totalNotes: number = 0;
  feverMeter: number = 0;       // 0-100
  feverActive: boolean = false;
  feverEndTime: number = 0;     // ms timestamp when fever ends

  // Perk modifiers (set before gameplay)
  scoreFlatBonus: number = 0;
  scoreMultBonus: number = 0;   // percentage
  comboScoreBonus: number = 0;  // percentage
  feverRateBonus: number = 0;   // percentage
  feverDurationBonus: number = 0; // extra seconds
  comboShields: number = 0;     // remaining shields

  /** Register a hit judgment */
  registerHit(judgment: HitJudgment, currentTime: number): number {
    this.totalNotes++;
    let baseScore = 0;

    switch (judgment) {
      case "Perfect":
        baseScore = SCORE_PERFECT;
        this.perfects++;
        this.combo++;
        this.fillFever(FEVER_PERFECT_GAIN);
        break;
      case "Good":
        baseScore = SCORE_GOOD;
        this.goods++;
        this.combo++;
        this.fillFever(FEVER_GOOD_GAIN);
        break;
      case "Miss":
        this.misses++;
        if (this.comboShields > 0) {
          this.comboShields--;
          // Don't break combo
        } else {
          this.combo = 0;
        }
        this.totalNotes; // already incremented
        return 0;
    }

    this.maxCombo = Math.max(this.maxCombo, this.combo);

    // Calculate score with multipliers
    let multiplier = comboMultiplier(this.combo);
    multiplier *= 1 + this.scoreMultBonus / 100;
    multiplier *= 1 + this.comboScoreBonus / 100 * (this.combo > 0 ? 1 : 0);

    if (this.feverActive && currentTime < this.feverEndTime) {
      multiplier *= FEVER_SCORE_MULT;
    } else if (this.feverActive && currentTime >= this.feverEndTime) {
      this.feverActive = false;
    }

    const points = Math.round((baseScore + this.scoreFlatBonus) * multiplier);
    this.score += points;
    return points;
  }

  /** Fill fever meter */
  private fillFever(amount: number): void {
    if (this.feverActive) return; // Don't fill during active fever
    const boostedAmount = amount * (1 + this.feverRateBonus / 100);
    this.feverMeter = Math.min(FEVER_MAX, this.feverMeter + boostedAmount);
  }

  /** Check if fever is ready to trigger */
  get feverReady(): boolean {
    return this.feverMeter >= FEVER_MAX && !this.feverActive;
  }

  /** Activate fever mode */
  activateFever(currentTime: number): void {
    if (!this.feverReady) return;
    this.feverActive = true;
    this.feverMeter = 0;
    const durationMs = (FEVER_DURATION + this.feverDurationBonus * 1000);
    this.feverEndTime = currentTime + durationMs;
  }

  /** Register a missed note (scrolled past hit line) */
  registerMissedNote(): void {
    this.totalNotes++;
    this.misses++;
    if (this.comboShields > 0) {
      this.comboShields--;
    } else {
      this.combo = 0;
    }
  }

  /** Get accuracy percentage */
  get accuracy(): number {
    if (this.totalNotes === 0) return 100;
    // Perfect = 100%, Good = 60%, Miss = 0%
    const weighted = this.perfects * 100 + this.goods * 60;
    return Math.round((weighted / (this.totalNotes * 100)) * 10000) / 100;
  }

  /** Build final result */
  buildResult(trackId: string): GameResult {
    const grade = calculateGrade(this.accuracy);
    return {
      trackId,
      score: this.score,
      maxCombo: this.maxCombo,
      perfects: this.perfects,
      goods: this.goods,
      misses: this.misses,
      totalNotes: this.totalNotes,
      accuracy: this.accuracy,
      grade,
      creditsEarned: GRADE_CREDITS[grade],
    };
  }
}
