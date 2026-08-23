/** Mission system - daily and weekly challenges */

export interface MissionDef {
  id: string;
  label: string;
  description: string;
  target: number;
  type: "kills" | "score" | "runs" | "grade" | "boss_kills" | "no_damage_waves";
  reward: { credits: number; xp: number };
  rotation: "daily" | "weekly";
  /** For `grade` missions: the minimum grade that counts as a completion. */
  gradeTarget?: "S" | "A" | "B" | "C" | "D";
}

/** Best-to-worst. Index order is the comparison order used everywhere. */
export const GRADE_ORDER = ["S", "A", "B", "C", "D"] as const;

/** True when `grade` is at least as good as `minimum`. */
export function gradeMeets(grade: string, minimum: string): boolean {
  const got = GRADE_ORDER.indexOf(grade as (typeof GRADE_ORDER)[number]);
  const need = GRADE_ORDER.indexOf(minimum as (typeof GRADE_ORDER)[number]);
  if (got < 0 || need < 0) return false;
  return got <= need;
}

const DAILY_MISSION_POOL: MissionDef[] = [
  { id: "daily-kills-50", label: "Drone Hunter", description: "Destroy 50 enemies", target: 50, type: "kills", reward: { credits: 100, xp: 50 }, rotation: "daily" },
  { id: "daily-kills-100", label: "Ace Pilot", description: "Destroy 100 enemies", target: 100, type: "kills", reward: { credits: 200, xp: 100 }, rotation: "daily" },
  { id: "daily-score-10k", label: "Score Chaser", description: "Earn 10,000 points in a single run", target: 10000, type: "score", reward: { credits: 150, xp: 75 }, rotation: "daily" },
  { id: "daily-runs-3", label: "Sortie Veteran", description: "Complete 3 runs", target: 3, type: "runs", reward: { credits: 120, xp: 60 }, rotation: "daily" },
  { id: "daily-grade-a", label: "Precision Strike", description: "Achieve grade A or higher", target: 1, type: "grade", gradeTarget: "A", reward: { credits: 200, xp: 100 }, rotation: "daily" },
  { id: "daily-flawless-3", label: "Clean Formation", description: "Complete 3 flawless routes", target: 3, type: "no_damage_waves", reward: { credits: 180, xp: 90 }, rotation: "daily" },
];

const WEEKLY_MISSION_POOL: MissionDef[] = [
  { id: "weekly-kills-500", label: "Exterminator", description: "Destroy 500 enemies", target: 500, type: "kills", reward: { credits: 500, xp: 300 }, rotation: "weekly" },
  { id: "weekly-boss-3", label: "Boss Slayer", description: "Defeat 3 bosses", target: 3, type: "boss_kills", reward: { credits: 600, xp: 400 }, rotation: "weekly" },
  { id: "weekly-score-50k", label: "High Scorer", description: "Earn a total of 50,000 points", target: 50000, type: "score", reward: { credits: 400, xp: 250 }, rotation: "weekly" },
  { id: "weekly-runs-10", label: "Marathon Pilot", description: "Complete 10 runs", target: 10, type: "runs", reward: { credits: 350, xp: 200 }, rotation: "weekly" },
  { id: "weekly-grade-s", label: "Perfect Operation", description: "Achieve grade S", target: 1, type: "grade", gradeTarget: "S", reward: { credits: 800, xp: 500 }, rotation: "weekly" },
  { id: "weekly-flawless-20", label: "Untouchable Wing", description: "Complete 20 flawless routes", target: 20, type: "no_damage_waves", reward: { credits: 700, xp: 450 }, rotation: "weekly" },
];

/** Seeded random for deterministic daily/weekly selection */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function getDayNumber(): number {
  return Math.floor(Date.now() / (24 * 60 * 60 * 1000));
}

function getWeekNumber(): number {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

export function getDailyMissions(): MissionDef[] {
  const rng = seededRandom(getDayNumber() * 31337);
  const shuffled = [...DAILY_MISSION_POOL].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3);
}

export function getWeeklyMissions(): MissionDef[] {
  const rng = seededRandom(getWeekNumber() * 42069);
  const shuffled = [...WEEKLY_MISSION_POOL].sort(() => rng() - 0.5);
  return shuffled.slice(0, 2);
}

export interface MissionProgress {
  missionId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export function checkMissionProgress(
  mission: MissionDef,
  currentProgress: number,
): { progress: number; completed: boolean } {
  const clamped = Math.min(currentProgress, mission.target);
  return { progress: clamped, completed: clamped >= mission.target };
}

/** What a finished run contributes to mission progress. */
export interface RunSummary {
  score: number;
  kills: number;
  grade: string;
  bossDefeated: boolean;
  flawlessWaves?: number;
}

/**
 * Advance one mission by a completed run.
 *
 * Cumulative types (kills, runs, boss_kills) add up across runs. `score`
 * is deliberately split: dailies read "in a single run" so they take the
 * best single result, weeklies read "a total of" so they accumulate.
 * `grade` missions are pass/fail against `gradeTarget` and latch once hit,
 * so a later worse run cannot undo them.
 *
 * Returns the new progress value, clamped to the mission target.
 */
export function advanceMissionProgress(
  mission: MissionDef,
  currentProgress: number,
  run: RunSummary,
): number {
  const current = currentProgress ?? 0;
  let next = current;

  switch (mission.type) {
    case "kills":
      next = current + run.kills;
      break;
    case "runs":
      next = current + 1;
      break;
    case "boss_kills":
      next = current + (run.bossDefeated ? 1 : 0);
      break;
    case "score":
      next = mission.rotation === "weekly"
        ? current + run.score
        : Math.max(current, run.score);
      break;
    case "grade":
      next = gradeMeets(run.grade, mission.gradeTarget ?? "S")
        ? Math.max(current, mission.target)
        : current;
      break;
    case "no_damage_waves":
      next = current + Math.max(0, Math.trunc(run.flawlessWaves ?? 0));
      break;
  }

  return Math.min(next, mission.target);
}
