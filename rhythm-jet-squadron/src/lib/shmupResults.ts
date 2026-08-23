export type ShmupRunResult = {
  score: number;
  kills: number;
  timeSurvivedMs: number;
  bossDefeated?: boolean;
  stage?: number;
  maxWeaponLevel?: number;
  flawlessWaves?: number;
  bestFlawlessStreak?: number;
  grazes?: number;
  bestGrazeChain?: number;
  bestMultiplier?: number;
  bestKillStreak?: number;
  damageTaken?: number;
};

export type ShmupGrade = "S" | "A" | "B" | "C" | "D";

export type ShmupRankBreakdown = {
  rating: number;
  grade: ShmupGrade;
  nextGrade: Exclude<ShmupGrade, "D"> | null;
  pointsToNextGrade: number;
  categories: {
    score: number;
    survival: number;
    kills: number;
    flawless: number;
    multiplier: number;
    grazes: number;
    cleanFlight: number;
    bossClear: number;
  };
  commendations: string[];
};

const GRADE_THRESHOLDS: Record<Exclude<ShmupGrade, "D">, number> = {
  S: 88,
  A: 70,
  B: 52,
  C: 30,
};

function finiteNonNegative(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}

function boundedPoints(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

function gradeForRating(rating: number, bossDefeated: boolean): ShmupGrade {
  if (bossDefeated && rating >= GRADE_THRESHOLDS.S) return "S";
  if (rating >= GRADE_THRESHOLDS.A) return "A";
  if (rating >= GRADE_THRESHOLDS.B) return "B";
  if (rating >= GRADE_THRESHOLDS.C) return "C";
  return "D";
}

export function evaluateShmupRun(result: ShmupRunResult): ShmupRankBreakdown {
  const score = finiteNonNegative(result.score);
  const timeSurvivedMs = finiteNonNegative(result.timeSurvivedMs);
  const kills = finiteNonNegative(result.kills);
  const flawlessWaves = finiteNonNegative(result.flawlessWaves);
  const bestMultiplier = Math.max(1, finiteNonNegative(result.bestMultiplier));
  const grazes = finiteNonNegative(result.grazes);
  const bestGrazeChain = finiteNonNegative(result.bestGrazeChain);
  const bestKillStreak = finiteNonNegative(result.bestKillStreak);
  const damageTaken = finiteNonNegative(result.damageTaken);
  const bossDefeated = Boolean(result.bossDefeated);
  const categories = {
    score: boundedPoints(score / 2_500, 30),
    survival: boundedPoints(timeSurvivedMs / 6_000, 15),
    kills: boundedPoints(kills / 8, 10),
    flawless: boundedPoints(flawlessWaves * 2.5, 10),
    multiplier: boundedPoints((bestMultiplier - 1) * 5, 10),
    grazes: boundedPoints(grazes / 8, 5),
    cleanFlight: boundedPoints(10 * (1 - damageTaken / 6), 10),
    bossClear: bossDefeated ? 10 : 0,
  };
  const rawRating = Object.values(categories).reduce((sum, points) => sum + points, 0);
  const clearAdjustedRating = bossDefeated ? Math.max(rawRating, GRADE_THRESHOLDS.B) : rawRating;
  const cappedRating = bossDefeated ? clearAdjustedRating : Math.min(clearAdjustedRating, GRADE_THRESHOLDS.S - 1);
  const rating = Math.floor(boundedPoints(cappedRating, 100));
  const grade = gradeForRating(rating, bossDefeated);
  const nextGradeByGrade: Record<ShmupGrade, Exclude<ShmupGrade, "D"> | null> = {
    S: null,
    A: "S",
    B: "A",
    C: "B",
    D: "C",
  };
  const nextGrade = nextGradeByGrade[grade];
  const pointsToNextGrade = nextGrade
    ? Math.max(0, GRADE_THRESHOLDS[nextGrade] - rating)
    : 0;
  const commendations: string[] = [];
  if (bossDefeated) commendations.push("Sector Breaker");
  if (damageTaken === 0 && timeSurvivedMs >= 30_000) commendations.push("Untouchable");
  if (flawlessWaves >= 3) commendations.push("Route Keeper");
  if (grazes >= 25 && bestGrazeChain >= 8) commendations.push("Edge Dancer");
  if (bestMultiplier >= 2.5 && bestKillStreak >= 15) commendations.push("Combo Ace");
  if (finiteNonNegative(result.maxWeaponLevel) >= 6) commendations.push("Full Arsenal");

  return {
    rating,
    grade,
    nextGrade,
    pointsToNextGrade,
    categories,
    commendations: commendations.slice(0, 4),
  };
}

export function gradeShmupRun(result: ShmupRunResult): "S" | "A" | "B" | "C" | "D" {
  return evaluateShmupRun(result).grade;
}

export function creditsForGrade(grade: ShmupGrade): number {
  switch (grade) {
    case "S":
      return 300;
    case "A":
      return 200;
    case "B":
      return 150;
    case "C":
      return 100;
    case "D":
    default:
      return 50;
  }
}
