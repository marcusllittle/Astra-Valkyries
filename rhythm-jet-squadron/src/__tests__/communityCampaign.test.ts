import { describe, expect, it } from "vitest";
import {
  campaignEventLabel,
  campaignPhaseLabel,
  campaignTimeRemaining,
} from "../lib/communityCampaign";

describe("community campaign presentation", () => {
  it("uses honest phase labels for incomplete fronts", () => {
    expect(campaignPhaseLabel("contested")).toBe("Front contested");
    expect(campaignPhaseLabel("awaiting_forge")).toBe("Awaiting creator forge");
    expect(campaignPhaseLabel("awaiting_victories")).toBe("Awaiting pilot victories");
    expect(campaignPhaseLabel("secured")).toBe("Sector secured");
  });

  it("distinguishes player and creator-node contributions", () => {
    expect(campaignEventLabel({
      kind: "combat",
      id: "run-1",
      actor: "pilot-a1b2c3d4",
      grade: "S",
      points: 8,
      created_at: 100,
    })).toBe("pilot-a1b2c3d4 logged a Grade S sortie");

    expect(campaignEventLabel({
      kind: "forge",
      id: "job-1",
      actor: "creator-one",
      artifact_type: "video",
      points: 2,
      created_at: 101,
    })).toBe("creator-one sealed a video artifact");
  });

  it("formats the remaining campaign window without negative time", () => {
    expect(campaignTimeRemaining(200000, 100000)).toBe("1d 3h remaining");
    expect(campaignTimeRemaining(107500, 100000)).toBe("2h 5m remaining");
    expect(campaignTimeRemaining(99999, 100000)).toBe("0m remaining");
  });
});
