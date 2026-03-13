/**
 * Lightweight MetaMask wallet connection for Astra Valkyries.
 * Mirrors the havnai-web wallet connection pattern but without
 * MetaMask SDK — just the injected provider (window.ethereum).
 */

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  error: string | null;
}

const WALLET_STORAGE_KEY = "astra-wallet-address";

/** Format address as 0x1234...5678 */
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Check if MetaMask (or compatible injected provider) is available */
export function hasInjectedProvider(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

/** Request account connection via MetaMask */
export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask.");
  }
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts.length) throw new Error("No accounts returned.");
  return accounts[0].toLowerCase();
}

/** Read currently connected accounts without prompting */
export async function readAccounts(): Promise<string[]> {
  if (!window.ethereum) return [];
  try {
    const accounts = (await window.ethereum.request({
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
  if (!saved || !hasInjectedProvider()) return null;
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
