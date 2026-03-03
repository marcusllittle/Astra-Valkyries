/**
 * Timing engine for the rhythm game.
 * Uses performance.now() for high-resolution timing.
 */

export class SongClock {
  private startTime: number = 0;
  private pauseTime: number = 0;
  private totalPausedDuration: number = 0;
  private _isPaused: boolean = false;
  private _isRunning: boolean = false;

  /** Start or restart the clock */
  start(): void {
    this.startTime = performance.now();
    this.totalPausedDuration = 0;
    this.pauseTime = 0;
    this._isPaused = false;
    this._isRunning = true;
  }

  /** Pause the clock */
  pause(): void {
    if (!this._isRunning || this._isPaused) return;
    this.pauseTime = performance.now();
    this._isPaused = true;
  }

  /** Resume from pause */
  resume(): void {
    if (!this._isPaused) return;
    this.totalPausedDuration += performance.now() - this.pauseTime;
    this._isPaused = false;
  }

  /** Get current elapsed time in milliseconds */
  get elapsed(): number {
    if (!this._isRunning) return 0;
    if (this._isPaused) {
      return this.pauseTime - this.startTime - this.totalPausedDuration;
    }
    return performance.now() - this.startTime - this.totalPausedDuration;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  stop(): void {
    this._isRunning = false;
    this._isPaused = false;
  }
}

// ─── Timing windows (in ms) ────────────────────────────

/** Base timing windows; can be modified by pilot/outfit perks */
export const BASE_PERFECT_WINDOW = 50;  // ±50ms
export const BASE_GOOD_WINDOW = 120;    // ±120ms

export function getJudgment(
  deltaMs: number,
  perfectBonus: number = 0
): "Perfect" | "Good" | "Miss" {
  const absDelta = Math.abs(deltaMs);
  if (absDelta <= BASE_PERFECT_WINDOW + perfectBonus) return "Perfect";
  if (absDelta <= BASE_GOOD_WINDOW) return "Good";
  return "Miss";
}
