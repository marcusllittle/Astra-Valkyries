import { describe, expect, it } from "vitest";
import type { GalleryImage, NetworkJobDetail } from "../lib/havnApi";
import { deriveArtifactStatus, humanizeMachineName, mergeForgeArtifacts } from "../lib/networkForge";

const image: GalleryImage = {
  run_id: "run-1",
  job_id: "job-1",
  pilot_id: "pilot_yuki",
  outfit_id: "outfit_14",
  map_id: "abyss-crown",
  grade: "A",
  status: "pending",
  created_at: 100,
};

describe("Network Forge artifact state", () => {
  it("shows an assigned in-flight job as rendering", () => {
    const job: NetworkJobDetail = {
      id: "job-1",
      status: "running",
      node_id: "creator-one",
      progress: 42.4,
    };
    expect(deriveArtifactStatus(image, job)).toBe("rendering");
  });

  it("keeps a successful job in finalizing until its artifact is available", () => {
    const job: NetworkJobDetail = { id: "job-1", status: "succeeded", progress: 100 };
    expect(deriveArtifactStatus(image, job)).toBe("finalizing");
  });

  it("merges coordinator provenance and settlement details", () => {
    const details = new Map<string, NetworkJobDetail>([["job-1", {
      id: "job-1",
      status: "running",
      stage: "sampling",
      node_id: "DESKTOP-A26E195",
      progress: 57.8,
      model: "ltx23_wangp_distilled",
      reward: 7.558141,
      model_metadata: { pipeline: "ltx23_wangp", tier: "S" },
    }]]);

    expect(mergeForgeArtifacts([image], details)[0]).toMatchObject({
      forgeStatus: "rendering",
      progress: 58,
      stage: "sampling",
      nodeId: "DESKTOP-A26E195",
      model: "ltx23_wangp_distilled",
      pipeline: "ltx23_wangp",
      tier: "S",
      reward: 7.558141,
    });
  });

  it("formats coordinator identifiers for display", () => {
    expect(humanizeMachineName("ltx23_wangp_distilled")).toBe("Ltx23 Wangp Distilled");
    expect(humanizeMachineName(null)).toBe("Awaiting assignment");
  });

  it("tracks an LTX motion pass separately from the source still", () => {
    const animated: GalleryImage = {
      ...image,
      status: "completed",
      image_url: "/still.png",
      video_job_id: "job-video",
      video_status: "pending",
    };
    const details = new Map<string, NetworkJobDetail>([["job-video", {
      id: "job-video",
      status: "running",
      stage: "temporal_sampling",
      progress: 31,
      node_id: "creator-two",
      model: "ltx23_wangp_distilled",
    }]]);

    expect(mergeForgeArtifacts([animated], details)[0]).toMatchObject({
      forgeStatus: "completed",
      animationStatus: "rendering",
      animationProgress: 31,
      animationStage: "temporal_sampling",
      animationNodeId: "creator-two",
      animationModel: "ltx23_wangp_distilled",
    });
  });
});
