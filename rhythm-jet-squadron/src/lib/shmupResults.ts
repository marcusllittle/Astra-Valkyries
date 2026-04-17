export type ShmupRunResult = {
  score: number;
  kills: number;
  timeSurvivedMs: number;
  bossDefeated?: boolean;
  stage?: number;
  maxWeaponLevel?: number;
};

export function gradeShmupRun(result: ShmupRunResult): "S" | "A" | "B" | "C" | "D" {
  if (result.bossDefeated) return "S";

  // Time-based grade
  let timeGrade: number;
  if (result.timeSurvivedMs >= 180_000) timeGrade = 4;      // A
  else if (result.timeSurvivedMs >= 120_000) timeGrade = 3;  // B
  else if (result.timeSurvivedMs >= 60_000) timeGrade = 2;   // C
  else timeGrade = 1;                                         // D

  // Score-based grade
  let scoreGrade: number;
  if (result.score >= 100_000) scoreGrade = 4;      // A
  else if (result.score >= 50_000) scoreGrade = 3;   // B
  else if (result.score >= 20_000) scoreGrade = 2;   // C
  else scoreGrade = 1;                                // D

  // Use the better of time or score grade
  const best = Math.max(timeGrade, scoreGrade);
  if (best >= 4) return "A";
  if (best >= 3) return "B";
  if (best >= 2) return "C";
  return "D";
}

export function creditsForGrade(grade: "S" | "A" | "B" | "C" | "D"): number {
  switch (grade) {
    case "S":
      return 450;
    case "A":
      return 300;
    case "B":
      return 200;
    case "C":
      return 125;
    case "D":
    default:
      return 75;
  }
}
