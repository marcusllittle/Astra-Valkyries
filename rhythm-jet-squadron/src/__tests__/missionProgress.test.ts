/**
 * Mission progression rules.
 *
 * Until this landed, `missionProgress` was never written anywhere in the
 * codebase — every mission sat at 0/target forever and `claimMission` could
 * never fire. These tests pin the scoring rules so that can't silently
 * regress.
 */

import { describe, expect, it } from "vitest";
import {
  advanceMissionProgress,
  gradeMeets,
  getDailyMissions,
  getWeeklyMissions,
  type MissionDef,
  type RunSummary,
} from "../lib/missions";

const run = (over: Partial<RunSummary> = {}): RunSummary => ({
  score: 10_000,
  kills: 40,
  grade: "B",
  bossDefeated: false,
  flawlessWaves: 0,
  ...over,
});

const mission = (over: Partial<MissionDef> = {}): MissionDef => ({
  id: "test",
  label: "Test",
  description: "",
  target: 100,
  type: "kills",
  reward: { credits: 0, xp: 0 },
  rotation: "daily",
  ...over,
});

describe("gradeMeets", () => {
  it("accepts equal or better grades", () => {
    expect(gradeMeets("S", "A")).toBe(true);
    expect(gradeMeets("A", "A")).toBe(true);
  });

  it("rejects worse grades", () => {
    expect(gradeMeets("B", "A")).toBe(false);
    expect(gradeMeets("D", "S")).toBe(false);
  });

  it("rejects unknown grades rather than ranking them", () => {
    expect(gradeMeets("?", "B")).toBe(false);
    expect(gradeMeets("A", "Z")).toBe(false);
  });
});

describe("advanceMissionProgress", () => {
  it("accumulates kills across runs", () => {
    const m = mission({ type: "kills", target: 100 });
    const first = advanceMissionProgress(m, 0, run({ kills: 40 }));
    const second = advanceMissionProgress(m, first, run({ kills: 40 }));
    expect(first).toBe(40);
    expect(second).toBe(80);
  });

  it("counts one per run for run missions", () => {
    const m = mission({ type: "runs", target: 3 });
    expect(advanceMissionProgress(m, 1, run())).toBe(2);
  });

  it("counts bosses only when actually defeated", () => {
    const m = mission({ type: "boss_kills", target: 3 });
    expect(advanceMissionProgress(m, 0, run({ bossDefeated: false }))).toBe(0);
    expect(advanceMissionProgress(m, 0, run({ bossDefeated: true }))).toBe(1);
  });

  it("takes the best single run for daily score missions", () => {
    // "Earn 10,000 points in a single run"
    const m = mission({ type: "score", target: 10_000, rotation: "daily" });
    const afterBig = advanceMissionProgress(m, 0, run({ score: 8_000 }));
    const afterSmall = advanceMissionProgress(m, afterBig, run({ score: 3_000 }));
    expect(afterBig).toBe(8_000);
    expect(afterSmall).toBe(8_000); // a worse run must not raise it
  });

  it("accumulates score for weekly score missions", () => {
    // "Earn a total of 50,000 points"
    const m = mission({ type: "score", target: 50_000, rotation: "weekly" });
    const first = advanceMissionProgress(m, 0, run({ score: 8_000 }));
    const second = advanceMissionProgress(m, first, run({ score: 3_000 }));
    expect(second).toBe(11_000);
  });

  it("latches grade missions once the target grade is hit", () => {
    const m = mission({ type: "grade", target: 1, gradeTarget: "A" });
    expect(advanceMissionProgress(m, 0, run({ grade: "B" }))).toBe(0);

    const hit = advanceMissionProgress(m, 0, run({ grade: "S" }));
    expect(hit).toBe(1);
    // A later bad run must not undo a completed mission.
    expect(advanceMissionProgress(m, hit, run({ grade: "D" }))).toBe(1);
  });

  it("never exceeds the target", () => {
    const m = mission({ type: "kills", target: 50 });
    expect(advanceMissionProgress(m, 40, run({ kills: 999 }))).toBe(50);
  });

  it("accumulates measured no-damage wave deployments", () => {
    const m = mission({ type: "no_damage_waves", target: 5 });
    expect(advanceMissionProgress(m, 2, run({ flawlessWaves: 2 }))).toBe(4);
    expect(advanceMissionProgress(m, 4, run({ flawlessWaves: 8 }))).toBe(5);
  });
});

describe("active mission pools", () => {
  it("every rotating mission is scoreable by a run", () => {
    // Guards against adding a mission type the updater silently ignores.
    const scoreable = new Set(["kills", "score", "runs", "grade", "boss_kills", "no_damage_waves"]);
    for (const m of [...getDailyMissions(), ...getWeeklyMissions()]) {
      expect(scoreable.has(m.type), `${m.id} has unscoreable type ${m.type}`).toBe(true);
    }
  });

  it("grade missions declare the grade they require", () => {
    for (const m of [...getDailyMissions(), ...getWeeklyMissions()]) {
      if (m.type === "grade") {
        expect(m.gradeTarget, `${m.id} is missing gradeTarget`).toBeDefined();
      }
    }
  });
});
