import { describe, expect, it } from "vitest";
import type {
  ArtifactReceiptInclusionProof,
  GalleryImage,
  NetworkJobDetail,
  NodeRewardClaim,
} from "../lib/havnApi";
import {
  buildRunDispatch,
  deriveArtifactStatus,
  humanizeMachineName,
  mergeForgeArtifacts,
  summarizeNodeRewards,
  verifyReceiptInclusionProof,
  verifySha256,
} from "../lib/networkForge";

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

  it("exposes a real creator assignment inside an active run", () => {
    expect(buildRunDispatch("job-live", {
      id: "job-live",
      status: "running",
      stage: "sampling",
      progress: 36.6,
      node_id: "DESKTOP-A26E195",
      reward: 1.25,
    })).toEqual({
      jobId: "job-live",
      phase: "rendering",
      progress: 37,
      stage: "sampling",
      nodeId: "DESKTOP-A26E195",
      reward: 1.25,
    });
  });

  it("keeps queued and terminal dispatch states stable", () => {
    expect(buildRunDispatch("job-queued", null).phase).toBe("queued");
    expect(buildRunDispatch("job-done", {
      id: "job-done",
      status: "succeeded",
      progress: 99,
    })).toMatchObject({ phase: "completed", progress: 100 });
    expect(buildRunDispatch("job-failed", {
      id: "job-failed",
      status: "failed",
      progress: 24,
    }).phase).toBe("failed");
  });

  it("verifies coordinator and content SHA-256 claims locally", async () => {
    const expected = "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
    await expect(verifySha256("hello", expected)).resolves.toBe(true);
    await expect(verifySha256("changed", expected)).resolves.toBe(false);
  });

  it("verifies a domain-separated Merkle inclusion path locally", async () => {
    const proof: ArtifactReceiptInclusionProof = {
      batch_id: 7,
      job_id: "job-1",
      leaf_index: 0,
      receipt_hash: "01".repeat(32),
      leaf_hash: "dcffe786ded16d283c663846ad0c4ff26558fccde36ca9d30b2ea19eade9fc0e",
      proof: [{ position: "right", hash: "02".repeat(32) }],
      schema_version: "receipt-merkle-batch.v1",
      merkle_root: "f1e490ddae693a2facccbb7269b87e52f5796d103d4ef1417a6e8cf47d7fe99b",
      leaf_count: 2,
      status: "anchored",
      anchor_network: "sepolia",
      anchor_tx_hash: `0x${"03".repeat(32)}`,
      valid: true,
    };

    await expect(verifyReceiptInclusionProof(proof)).resolves.toBe(true);
    await expect(
      verifyReceiptInclusionProof({ ...proof, merkle_root: "ff".repeat(32) }),
    ).resolves.toBe(false);
  });

  it("keeps tracked, claimable, and confirmed node rewards distinct", () => {
    const base: NodeRewardClaim = {
      schema_version: "havnai-node-payout-claims.v1",
      batch_id: 1,
      leaf_index: 0,
      wallet: "0x2222222222222222222222222222222222222222",
      amount_wei: "1500000000000000000",
      amount_hai: "1.5",
      node_ids: ["creator-one"],
      payout_count: 1,
      batch_status: "ready",
      claimed: false,
      valid: true,
      network: "sepolia",
      chain_id: 11155111,
    };
    const summary = summarizeNodeRewards([
      base,
      { ...base, batch_id: 2, amount_hai: "4.75", batch_status: "published" },
      { ...base, batch_id: 3, amount_hai: "2.25", batch_status: "published", claimed: true },
      { ...base, batch_id: 4, amount_hai: "99", valid: false },
    ]);

    expect(summary).toEqual({
      tracked: 8.5,
      claimable: 4.75,
      awaitingRoot: 1.5,
      claimed: 2.25,
      claimableCount: 1,
      invalidCount: 1,
    });
  });
});
