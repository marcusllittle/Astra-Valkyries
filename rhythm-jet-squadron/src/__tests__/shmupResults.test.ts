import { describe, expect, it } from "vitest";
import { evaluateShmupRun, gradeShmupRun, type ShmupRunResult } from "../lib/shmupResults";

function run(overrides: Partial<ShmupRunResult> = {}): ShmupRunResult {
  return {
    score: 0,
    kills: 0,
    timeSurvivedMs: 0,
    ...overrides,
  };
}

describe("shmup performance ranks", () => {
  it("gives a boss clear a B floor without handing out an automatic S", () => {
    const result = evaluateShmupRun(run({ bossDefeated: true }));
    expect(result.rating).toBe(52);
    expect(result.grade).toBe("B");
  });

  it("awards A for a strong clear", () => {
    expect(gradeShmupRun(run({
      score: 65_000,
      kills: 75,
      timeSurvivedMs: 95_000,
      bossDefeated: true,
      flawlessWaves: 2,
      bestMultiplier: 2.4,
      grazes: 20,
      bestGrazeChain: 7,
      bestKillStreak: 14,
      damageTaken: 2,
    }))).toBe("A");
  });

  it("reserves S for an elite boss clear", () => {
    const result = evaluateShmupRun(run({
      score: 100_000,
      kills: 80,
      timeSurvivedMs: 100_000,
      bossDefeated: true,
      flawlessWaves: 4,
      bestMultiplier: 3,
      grazes: 40,
      bestGrazeChain: 12,
      bestKillStreak: 20,
      damageTaken: 0,
      maxWeaponLevel: 6,
    }));
    expect(result.grade).toBe("S");
    expect(result.rating).toBe(100);
    expect(result.commendations).toEqual([
      "Sector Breaker",
      "Untouchable",
      "Route Keeper",
      "Edge Dancer",
    ]);
  });

  it("caps a no-clear run below S even with maximum category scores", () => {
    const result = evaluateShmupRun(run({
      score: 500_000,
      kills: 500,
      timeSurvivedMs: 300_000,
      flawlessWaves: 20,
      bestMultiplier: 10,
      grazes: 500,
      damageTaken: 0,
    }));
    expect(result.rating).toBe(87);
    expect(result.grade).toBe("A");
  });

  it("reports the next rank gap", () => {
    const result = evaluateShmupRun(run({ bossDefeated: true }));
    expect(result.nextGrade).toBe("A");
    expect(result.pointsToNextGrade).toBe(18);
  });

  it("uses the displayed integer at a grade boundary", () => {
    const result = evaluateShmupRun(run({
      score: 49_750,
      kills: 80,
      timeSurvivedMs: 90_000,
      bossDefeated: true,
      flawlessWaves: 4,
      bestMultiplier: 3,
      grazes: 40,
      damageTaken: 1.2,
    }));
    expect(result.rating).toBe(87);
    expect(result.grade).toBe("A");
    expect(result.pointsToNextGrade).toBe(1);
  });

  it("sanitizes invalid telemetry", () => {
    const result = evaluateShmupRun(run({
      score: Number.NaN,
      kills: -5,
      timeSurvivedMs: Number.POSITIVE_INFINITY,
      bestMultiplier: Number.NaN,
      damageTaken: -2,
    }));
    expect(result.rating).toBe(10);
    expect(result.grade).toBe("D");
  });
});
