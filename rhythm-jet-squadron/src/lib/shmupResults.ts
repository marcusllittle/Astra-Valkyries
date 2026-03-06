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
  if (result.timeSurvivedMs >= 180_000) return "A";
  if (result.timeSurvivedMs >= 120_000) return "B";
  if (result.timeSurvivedMs >= 60_000) return "C";
  return "D";
}

export function creditsForGrade(grade: "S" | "A" | "B" | "C" | "D"): number {
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
