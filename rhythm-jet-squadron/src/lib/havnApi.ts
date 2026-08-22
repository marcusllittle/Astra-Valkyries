/**
 * API client for HavnAI backend.
 * Phase 1: balance | Phase 2: spend | Phase 3: reward + leaderboard
 */

const REMOTE_PROXY_BASE = "https://joinhavn.io/api";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function getApiBase(): string {
  const configuredBase = trimTrailingSlash(import.meta.env.VITE_HAVNAI_API_BASE?.trim() ?? "");
  if (typeof window === "undefined") return configuredBase || "/api";

  const { protocol } = window.location;
  const isHttp = protocol === "http:" || protocol === "https:";

  if (isHttp) return "/api";

  return isAbsoluteHttpUrl(configuredBase) ? configuredBase : REMOTE_PROXY_BASE;
}

const API_BASE = getApiBase();

/** Route coordinator-hosted output paths through the same API proxy as JSON. */
export function resolveHavnAssetUrl(value?: string): string | undefined {
  if (!value || isAbsoluteHttpUrl(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  const path = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE}${path}`;
}

// ─── Types ──────────────────────────────────────────────────

export interface CreditBalance {
  wallet: string;
  balance: number;
  total_deposited: number;
  total_spent: number;
}

export interface SpendResult {
  ok: boolean;
  reason?: string;
  action?: string;
  cost?: number;
  remaining?: number;
}

export interface RewardResult {
  ok: boolean;
  reason?: string;
  run_id?: string;
  reward?: number;
  daily_earned?: number;
  daily_cap?: number;
  wait_seconds?: number;
  bonuses?: string[] | null;
  multiplier?: number | null;
  artifact_job_id?: string;
}

export interface PlayerStats {
  wallet: string;
  total_runs: number;
  best_score: number;
  total_earned: number;
  daily_earned: number;
  daily_cap: number;
  cooldown_remaining: number;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  wallet_short: string;
  best_score: number;
  total_runs: number;
  total_earned: number;
}

export interface LeaderboardFetchResult {
  entries: LeaderboardEntry[];
  offline: boolean;
}

export interface NetworkSummary {
  total_nodes: number;
  online_nodes: number;
  offline_nodes: number;
  avg_utilization: number;
  tasks_backlog: number;
  jobs_completed_today: number;
  total_rewarded: number;
  total_rewards: number;
  timestamp?: string;
}

export interface NetworkNode {
  node_id: string;
  node_name: string;
  online: boolean;
  role: string;
  os?: string;
  utilization: number;
  tasks_completed: number;
  pipelines: string[];
  models: string[];
  gpu?: {
    gpu_name?: string;
    utilization?: number;
    memory_total?: number;
    memory_used?: number;
  };
  operator?: {
    display_name?: string;
    identity?: string;
    wallet?: string | null;
  };
  performance?: {
    attempts_total?: number;
    completed_attempts?: number;
    failed_attempts?: number;
    success_rate?: number;
  };
  trust?: {
    level?: string;
    score?: number | null;
    sample_size?: number;
  };
  payouts?: {
    count?: number;
    total?: number;
    window_days?: number;
    window_total?: number;
  };
}

export interface NetworkSnapshot {
  summary: NetworkSummary;
  nodes: NetworkNode[];
  job_summary?: {
    queued_jobs?: number;
    jobs_completed_today?: number;
    total_distributed?: number;
  };
}

export interface NetworkJobDetail {
  id: string;
  status: string;
  stage?: string;
  progress?: number;
  node_id?: string | null;
  model?: string;
  task_type?: string;
  reward?: number;
  timestamp?: number;
  completed_at?: number;
  model_metadata?: {
    pipeline?: string;
    tier?: string;
    model_name?: string;
  };
}

export interface NetworkFetchResult<T> {
  data: T | null;
  offline: boolean;
}

// ─── Balance ────────────────────────────────────────────────

export async function fetchCreditBalance(wallet: string): Promise<CreditBalance> {
  const res = await fetch(`${API_BASE}/credits/balance?wallet=${encodeURIComponent(wallet)}`);
  if (!res.ok) throw new Error(`Balance fetch failed: ${res.status}`);
  return res.json();
}

// ─── Session ────────────────────────────────────────────────
// The server never reads the wallet from the request body for money
// operations -- that is what allowed any caller to spend from any address.
// Instead the client proves ownership once with a signature and then carries
// a bearer token. Held in memory only: a token in localStorage would outlive
// the tab and is not worth the XSS exposure.

let sessionToken: string | null = null;
let sessionWallet: string | null = null;
let sessionPromise: Promise<string | null> | null = null;

type SignFn = (address: string, message: string) => Promise<string>;

export function clearAstraSession(): void {
  sessionToken = null;
  sessionWallet = null;
  sessionPromise = null;
}

async function requestSession(wallet: string, sign: SignFn): Promise<string | null> {
  const nonceRes = await fetch(`${API_BASE}/wallet/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, purpose: "astra_session" }),
  });
  if (!nonceRes.ok) return null;

  const { nonce, message } = await nonceRes.json();
  if (!nonce || !message) return null;

  const signature = await sign(wallet, message);

  const sessionRes = await fetch(`${API_BASE}/astra/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, nonce, signature }),
  });
  if (!sessionRes.ok) return null;

  const data = await sessionRes.json();
  return typeof data.token === "string" ? data.token : null;
}

/**
 * Ensure a live session for `wallet`, prompting for a signature if needed.
 * Concurrent callers share one in-flight handshake so the player never sees
 * two wallet popups at once.
 */
export async function ensureAstraSession(wallet: string, sign: SignFn): Promise<string | null> {
  if (sessionToken && sessionWallet === wallet) return sessionToken;
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    try {
      const token = await requestSession(wallet, sign);
      sessionToken = token;
      sessionWallet = token ? wallet : null;
      return token;
    } catch {
      clearAstraSession();
      return null;
    } finally {
      sessionPromise = null;
    }
  })();

  return sessionPromise;
}

export function hasAstraSession(wallet: string): boolean {
  return Boolean(sessionToken) && sessionWallet === wallet;
}

async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit,
  retries = 2,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

/** POST to an authorized endpoint, re-running the handshake once on 401. */
async function authorizedPost(
  path: string,
  body: Record<string, unknown>,
  wallet: string,
  sign: SignFn,
): Promise<Response | null> {
  let token = await ensureAstraSession(wallet, sign);
  if (!token) return null;

  const send = (bearer: string) =>
    fetchWithRetry(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(body),
    });

  let res = await send(token);
  if (res.status === 401) {
    // Token expired or was revoked server-side; one retry with a fresh one.
    clearAstraSession();
    token = await ensureAstraSession(wallet, sign);
    if (!token) return null;
    res = await send(token);
  }
  return res;
}

// ─── Spend (Phase 2) ───────────────────────────────────────

export type SpendAction = "gacha_1" | "gacha_10" | "continue" | "boost_damage";

export async function astraSpend(
  wallet: string,
  action: SpendAction,
  sign: SignFn,
  idempotencyKey?: string,
): Promise<SpendResult> {
  const res = await authorizedPost(
    "/astra/spend",
    { action, idempotency_key: idempotencyKey ?? crypto.randomUUID() },
    wallet,
    sign,
  );
  if (!res) return { ok: false, reason: "session_required" };
  return res.json();
}

// ─── Runs (Phase 3) ────────────────────────────────────────

export interface RunHandle {
  run_token: string;
  started_at: number;
}

export interface ArtifactRequestResult {
  ok: boolean;
  reason?: string;
  job_id?: string;
  status?: "queued" | "existing";
  wait_seconds?: number;
  cap?: number;
}

/**
 * Open a run server-side. The returned token is what makes the reward
 * submission credible: the server times the run itself rather than trusting
 * a duration the client reports.
 */
export async function astraStartRun(
  wallet: string,
  mapId: string,
  sign: SignFn,
): Promise<RunHandle | null> {
  try {
    const res = await authorizedPost("/astra/run/start", { map_id: mapId }, wallet, sign);
    if (!res || !res.ok) return null;
    const data = await res.json();
    return typeof data.run_token === "string" ? data : null;
  } catch {
    return null;
  }
}

/** Start the personalized still after the coordinator has observed real play. */
export async function preflightRewardImage(
  wallet: string,
  runToken: string,
  pilotId: string,
  outfitId: string,
  mapId: string,
  sign: SignFn,
): Promise<ArtifactRequestResult> {
  try {
    const res = await authorizedPost(
      "/astra/generate-preflight",
      { run_token: runToken, pilot_id: pilotId, outfit_id: outfitId, map_id: mapId },
      wallet,
      sign,
    );
    if (!res) return { ok: false, reason: "session_required" };
    return await res.json();
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

export async function astraReward(
  wallet: string,
  score: number,
  grade: string,
  durationS: number,
  mapId: string,
  runToken: string,
  sign: SignFn,
): Promise<RewardResult> {
  const res = await authorizedPost(
    "/astra/reward",
    {
      score,
      grade,
      duration_s: durationS,
      map_id: mapId,
      run_token: runToken,
    },
    wallet,
    sign,
  );
  if (!res) return { ok: false, reason: "session_required" };
  return res.json();
}

// ─── Stats & Leaderboard (Phase 3) ─────────────────────────

export async function fetchPlayerStats(wallet: string): Promise<PlayerStats> {
  const res = await fetch(`${API_BASE}/astra/stats?wallet=${encodeURIComponent(wallet)}`);
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardFetchResult> {
  try {
    const res = await fetchWithRetry(`${API_BASE}/astra/leaderboard?limit=${limit}`, {});
    if (!res.ok) {
      return { entries: [], offline: true };
    }

    const data = await res.json();
    return {
      entries: Array.isArray(data.leaderboard) ? data.leaderboard : [],
      offline: false,
    };
  } catch {
    return { entries: [], offline: true };
  }
}

// ─── Creator Network ────────────────────────────────────────

/** Fetch the public creator topology and its real settlement totals. */
export async function fetchNetworkSnapshot(): Promise<NetworkFetchResult<NetworkSnapshot>> {
  try {
    const res = await fetchWithRetry(`${API_BASE}/nodes`, {});
    if (!res.ok) return { data: null, offline: true };
    const raw = await res.json() as Partial<NetworkSnapshot>;
    if (!raw.summary || !Array.isArray(raw.nodes)) {
      return { data: null, offline: true };
    }
    return { data: raw as NetworkSnapshot, offline: false };
  } catch {
    return { data: null, offline: true };
  }
}

/** Fetch assignment, stage, model, progress, and settlement for one render. */
export async function fetchNetworkJob(jobId: string): Promise<NetworkJobDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}`);
    if (!res.ok) return null;
    const raw = await res.json() as Partial<NetworkJobDetail>;
    return typeof raw.id === "string" ? raw as NetworkJobDetail : null;
  } catch {
    return null;
  }
}

// ─── Reward Images & Gallery ────────────────────────────────
// The flywheel: finish a run, the network generates art for YOUR pilot.
// The client sends IDs only — prompts are composed server-side from
// locked templates, so there is nothing to inject.

export interface GenerateRewardResult {
  ok: boolean;
  reason?: string;
  job_id?: string;
  status?: "queued" | "existing";
}

/** Request a personalized reward image for a completed, rewarded run. */
export async function generateRewardImage(
  wallet: string,
  runId: string,
  pilotId: string,
  outfitId: string,
  mapId: string,
  sign: SignFn,
): Promise<GenerateRewardResult> {
  try {
    const res = await authorizedPost(
      "/astra/generate-reward",
      { run_id: runId, pilot_id: pilotId, outfit_id: outfitId, map_id: mapId },
      wallet,
      sign,
    );
    if (!res) return { ok: false, reason: "session_required" };
    return await res.json();
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

export interface GalleryImage {
  run_id: string;
  job_id: string;
  pilot_id: string;
  outfit_id: string;
  map_id: string;
  grade: string;
  status: "pending" | "completed" | "failed";
  created_at: number;
  image_url?: string;
  preview_url?: string;
  video_job_id?: string;
  video_status?: "pending" | "completed" | "failed";
  video_url?: string;
}

/** Animate a completed wallet-owned Astra still with LTX 2.3. */
export async function animateRewardArtifact(
  wallet: string,
  jobId: string,
  sign: SignFn,
): Promise<ArtifactRequestResult> {
  try {
    const res = await authorizedPost("/astra/animate-reward", { job_id: jobId }, wallet, sign);
    if (!res) return { ok: false, reason: "session_required" };
    return await res.json();
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

/** Fetch the player's generated reward images (pending, completed, failed). */
export async function fetchGalleryImages(
  wallet: string,
): Promise<{ images: GalleryImage[]; offline: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/astra/gallery?wallet=${encodeURIComponent(wallet)}`);
    if (!res.ok) return { images: [], offline: true };
    const data = await res.json();
    return { images: Array.isArray(data.images) ? data.images : [], offline: false };
  } catch {
    return { images: [], offline: true };
  }
}

/**
 * An asset the player owns on JoinHavn, claimed through the marketplace.
 *
 * Distinct from GalleryImage: those are reward renders Astra asked the
 * network to paint. These are assets the player owns outright and can
 * sell, which is why ownership has to be re-checked rather than cached
 * forever — see `fetchOwnedAssets`.
 */
export interface OwnedAsset {
  job_id: string;
  title: string;
  category?: string;
  image_url?: string;
  video_url?: string;
  preview_url?: string;
}

/**
 * Fetch the assets this wallet currently owns in its JoinHavn Collection.
 *
 * `offline: true` means "could not verify", which is deliberately different
 * from an empty list: selling an asset must retire a cosmetic that uses it,
 * but a dropped connection must not.
 */
export async function fetchOwnedAssets(
  wallet: string,
): Promise<{ assets: OwnedAsset[]; offline: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/gallery/collection?wallet=${encodeURIComponent(wallet)}`);
    if (!res.ok) return { assets: [], offline: true };
    const data = await res.json();
    const raw = Array.isArray(data.assets) ? data.assets : [];
    return {
      assets: raw
        .filter((a: Record<string, unknown>) => typeof a?.job_id === "string")
        .map((a: Record<string, unknown>) => ({
          job_id: String(a.job_id),
          title: String(a.title || "Untitled asset"),
          category: typeof a.category === "string" ? a.category : undefined,
          image_url: typeof a.image_url === "string" ? a.image_url : undefined,
          video_url: typeof a.video_url === "string" ? a.video_url : undefined,
          preview_url: typeof a.preview_url === "string" ? a.preview_url : undefined,
        })),
      offline: false,
    };
  } catch {
    return { assets: [], offline: true };
  }
}
