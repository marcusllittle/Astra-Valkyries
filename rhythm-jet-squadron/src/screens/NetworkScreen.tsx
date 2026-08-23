import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { useWallet } from "../context/WalletContext";
import {
  animateRewardArtifact,
  artifactReceiptJsonUrl,
  fetchAstraCampaign,
  fetchArtifactReceipt,
  fetchArtifactReceiptProof,
  fetchGalleryImages,
  fetchNetworkJob,
  fetchNodeRewardClaims,
  fetchNetworkSnapshot,
  resolveHavnAssetUrl,
  type ArtifactReceiptResponse,
  type ArtifactReceiptInclusionProof,
  type AstraCampaign,
  type NetworkNode,
  type NodeRewardClaim,
  type NetworkSnapshot,
} from "../lib/havnApi";
import {
  campaignEventLabel,
  campaignPhaseLabel,
  campaignTimeRemaining,
} from "../lib/communityCampaign";
import {
  humanizeMachineName,
  mergeForgeArtifacts,
  summarizeNodeRewards,
  verifyReceiptInclusionProof,
  verifySha256,
  type ForgeArtifact,
} from "../lib/networkForge";

const ACTIVE_POLL_MS = 6000;
const IDLE_POLL_MS = 20000;
const MAX_JOB_DETAILS = 20;
const HAVNAI_URL = (import.meta.env.VITE_HAVNAI_WEB_URL ?? "https://joinhavn.io").replace(/\/+$/, "");

interface ReceiptViewState {
  jobId: string;
  loading: boolean;
  data: ArtifactReceiptResponse | null;
  receiptDigestMatches: boolean | null;
  contentDigestMatches: boolean | null;
  inclusionProof: ArtifactReceiptInclusionProof | null;
  inclusionProofMatches: boolean | null;
  inclusionError: string | null;
  error: string | null;
}

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

function NodeCard({
  node,
  isPreferred,
  onPreferenceChange,
}: {
  node: NetworkNode;
  isPreferred: boolean;
  onPreferenceChange: (nodeId: string | null) => void;
}) {
  const successRate = (node.performance?.success_rate ?? 0) * 100;
  const trustScore = node.trust?.score;
  const gpuName = node.gpu?.gpu_name || "GPU not reported";
  const identity = node.operator?.wallet || node.operator?.identity;

  return (
    <article className={`network-node ${node.online ? "is-online" : "is-offline"} ${isPreferred ? "is-preferred" : ""}`}>
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
        <div><span>Tracked</span><strong>{formatNumber(node.payouts?.total ?? 0, 2)} HAI</strong></div>
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
      <footer className="network-node-route">
        <span>{isPreferred ? "Victory route armed" : "Automatic scheduler"}</span>
        <button
          type="button"
          className={`btn btn-small ${isPreferred ? "network-route-active" : ""}`}
          disabled={!node.online && !isPreferred}
          onClick={() => onPreferenceChange(isPreferred ? null : node.node_id)}
        >
          {isPreferred ? "CLEAR WINGMAN" : node.online ? "SELECT WINGMAN" : "OFFLINE"}
        </button>
      </footer>
    </article>
  );
}

export default function NetworkScreen() {
  const navigate = useNavigate();
  const { save, equipBanner, selectCreatorNode, selectMap } = useGame();
  const wallet = useWallet();
  const [snapshot, setSnapshot] = useState<NetworkSnapshot | null>(null);
  const [campaign, setCampaign] = useState<AstraCampaign | null>(null);
  const [nodeRewards, setNodeRewards] = useState<NodeRewardClaim[]>([]);
  const [artifacts, setArtifacts] = useState<ForgeArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkOffline, setNetworkOffline] = useState(false);
  const [campaignOffline, setCampaignOffline] = useState(false);
  const [rewardsOffline, setRewardsOffline] = useState(false);
  const [artifactsOffline, setArtifactsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [animatingJobId, setAnimatingJobId] = useState<string | null>(null);
  const [animationError, setAnimationError] = useState<{ jobId: string; message: string } | null>(null);
  const [receiptView, setReceiptView] = useState<ReceiptViewState | null>(null);
  const [copiedReceiptJobId, setCopiedReceiptJobId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const load = async (initial: boolean) => {
      if (initial) setLoading(true);
      const [networkResult, campaignResult, galleryResult, rewardsResult] = await Promise.all([
        fetchNetworkSnapshot(),
        fetchAstraCampaign(wallet.address),
        wallet.address
          ? fetchGalleryImages(wallet.address)
          : Promise.resolve({ images: [], offline: false }),
        wallet.address
          ? fetchNodeRewardClaims(wallet.address)
          : Promise.resolve({ data: null, offline: false }),
      ]);
      if (cancelled) return;

      if (networkResult.data) setSnapshot(networkResult.data);
      if (campaignResult.data) setCampaign(campaignResult.data);
      setNodeRewards(rewardsResult.data?.claims ?? []);
      setNetworkOffline(networkResult.offline);
      setCampaignOffline(campaignResult.offline);
      setRewardsOffline(rewardsResult.offline);
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

  const inspectReceipt = async (jobId: string) => {
    if (receiptView?.jobId === jobId && !receiptView.loading) {
      setReceiptView(null);
      return;
    }
    setReceiptView({
      jobId,
      loading: true,
      data: null,
      receiptDigestMatches: null,
      contentDigestMatches: null,
      inclusionProof: null,
      inclusionProofMatches: null,
      inclusionError: null,
      error: null,
    });
    const result = await fetchArtifactReceipt(jobId);
    if (!result.data) {
      setReceiptView((current) => current?.jobId === jobId ? {
        ...current,
        loading: false,
        error: result.error || "receipt_unavailable",
      } : current);
      return;
    }

    const receiptDigestMatches = await verifySha256(
      result.data.canonical_json,
      result.data.receipt_sha256,
    );
    let contentDigestMatches: boolean | null = null;
    const artifactUrl = resolveHavnAssetUrl(result.data.artifact_url ?? undefined);
    if (artifactUrl) {
      try {
        const artifactResponse = await fetch(artifactUrl);
        if (artifactResponse.ok) {
          contentDigestMatches = await verifySha256(
            await artifactResponse.arrayBuffer(),
            result.data.receipt.artifact.sha256,
          );
        }
      } catch {
        contentDigestMatches = null;
      }
    }
    const proofResult = await fetchArtifactReceiptProof(jobId);
    const inclusionProofMatches = proofResult.data
      ? await verifyReceiptInclusionProof(proofResult.data)
      : null;
    setReceiptView((current) => current?.jobId === jobId ? {
      jobId,
      loading: false,
      data: result.data,
      receiptDigestMatches,
      contentDigestMatches,
      inclusionProof: proofResult.data,
      inclusionProofMatches,
      inclusionError: proofResult.error,
      error: null,
    } : current);
  };

  const copyReceiptDigest = async (jobId: string, digest: string) => {
    try {
      await navigator.clipboard.writeText(digest);
      setCopiedReceiptJobId(jobId);
      window.setTimeout(() => setCopiedReceiptJobId((current) => current === jobId ? null : current), 1600);
    } catch {
      setCopiedReceiptJobId(null);
    }
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
  const rewardSummary = useMemo(() => summarizeNodeRewards(nodeRewards), [nodeRewards]);

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
        <div className="network-metric-reward"><span>Tracked node rewards</span><strong>{loading && !summary ? "--" : `${formatNumber(distributed, 2)} HAI`}</strong></div>
      </section>

      <section className="network-campaign" aria-label="Community campaign">
        <div className="network-campaign-head">
          <div>
            <span className="network-section-index">01 / COMMUNITY FRONT</span>
            <h2>{campaign?.name ?? "Synchronizing sector"}</h2>
            <p>{campaign?.operation ?? "Waiting for campaign telemetry."}</p>
          </div>
          {campaign ? (
            <div className="network-campaign-state">
              <strong>{campaignPhaseLabel(campaign.phase)}</strong>
              <span>{campaignTimeRemaining(campaign.ends_at)}</span>
            </div>
          ) : null}
        </div>

        {campaignOffline && !campaign ? (
          <div className="network-empty">Community front telemetry is unavailable. Retrying automatically.</div>
        ) : campaign ? (
          <div className="network-campaign-grid">
            <div className="network-campaign-objective">
              <div className="network-campaign-score">
                <span>Combined advance</span>
                <strong>{campaign.progress_percent}%</strong>
              </div>

              <div className="network-campaign-lane">
                <div>
                  <span>Pilot combat</span>
                  <strong>{campaign.combat.current} / {campaign.combat.target}</strong>
                </div>
                <div className="network-progress-track" aria-label={`${campaign.combat.percent}% pilot combat progress`}>
                  <span style={{ width: `${campaign.combat.percent}%` }} />
                </div>
                <small>{campaign.combat.accepted_runs} accepted sorties / {campaign.combat.contributors} pilots</small>
              </div>

              <div className="network-campaign-lane is-forge">
                <div>
                  <span>Creator forge</span>
                  <strong>{campaign.forge.current} / {campaign.forge.target}</strong>
                </div>
                <div className="network-progress-track" aria-label={`${campaign.forge.percent}% creator forge progress`}>
                  <span style={{ width: `${campaign.forge.percent}%` }} />
                </div>
                <small>{campaign.forge.settled_artifacts} final artifacts / {campaign.forge.creator_nodes} creator nodes</small>
              </div>

              <div className="network-campaign-actions">
                <div>
                  <span>Your contribution</span>
                  <strong>
                    {campaign.personal
                      ? `${campaign.personal.combat_points} combat / ${campaign.personal.forge_points} forge`
                      : "Wallet not linked"}
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    selectMap(campaign.map_id);
                    navigate("/briefing");
                  }}
                >
                  DEPLOY TO FRONT
                </button>
              </div>
            </div>

            <div className="network-campaign-feed">
              <span className="network-campaign-feed-title">Live contribution ledger</span>
              {campaign.recent_events.length === 0 ? (
                <div className="network-campaign-feed-empty">No accepted contributions yet.</div>
              ) : (
                campaign.recent_events.slice(0, 6).map((event) => (
                  <div key={`${event.kind}:${event.id}`} className={`network-campaign-event is-${event.kind}`}>
                    <span className="network-campaign-event-mark" aria-hidden="true" />
                    <div>
                      <strong>{campaignEventLabel(event)}</strong>
                      <small>{new Date(event.created_at * 1000).toLocaleString()}</small>
                    </div>
                    <b>+{event.points}</b>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </section>

      <section className="network-settlement" aria-label="Operator settlement">
        <div className="network-settlement-head">
          <div>
            <span className="network-section-index">02 / OPERATOR SETTLEMENT</span>
            <h2>Your node rewards</h2>
          </div>
          <span className="network-status" data-status={rewardsOffline ? "offline" : "online"}>
            <span className="network-status-dot" />
            {rewardsOffline ? "Ledger unavailable" : "Sepolia ledger"}
          </span>
        </div>

        {!wallet.address ? (
          <div className="network-settlement-empty">
            <span>Connect the node operator wallet to resolve its payout proofs.</span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!wallet.available || wallet.status === "connecting"}
              onClick={() => void wallet.connect()}
            >
              {wallet.status === "connecting" ? "CONNECTING..." : "CONNECT WALLET"}
            </button>
          </div>
        ) : rewardsOffline ? (
          <div className="network-settlement-empty">
            <span>Operator settlement telemetry is unavailable. Retrying automatically.</span>
          </div>
        ) : (
          <div className="network-settlement-grid">
            <div><span>Tracked</span><strong>{formatNumber(rewardSummary.tracked, 6)} HAI</strong></div>
            <div className="is-claimable"><span>Claimable</span><strong>{formatNumber(rewardSummary.claimable, 6)} HAI</strong></div>
            <div><span>Awaiting root</span><strong>{formatNumber(rewardSummary.awaitingRoot, 6)} HAI</strong></div>
            <div className="is-claimed"><span>Claimed on-chain</span><strong>{formatNumber(rewardSummary.claimed, 6)} HAI</strong></div>
            <div className="network-settlement-action">
              <span>{rewardSummary.claimableCount} published proof{rewardSummary.claimableCount === 1 ? "" : "s"}</span>
              <a className="btn btn-primary" href={`${HAVNAI_URL}/node-rewards`} target="_blank" rel="noopener noreferrer">
                {rewardSummary.claimableCount > 0 ? "CLAIM ON SEPOLIA" : "OPEN CLAIM LEDGER"}
              </a>
            </div>
          </div>
        )}
      </section>

      <main className="network-workspace">
        <section className="network-panel network-creators">
          <div className="network-section-head">
            <div>
              <span className="network-section-index">03 / CREATOR TOPOLOGY</span>
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
              {nodes.map((node) => (
                <NodeCard
                  key={node.node_id}
                  node={node}
                  isPreferred={save.preferredCreatorNodeId === node.node_id}
                  onPreferenceChange={selectCreatorNode}
                />
              ))}
            </div>
          )}
        </section>

        <section className="network-panel network-artifacts">
          <div className="network-section-head">
            <div>
              <span className="network-section-index">04 / YOUR ARTIFACT LEDGER</span>
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
                const activeReceipt = receiptView?.jobId === artifact.job_id ? receiptView : null;
                const receipt = activeReceipt?.data?.receipt;
                const receiptCreator = receipt?.execution.creator_node_id
                  ? nodeNames.get(receipt.execution.creator_node_id) || receipt.execution.creator_node_id
                  : "Unassigned";
                const inclusion = activeReceipt?.inclusionProof;
                const anchorVerified = Boolean(
                  inclusion?.status === "anchored" &&
                  inclusion.anchor_tx_hash &&
                  inclusion.valid &&
                  activeReceipt?.inclusionProofMatches === true
                );
                const anchorLabel = anchorVerified
                  ? "Sepolia verified"
                  : activeReceipt?.inclusionProofMatches === false
                    ? "Proof mismatch"
                    : inclusion?.status === "pending"
                      ? "Sepolia confirming"
                      : inclusion?.status === "ready"
                        ? "Batch ready"
                        : "Awaiting batch";
                const anchorUrl = inclusion?.anchor_tx_hash
                  ? `https://sepolia.etherscan.io/tx/${inclusion.anchor_tx_hash}`
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

                      {activeReceipt && (
                        <section className="network-receipt" aria-label="Artifact receipt">
                          {activeReceipt.loading ? (
                            <div className="network-receipt-loading">
                              <span className="network-status" data-status="rendering">
                                <span className="network-status-dot" />
                                Verifying receipt
                              </span>
                            </div>
                          ) : activeReceipt.error ? (
                            <div className="network-receipt-error">
                              <strong>Receipt unavailable</strong>
                              <span>{humanizeMachineName(activeReceipt.error)}</span>
                            </div>
                          ) : receipt && activeReceipt.data ? (
                            <>
                              <header className="network-receipt-head">
                                <div>
                                  <span>ARTIFACT RECEIPT</span>
                                  <strong>HAVNAI / V{receipt.version}</strong>
                                </div>
                                <div className="network-receipt-checks">
                                  <span data-check={String(activeReceipt.receiptDigestMatches)}>
                                    Receipt digest {activeReceipt.receiptDigestMatches === true ? "match" : activeReceipt.receiptDigestMatches === false ? "mismatch" : "unchecked"}
                                  </span>
                                  <span data-check={String(activeReceipt.contentDigestMatches)}>
                                    Content hash {activeReceipt.contentDigestMatches === true ? "match" : activeReceipt.contentDigestMatches === false ? "mismatch" : "unchecked"}
                                  </span>
                                  <span data-check={anchorVerified ? "true" : activeReceipt.inclusionProofMatches === false ? "false" : "pending"}>
                                    {anchorLabel}
                                  </span>
                                </div>
                              </header>

                              <div className="network-receipt-grid">
                                <div><span>Creator</span><strong>{receiptCreator}</strong></div>
                                <div><span>Model</span><strong>{humanizeMachineName(receipt.execution.model.name)}</strong></div>
                                <div><span>Route</span><strong>{receipt.routing.preference_honored ? "Wingman honored" : humanizeMachineName(receipt.routing.strategy)}</strong></div>
                                <div><span>Settlement</span><strong>{humanizeMachineName(receipt.settlement.outcome)}</strong></div>
                                <div><span>Node reward</span><strong>{formatNumber(receipt.settlement.node_reward, 4)} {humanizeMachineName(receipt.settlement.reward_asset_type)}</strong></div>
                                <div><span>Receipt batch</span><strong>{inclusion ? `#${inclusion.batch_id} / ${inclusion.leaf_count} leaves` : humanizeMachineName(activeReceipt.inclusionError)}</strong></div>
                                <div><span>Chain anchor</span><strong>{anchorLabel}</strong></div>
                              </div>

                              <div className="network-receipt-digests">
                                <div>
                                  <span>CONTENT SHA-256</span>
                                  <code>{receipt.artifact.sha256}</code>
                                </div>
                                <div>
                                  <span>RECEIPT SHA-256</span>
                                  <code>{activeReceipt.data.receipt_sha256.replace(/^sha256:/, "")}</code>
                                </div>
                                {inclusion && (
                                  <div>
                                    <span>MERKLE ROOT</span>
                                    <code>{inclusion.merkle_root}</code>
                                  </div>
                                )}
                              </div>

                              <footer className="network-receipt-actions">
                                <span>{formatNumber(receipt.artifact.size_bytes)} bytes / {humanizeMachineName(receipt.artifact.digest_source)}</span>
                                <div>
                                  <button
                                    type="button"
                                    className="btn btn-small"
                                    onClick={() => void copyReceiptDigest(artifact.job_id, activeReceipt.data!.receipt_sha256)}
                                  >
                                    {copiedReceiptJobId === artifact.job_id ? "COPIED" : "COPY DIGEST"}
                                  </button>
                                  <a
                                    className="btn btn-small"
                                    href={artifactReceiptJsonUrl(artifact.job_id)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    OPEN JSON
                                  </a>
                                  {anchorUrl && (
                                    <a
                                      className="btn btn-small network-chain-link"
                                      href={anchorUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      VIEW SEPOLIA TX
                                    </a>
                                  )}
                                </div>
                              </footer>
                            </>
                          ) : null}
                        </section>
                      )}

                      <footer className="network-artifact-foot">
                        <span>{humanizeMachineName(artifact.map_id)} · {new Date(artifact.created_at * 1000).toLocaleDateString()}</span>
                        <div className="network-artifact-actions">
                          {artifact.forgeStatus === "completed" && imageUrl && (
                            <button
                              className="btn btn-small network-receipt-btn"
                              disabled={activeReceipt?.loading}
                              onClick={() => void inspectReceipt(artifact.job_id)}
                            >
                              {activeReceipt?.loading ? "VERIFYING..." : activeReceipt ? "CLOSE RECEIPT" : "VERIFY RECEIPT"}
                            </button>
                          )}
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
