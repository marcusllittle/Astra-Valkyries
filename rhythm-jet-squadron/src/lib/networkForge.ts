import type { GalleryImage, NetworkJobDetail } from "./havnApi";

export type ForgeArtifactStatus = "queued" | "rendering" | "finalizing" | "completed" | "failed";

export interface ForgeArtifact extends GalleryImage {
  forgeStatus: ForgeArtifactStatus;
  progress: number;
  stage: string;
  nodeId: string | null;
  model: string | null;
  pipeline: string | null;
  tier: string | null;
  reward: number | null;
  animationStatus: ForgeArtifactStatus | null;
  animationProgress: number;
  animationStage: string | null;
  animationNodeId: string | null;
  animationModel: string | null;
  animationReward: number | null;
}

export type RunDispatchPhase = "queued" | "rendering" | "completed" | "failed";

export interface RunDispatchView {
  jobId: string;
  phase: RunDispatchPhase;
  progress: number;
  stage: string;
  nodeId: string | null;
  reward: number | null;
}

const FAILED_STATUSES = new Set(["failed", "error", "cancelled", "canceled", "rejected"]);
const COMPLETED_STATUSES = new Set(["completed", "complete", "succeeded", "success"]);

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Convert the coordinator's live job contract into the compact combat uplink. */
export function buildRunDispatch(
  jobId: string,
  job: NetworkJobDetail | null,
): RunDispatchView {
  const status = job?.status?.toLowerCase() ?? "";
  let phase: RunDispatchPhase = "queued";
  if (FAILED_STATUSES.has(status)) phase = "failed";
  else if (COMPLETED_STATUSES.has(status)) phase = "completed";
  else if (job?.node_id || (job?.progress ?? 0) > 0 || ["leased", "running", "uploading"].includes(status)) {
    phase = "rendering";
  }

  return {
    jobId,
    phase,
    progress: clampProgress(phase === "completed" ? 100 : job?.progress ?? 0),
    stage: job?.stage || phase,
    nodeId: job?.node_id || null,
    reward: typeof job?.reward === "number" ? job.reward : null,
  };
}

export function deriveArtifactStatus(
  image: GalleryImage,
  job: NetworkJobDetail | null,
): ForgeArtifactStatus {
  const status = job?.status?.toLowerCase() ?? "";
  if (image.status === "failed" || FAILED_STATUSES.has(status)) return "failed";
  if (image.status === "completed" && Boolean(image.image_url || image.preview_url)) return "completed";
  if (COMPLETED_STATUSES.has(status)) return "finalizing";
  if (job?.node_id || (job?.progress ?? 0) > 0) return "rendering";
  return "queued";
}

export function mergeForgeArtifacts(
  images: GalleryImage[],
  details: Map<string, NetworkJobDetail>,
): ForgeArtifact[] {
  return images
    .map((image) => {
      const job = details.get(image.job_id) ?? null;
      const animationJob = image.video_job_id ? details.get(image.video_job_id) ?? null : null;
      const forgeStatus = deriveArtifactStatus(image, job);
      const fallbackProgress = forgeStatus === "completed" || forgeStatus === "finalizing" ? 100 : 0;
      const animationStatus = image.video_job_id
        ? deriveArtifactStatus(
            {
              ...image,
              job_id: image.video_job_id,
              status: image.video_status ?? "pending",
              image_url: image.video_url,
              preview_url: undefined,
            },
            animationJob,
          )
        : null;
      const animationFallback = animationStatus === "completed" || animationStatus === "finalizing" ? 100 : 0;
      return {
        ...image,
        forgeStatus,
        progress: clampProgress(job?.progress ?? fallbackProgress),
        stage: job?.stage || forgeStatus,
        nodeId: job?.node_id || null,
        model: job?.model_metadata?.model_name || job?.model || null,
        pipeline: job?.model_metadata?.pipeline || null,
        tier: job?.model_metadata?.tier || null,
        reward: typeof job?.reward === "number" ? job.reward : null,
        animationStatus,
        animationProgress: clampProgress(animationJob?.progress ?? animationFallback),
        animationStage: animationJob?.stage || animationStatus,
        animationNodeId: animationJob?.node_id || null,
        animationModel: animationJob?.model_metadata?.model_name || animationJob?.model || null,
        animationReward: typeof animationJob?.reward === "number" ? animationJob.reward : null,
      };
    })
    .sort((a, b) => b.created_at - a.created_at);
}

export function humanizeMachineName(value: string | null | undefined): string {
  if (!value) return "Awaiting assignment";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Recompute a coordinator SHA-256 claim in the player's browser. */
export async function verifySha256(
  value: string | ArrayBuffer,
  expectedDigest: string,
): Promise<boolean | null> {
  if (!globalThis.crypto?.subtle) return null;
  const input = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", input);
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return actual === expectedDigest.toLowerCase().replace(/^sha256:/, "");
}
