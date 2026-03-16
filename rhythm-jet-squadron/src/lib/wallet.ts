/**
 * Wallet connection for Astra Valkyries.
 *
 * Uses the injected window.ethereum provider when available.
 */

// ─── Provider interface ──────────────────────────────────────

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  error: string | null;
}

const WALLET_STORAGE_KEY = "astra-wallet-address";

async function resolveProvider(): Promise<EthereumProvider | null> {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

// ─── Public API ──────────────────────────────────────────────

/** Format address as 0x1234...5678 */
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Check if any provider is potentially available (sync hint for UI) */
export function hasInjectedProvider(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

/** Request account connection */
export async function connectWallet(): Promise<string> {
  const provider = await resolveProvider();
  if (!provider) {
    throw new Error("No wallet provider available. Please install MetaMask.");
  }
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts.length) throw new Error("No accounts returned.");
  return accounts[0].toLowerCase();
}

/** Read currently connected accounts without prompting */
export async function readAccounts(): Promise<string[]> {
  const provider = await resolveProvider();
  if (!provider) return [];
  try {
    const accounts = (await provider.request({
      method: "eth_accounts",
    })) as string[];
    return accounts.map((a) => a.toLowerCase());
  } catch {
    return [];
  }
}

/** Try to restore a previously connected wallet (silent — no popup) */
export async function tryRestore(): Promise<string | null> {
  const saved = localStorage.getItem(WALLET_STORAGE_KEY);
  if (!saved) return null;
  const accounts = await readAccounts();
  if (accounts.includes(saved.toLowerCase())) return saved.toLowerCase();
  // Wallet no longer connected — clear stale entry
  localStorage.removeItem(WALLET_STORAGE_KEY);
  return null;
}

/** Persist the connected address for silent restore on reload */
export function persistAddress(addr: string | null): void {
  if (addr) {
    localStorage.setItem(WALLET_STORAGE_KEY, addr.toLowerCase());
  } else {
    localStorage.removeItem(WALLET_STORAGE_KEY);
  }
}

/**
 * Get the active provider for event listeners.
 * Returns the injected provider if available.
 */
export function getActiveProvider(): EthereumProvider | null {
  return window.ethereum ?? null;
}
