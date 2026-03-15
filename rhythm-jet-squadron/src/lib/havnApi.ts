/**
 * API client for HavnAI backend.
 * Phase 1: balance | Phase 2: spend | Phase 3: reward + leaderboard
 */

const API_BASE = import.meta.env.VITE_HAVNAI_API_BASE ?? "https://api.joinhavn.io";

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

// ─── Balance ────────────────────────────────────────────────

export async function fetchCreditBalance(wallet: string): Promise<CreditBalance> {
  const res = await fetch(`${API_BASE}/credits/balance?wallet=${encodeURIComponent(wallet)}`);
  if (!res.ok) throw new Error(`Balance fetch failed: ${res.status}`);
  return res.json();
}

// ─── Spend (Phase 2) ───────────────────────────────────────

export type SpendAction = "gacha_1" | "gacha_10" | "continue" | "boost_damage";

export async function astraSpend(wallet: string, action: SpendAction): Promise<SpendResult> {
  const res = await fetch(`${API_BASE}/astra/spend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, action }),
  });
  return res.json();
}

// ─── Reward (Phase 3) ──────────────────────────────────────

export async function astraReward(
  wallet: string,
  score: number,
  grade: string,
  durationS: number,
  mapId: string,
): Promise<RewardResult> {
  const res = await fetch(`${API_BASE}/astra/reward`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, score, grade, duration_s: durationS, map_id: mapId }),
  });
  return res.json();
}

// ─── Stats & Leaderboard (Phase 3) ─────────────────────────

export async function fetchPlayerStats(wallet: string): Promise<PlayerStats> {
  const res = await fetch(`${API_BASE}/astra/stats?wallet=${encodeURIComponent(wallet)}`);
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/astra/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
  const data = await res.json();
  return data.leaderboard;
}
