/** Mission system - daily and weekly challenges */

export interface MissionDef {
  id: string;
  label: string;
  description: string;
  target: number;
  type: "kills" | "score" | "runs" | "grade" | "boss_kills" | "no_damage_waves";
  reward: { credits: number; xp: number };
  rotation: "daily" | "weekly";
}

const DAILY_MISSION_POOL: MissionDef[] = [
  { id: "daily-kills-50", label: "Drone Hunter", description: "Destroy 50 enemies", target: 50, type: "kills", reward: { credits: 150, xp: 60 }, rotation: "daily" },
  { id: "daily-kills-100", label: "Ace Pilot", description: "Destroy 100 enemies", target: 100, type: "kills", reward: { credits: 275, xp: 120 }, rotation: "daily" },
  { id: "daily-score-10k", label: "Score Chaser", description: "Earn 10,000 points in a single run", target: 10000, type: "score", reward: { credits: 200, xp: 90 }, rotation: "daily" },
  { id: "daily-runs-3", label: "Sortie Veteran", description: "Complete 3 runs", target: 3, type: "runs", reward: { credits: 180, xp: 70 }, rotation: "daily" },
  { id: "daily-grade-a", label: "Precision Strike", description: "Achieve grade A or higher", target: 1, type: "grade", reward: { credits: 275, xp: 120 }, rotation: "daily" },
];

const WEEKLY_MISSION_POOL: MissionDef[] = [
  { id: "weekly-kills-500", label: "Exterminator", description: "Destroy 500 enemies", target: 500, type: "kills", reward: { credits: 700, xp: 325 }, rotation: "weekly" },
  { id: "weekly-boss-3", label: "Boss Slayer", description: "Defeat 3 bosses", target: 3, type: "boss_kills", reward: { credits: 800, xp: 425 }, rotation: "weekly" },
  { id: "weekly-score-50k", label: "High Scorer", description: "Earn a total of 50,000 points", target: 50000, type: "score", reward: { credits: 550, xp: 275 }, rotation: "weekly" },
  { id: "weekly-runs-10", label: "Marathon Pilot", description: "Complete 10 runs", target: 10, type: "runs", reward: { credits: 500, xp: 225 }, rotation: "weekly" },
  { id: "weekly-grade-s", label: "Perfect Operation", description: "Achieve grade S", target: 1, type: "grade", reward: { credits: 1000, xp: 550 }, rotation: "weekly" },
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
