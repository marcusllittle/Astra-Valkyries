import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { useWallet } from "../context/WalletContext";
import {
  animateRewardArtifact,
  fetchGalleryImages,
  fetchNetworkJob,
  fetchNetworkSnapshot,
  resolveHavnAssetUrl,
  type NetworkNode,
  type NetworkSnapshot,
} from "../lib/havnApi";
import { humanizeMachineName, mergeForgeArtifacts, type ForgeArtifact } from "../lib/networkForge";

const ACTIVE_POLL_MS = 6000;
const IDLE_POLL_MS = 20000;
const MAX_JOB_DETAILS = 20;

function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

function shortIdentity(value?: string | null): string {
  if (!value) return "Independent operator";
  if (value.startsWith("0x") && value.length > 12) return `${value.slice(0, 6)}...${value.slice(-4)}`;
  return value;
}

function displayPilot(id: string): string {
  return humanizeMachineName(id.replace(/^pilot_/, ""));
}

function statusLabel(status: ForgeArtifact["forgeStatus"]): string {
  const labels: Record<ForgeArtifact["forgeStatus"], string> = {
    queued: "Queued",
    rendering: "Rendering",
    finalizing: "Finalizing artifact",
    completed: "Artifact ready",
    failed: "Render failed",
  };
  return labels[status];
}

function NodeCard({ node }: { node: NetworkNode }) {
  const successRate = (node.performance?.success_rate ?? 0) * 100;
  const trustScore = node.trust?.score;
  const gpuName = node.gpu?.gpu_name || "GPU not reported";
  const identity = node.operator?.wallet || node.operator?.identity;

  return (
    <article className={`network-node ${node.online ? "is-online" : "is-offline"}`}>
      <header className="network-node-head">
        <div>
          <span className="network-node-role">{node.role || "creator"} node</span>
          <h3>{node.node_name || node.node_id}</h3>
          <span className="network-node-operator">{shortIdentity(identity)}</span>
        </div>
        <span className="network-status" data-status={node.online ? "online" : "offline"}>
          <span className="network-status-dot" />
          {node.online ? "Online" : "Offline"}
        </span>
      </header>

      <div className="network-node-gpu">
        <span>Compute</span>
        <strong>{gpuName}</strong>
      </div>

      <div className="network-node-stats">
        <div><span>Reliability</span><strong>{successRate ? `${formatNumber(successRate, 2)}%` : "New"}</strong></div>
        <div><span>Trust</span><strong>{trustScore == null ? humanizeMachineName(node.trust?.level) : formatNumber(trustScore, 2)}</strong></div>
        <div><span>Attempts</span><strong>{formatNumber(node.performance?.attempts_total ?? 0)}</strong></div>
        <div><span>Paid</span><strong>{formatNumber(node.payouts?.total ?? 0, 2)} HAI</strong></div>
      </div>

      <div className="network-utilization">
        <div><span>Current load</span><strong>{formatNumber(node.utilization ?? 0, 1)}%</strong></div>
        <div className="network-progress-track" aria-label={`${node.utilization ?? 0}% utilization`}>
          <span style={{ width: `${Math.max(0, Math.min(100, node.utilization ?? 0))}%` }} />
        </div>
      </div>

      <div className="network-pipelines" aria-label="Supported pipelines">
        {(node.pipelines.length ? node.pipelines : ["No pipelines reported"]).map((pipeline) => (
          <span key={pipeline}>{humanizeMachineName(pipeline)}</span>
        ))}
      </div>
    </article>
  );
}

export default function NetworkScreen() {
  const navigate = useNavigate();
  const { save, equipBanner } = useGame();
  const wallet = useWallet();
  const [snapshot, setSnapshot] = useState<NetworkSnapshot | null>(null);
  const [artifacts, setArtifacts] = useState<ForgeArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkOffline, setNetworkOffline] = useState(false);
  const [artifactsOffline, setArtifactsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [animatingJobId, setAnimatingJobId] = useState<string | null>(null);
  const [animationError, setAnimationError] = useState<{ jobId: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const load = async (initial: boolean) => {
      if (initial) setLoading(true);
      const [networkResult, galleryResult] = await Promise.all([
        fetchNetworkSnapshot(),
        wallet.address
          ? fetchGalleryImages(wallet.address)
          : Promise.resolve({ images: [], offline: false }),
      ]);
      if (cancelled) return;

      if (networkResult.data) setSnapshot(networkResult.data);
      setNetworkOffline(networkResult.offline);
      setArtifactsOffline(galleryResult.offline);

      const details = new Map();
      const jobIds = galleryResult.images
        .flatMap((image) => [image.job_id, image.video_job_id].filter((id): id is string => Boolean(id)))
        .slice(0, MAX_JOB_DETAILS);
      const resolved = await Promise.all(jobIds.map((jobId) => fetchNetworkJob(jobId)));
      if (cancelled) return;
      resolved.forEach((job) => {
        if (job) details.set(job.id, job);
      });
      const merged = mergeForgeArtifacts(galleryResult.images, details);
      setArtifacts(merged);
      setLastUpdated(new Date());
      setLoading(false);

      const hasActiveJob = merged.some((artifact) =>
        artifact.forgeStatus === "queued" ||
        artifact.forgeStatus === "rendering" ||
        artifact.forgeStatus === "finalizing" ||
        artifact.animationStatus === "queued" ||
        artifact.animationStatus === "rendering" ||
        artifact.animationStatus === "finalizing"
      );
      timer = window.setTimeout(() => load(false), hasActiveJob ? ACTIVE_POLL_MS : IDLE_POLL_MS);
    };

    void load(true);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [wallet.address, refreshNonce]);

  const animateArtifact = async (jobId: string) => {
    if (!wallet.address) return;
    setAnimatingJobId(jobId);
    setAnimationError(null);
    const result = await animateRewardArtifact(wallet.address, jobId, wallet.sign);
    setAnimatingJobId(null);
    if (!result.ok) {
      setAnimationError({ jobId, message: result.reason || "animation_unavailable" });
      return;
    }
    setRefreshNonce((value) => value + 1);
  };

  const nodes = useMemo(
    () => [...(snapshot?.nodes ?? [])].sort((a, b) => Number(b.online) - Number(a.online)),
    [snapshot],
  );
  const nodeNames = useMemo(
    () => new Map(nodes.map((node) => [node.node_id, node.node_name || node.node_id])),
    [nodes],
  );
  const summary = snapshot?.summary;
  const queued = snapshot?.job_summary?.queued_jobs ?? summary?.tasks_backlog ?? 0;
  const completedToday = snapshot?.job_summary?.jobs_completed_today ?? summary?.jobs_completed_today ?? 0;
  const distributed = snapshot?.job_summary?.total_distributed ?? summary?.total_rewarded ?? 0;

  return (
    <div className="screen network-screen">
      <header className="network-command">
        <div className="network-command-bg" aria-hidden="true" />
        <div className="network-command-content">
          <button className="btn btn-back" onClick={() => navigate("/spaceport")}>← SPACEPORT</button>
          <div className="network-title-block">
            <span className="network-kicker">HavnAI distributed compute</span>
            <h1>NETWORK FORGE</h1>
            <p>Live creator nodes turning squadron victories into persistent pilot artifacts.</p>
          </div>
        </div>
        <div className="network-live-block">
          <span className="network-status" data-status={networkOffline ? "offline" : "online"}>
            <span className="network-status-dot" />
            {networkOffline ? "Coordinator unavailable" : "Network live"}
          </span>
          <span>{lastUpdated ? `Synced ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Synchronizing"}</span>
        </div>
      </header>

      <section className="network-metrics" aria-label="Network totals">
        <div><span>Creators online</span><strong>{loading && !summary ? "--" : `${summary?.online_nodes ?? 0} / ${summary?.total_nodes ?? 0}`}</strong></div>
        <div><span>Render queue</span><strong>{loading && !summary ? "--" : formatNumber(queued)}</strong></div>
        <div><span>Completed today</span><strong>{loading && !summary ? "--" : formatNumber(completedToday)}</strong></div>
        <div className="network-metric-reward"><span>Distributed to nodes</span><strong>{loading && !summary ? "--" : `${formatNumber(distributed, 2)} HAI`}</strong></div>
      </section>

      <main className="network-workspace">
        <section className="network-panel network-creators">
          <div className="network-section-head">
            <div>
              <span className="network-section-index">01 / CREATOR TOPOLOGY</span>
              <h2>Active compute fleet</h2>
            </div>
            <span className="network-section-count">{nodes.filter((node) => node.online).length} routing</span>
          </div>

          {networkOffline && !snapshot ? (
            <div className="network-empty">The creator network could not be reached. Retrying automatically.</div>
          ) : nodes.length === 0 ? (
            <div className="network-empty">No creator nodes are registered.</div>
          ) : (
            <div className="network-node-list">
              {nodes.map((node) => <NodeCard key={node.node_id} node={node} />)}
            </div>
          )}
        </section>

        <section className="network-panel network-artifacts">
          <div className="network-section-head">
            <div>
              <span className="network-section-index">02 / YOUR ARTIFACT LEDGER</span>
              <h2>Victory render queue</h2>
            </div>
            {wallet.short && <span className="network-wallet">{wallet.short}</span>}
          </div>

          {!wallet.address ? (
            <div className="network-wallet-gate">
              <span className="network-gate-mark" aria-hidden="true">◈</span>
              <h3>Link your pilot wallet</h3>
              <p>Rewarded mission renders and their creator provenance are bound to your wallet.</p>
              <button
                className="btn btn-primary"
                disabled={!wallet.available || wallet.status === "connecting"}
                onClick={() => void wallet.connect()}
              >
                {wallet.status === "connecting" ? "CONNECTING..." : "CONNECT WALLET"}
              </button>
              {wallet.error && <span className="network-error">{wallet.error}</span>}
            </div>
          ) : artifactsOffline && artifacts.length === 0 ? (
            <div className="network-empty">Your artifact ledger is unavailable. Retrying automatically.</div>
          ) : artifacts.length === 0 ? (
            <div className="network-wallet-gate">
              <span className="network-gate-mark" aria-hidden="true">◇</span>
              <h3>No artifacts in flight</h3>
              <p>Complete a rewarded mission to dispatch a personalized render across the creator network.</p>
              <button className="btn" onClick={() => navigate("/briefing")}>SELECT MISSION</button>
            </div>
          ) : (
            <div className="network-artifact-list">
              {artifacts.map((artifact) => {
                const imageUrl = resolveHavnAssetUrl(artifact.image_url ?? artifact.preview_url);
                const videoUrl = resolveHavnAssetUrl(artifact.video_url);
                const pilot = displayPilot(artifact.pilot_id);
                const isPreflight = artifact.grade === "DEPLOYMENT";
                const title = isPreflight ? `${pilot} / Deployment` : `${pilot} / Grade ${artifact.grade}`;
                const isEquipped = save.equippedBanner?.jobId === artifact.job_id;
                const assignedNode = artifact.nodeId
                  ? nodeNames.get(artifact.nodeId) || artifact.nodeId
                  : null;
                return (
                  <article key={artifact.job_id} className={`network-artifact is-${artifact.forgeStatus}`}>
                    <div className="network-artifact-preview">
                      {videoUrl ? (
                        <video src={videoUrl} autoPlay muted loop playsInline controls />
                      ) : imageUrl ? (
                        <img src={imageUrl} alt={`${pilot} victory artifact`} />
                      ) : (
                        <div className="network-artifact-placeholder" aria-hidden="true">
                          <span>◈</span>
                          <i />
                        </div>
                      )}
                      <span className="network-artifact-grade">{isPreflight ? "PRE" : artifact.grade}</span>
                    </div>

                    <div className="network-artifact-body">
                      <div className="network-artifact-head">
                        <div>
                          <span className="network-artifact-id">{artifact.job_id}</span>
                          <h3>{title}</h3>
                        </div>
                        <span className="network-status" data-status={artifact.forgeStatus}>
                          <span className="network-status-dot" />
                          {statusLabel(artifact.forgeStatus)}
                        </span>
                      </div>

                      <div className="network-artifact-route">
                        <div><span>Creator</span><strong>{assignedNode || "Scheduler queue"}</strong></div>
                        <div><span>Model</span><strong>{humanizeMachineName(artifact.model)}</strong></div>
                        <div><span>Pipeline</span><strong>{humanizeMachineName(artifact.pipeline)}</strong></div>
                        <div><span>Node reward</span><strong>{artifact.reward == null ? "Pending" : `${formatNumber(artifact.reward, 4)} HAI`}</strong></div>
                      </div>

                      <div className="network-artifact-progress">
                        <div>
                          <span>{humanizeMachineName(artifact.stage)}</span>
                          <strong>{artifact.progress}%</strong>
                        </div>
                        <div className="network-progress-track">
                          <span style={{ width: `${artifact.progress}%` }} />
                        </div>
                      </div>

                      {artifact.animationStatus && (
                        <div className="network-animation-pass">
                          <div className="network-animation-head">
                            <span>LTX 2.3 motion pass</span>
                            <span className="network-status" data-status={artifact.animationStatus}>
                              <span className="network-status-dot" />
                              {statusLabel(artifact.animationStatus)}
                            </span>
                          </div>
                          <div className="network-animation-meta">
                            <span>{artifact.animationNodeId ? nodeNames.get(artifact.animationNodeId) || artifact.animationNodeId : "Scheduler queue"}</span>
                            <span>{humanizeMachineName(artifact.animationModel)}</span>
                            <span>{artifact.animationReward == null ? "Settlement pending" : `${formatNumber(artifact.animationReward, 4)} HAI`}</span>
                          </div>
                          <div className="network-progress-track">
                            <span style={{ width: `${artifact.animationProgress}%` }} />
                          </div>
                        </div>
                      )}

                      <footer className="network-artifact-foot">
                        <span>{humanizeMachineName(artifact.map_id)} · {new Date(artifact.created_at * 1000).toLocaleDateString()}</span>
                        <div className="network-artifact-actions">
                          {artifact.forgeStatus === "completed" && imageUrl && !artifact.video_job_id && (
                            <button
                              className="btn btn-small network-animate-btn"
                              disabled={animatingJobId === artifact.job_id}
                              onClick={() => void animateArtifact(artifact.job_id)}
                            >
                              {animatingJobId === artifact.job_id ? "DISPATCHING..." : "ANIMATE WITH LTX 2.3"}
                            </button>
                          )}
                          {artifact.forgeStatus === "completed" && imageUrl && (
                            <button
                              className="btn btn-small"
                              onClick={() => equipBanner(isEquipped ? null : {
                                jobId: artifact.job_id,
                                title,
                                url: imageUrl,
                                source: "astra_reward",
                              })}
                            >
                              {isEquipped ? "REMOVE FROM HANGAR" : "DEPLOY TO HANGAR"}
                            </button>
                          )}
                        </div>
                      </footer>
                      {animationError?.jobId === artifact.job_id && animatingJobId === null && (
                        <span className="network-error">LTX dispatch: {humanizeMachineName(animationError.message)}</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
