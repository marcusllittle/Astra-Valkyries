/** Pilot XP and leveling system */

export const MAX_PILOT_LEVEL = 20;

// XP required to reach each level (cumulative thresholds)
const XP_TABLE: number[] = [
  0,      // level 1 (starting)
  100,    // level 2
  250,    // level 3
  500,    // level 4
  850,    // level 5
  1300,   // level 6
  1900,   // level 7
  2650,   // level 8
  3550,   // level 9
  4600,   // level 10
  5900,   // level 11
  7400,   // level 12
  9200,   // level 13
  11300,  // level 14
  13700,  // level 15
  16500,  // level 16
  19800,  // level 17
  23600,  // level 18
  28000,  // level 19
  33000,  // level 20
];

export function getLevelForXp(totalXp: number): number {
  for (let level = XP_TABLE.length - 1; level >= 0; level--) {
    if (totalXp >= XP_TABLE[level]) return level + 1;
  }
  return 1;
}

export function getXpForLevel(level: number): number {
  return XP_TABLE[Math.min(level - 1, XP_TABLE.length - 1)] ?? 0;
}

export function getXpToNextLevel(totalXp: number): { current: number; needed: number; progress: number } {
  const level = getLevelForXp(totalXp);
  if (level >= MAX_PILOT_LEVEL) return { current: 0, needed: 0, progress: 1 };
  const currentThreshold = XP_TABLE[level - 1];
  const nextThreshold = XP_TABLE[level];
  const current = totalXp - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  return { current, needed, progress: current / needed };
}

export interface LevelBonuses {
  damagePercent: number;    // % damage increase
  hpBonus: number;          // flat HP bonus
  overdriveRate: number;    // % overdrive gain increase
  scorePercent: number;     // % score increase
}

export function getLevelBonuses(level: number): LevelBonuses {
  return {
    damagePercent: (level - 1) * 1,        // +1% damage per level
    hpBonus: Math.floor(level / 5),        // +1 HP at level 5, 10, 15, 20
    overdriveRate: (level - 1) * 0.5,      // +0.5% overdrive gain per level
    scorePercent: (level - 1) * 0.5,       // +0.5% score per level
  };
}

/** Calculate XP earned from a run */
export function calculateRunXp(score: number, kills: number, grade: string, bossDefeated: boolean): number {
  let xp = Math.floor(score / 100); // base: 1 XP per 100 score
  xp += kills * 2;                  // 2 XP per kill
  // Grade bonus
  const gradeMultipliers: Record<string, number> = { S: 2.0, A: 1.5, B: 1.2, C: 1.0, D: 0.8 };
  xp = Math.floor(xp * (gradeMultipliers[grade] ?? 1.0));
  if (bossDefeated) xp += 200;      // Boss kill bonus
  return xp;
}

/** Zone unlock requirements */
export interface ZoneRequirement {
  mapId: string;
  requiredMapId: string;
  requiredGrade: string; // minimum grade needed on requiredMapId
}

export const ZONE_REQUIREMENTS: ZoneRequirement[] = [
  // Nebula Runway is always unlocked
  { mapId: "solar-rift", requiredMapId: "nebula-runway", requiredGrade: "B" },
  { mapId: "abyss-crown", requiredMapId: "solar-rift", requiredGrade: "B" },
];

export function isZoneUnlocked(mapId: string, completedMissions: Record<string, string>): boolean {
  const req = ZONE_REQUIREMENTS.find(r => r.mapId === mapId);
  if (!req) return true; // No requirement = always unlocked
  const achievedGrade = completedMissions[req.requiredMapId];
  if (!achievedGrade) return false;
  const gradeOrder = ["S", "A", "B", "C", "D"];
  const achievedIdx = gradeOrder.indexOf(achievedGrade);
  const requiredIdx = gradeOrder.indexOf(req.requiredGrade);
  return achievedIdx >= 0 && achievedIdx <= requiredIdx;
}
