/**
 * Minimal API client for HavnAI backend.
 * Phase 1: read-only balance check only.
 */

const API_BASE = import.meta.env.VITE_HAVNAI_API_BASE ?? "https://api.joinhavn.io";

export interface CreditBalance {
  wallet: string;
  balance: number;
  total_deposited: number;
  total_spent: number;
}

/** Fetch shared HavnAI credit balance for a wallet address */
export async function fetchCreditBalance(wallet: string): Promise<CreditBalance> {
  const res = await fetch(`${API_BASE}/credits/balance?wallet=${encodeURIComponent(wallet)}`);
  if (!res.ok) throw new Error(`Balance fetch failed: ${res.status}`);
  return res.json();
}
