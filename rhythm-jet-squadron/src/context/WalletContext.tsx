/**
 * Wallet context for Astra Valkyries.
 *
 * Provides MetaMask wallet connection state and shared HavnAI credit balance
 * (read-only in Phase 1). Sits alongside the existing GameContext — does not
 * replace the local credit system.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  type WalletStatus,
  hasInjectedProvider,
  connectWallet,
  tryRestore,
  persistAddress,
  shortAddress,
  getActiveProvider,
} from "../lib/wallet";
import { fetchCreditBalance } from "../lib/havnApi";

interface WalletContextValue {
  /** Connection status */
  status: WalletStatus;
  /** Connected wallet address (lowercase, full) */
  address: string | null;
  /** Formatted short address (0x12...ab) */
  short: string | null;
  /** Shared HavnAI credit balance (null if not fetched yet) */
  sharedBalance: number | null;
  /** Whether MetaMask is available */
  available: boolean;
  /** Last error message */
  error: string | null;
  /** Connect wallet (opens MetaMask popup) */
  connect: () => Promise<void>;
  /** Disconnect wallet (local-only, clears state) */
  disconnect: () => void;
  /** Refresh shared balance */
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [sharedBalance, setSharedBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const available = hasInjectedProvider();

  // ─── Fetch balance helper ────────────────────────────────
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const data = await fetchCreditBalance(address);
      if (mountedRef.current) setSharedBalance(data.balance);
    } catch {
      // Silently ignore — balance display will just stay null
    }
  }, [address]);

  // ─── Silent restore on mount ─────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const restored = await tryRestore();
      if (restored && mountedRef.current) {
        setAddress(restored);
        setStatus("connected");
      }
    })();
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch balance whenever address changes ──────────────
  useEffect(() => {
    if (address) refreshBalance();
  }, [address, refreshBalance]);

  // ─── Listen for account changes ──────────────────────────
  useEffect(() => {
    const provider = getActiveProvider();
    if (!provider?.on) return;
    const handler = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setAddress(null);
        setSharedBalance(null);
        setStatus("disconnected");
        persistAddress(null);
      } else {
        const addr = accounts[0].toLowerCase();
        setAddress(addr);
        setStatus("connected");
        persistAddress(addr);
      }
    };
    provider.on("accountsChanged", handler);
    return () => provider.removeListener?.("accountsChanged", handler);
  }, []);

  // ─── Connect ─────────────────────────────────────────────
  const connect = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const addr = await connectWallet();
      setAddress(addr);
      setStatus("connected");
      persistAddress(addr);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Wallet connection failed";
      setError(msg);
      setStatus("error");
    }
  }, []);

  // ─── Disconnect ──────────────────────────────────────────
  const disconnect = useCallback(() => {
    setAddress(null);
    setSharedBalance(null);
    setStatus("disconnected");
    setError(null);
    persistAddress(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        status,
        address,
        short: address ? shortAddress(address) : null,
        sharedBalance,
        available,
        error,
        connect,
        disconnect,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
