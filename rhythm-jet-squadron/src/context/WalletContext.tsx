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
  signMessage,
} from "../lib/wallet";
import { fetchCreditBalance, clearAstraSession, ensureAstraSession } from "../lib/havnApi";

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
  /**
   * Sign a message with the connected wallet. Passed to the economy API
   * calls, which use it to establish a session on first use.
   */
  sign: (address: string, message: string) => Promise<string>;
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
      // The session token is bound to the previous address server-side.
      clearAstraSession();
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
      // Establish the economy session now, while the player is already in a
      // wallet interaction. One signature here means run starts and gacha
      // pulls never surface a popup mid-game.
      void ensureAstraSession(addr, signMessage).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Wallet connection failed";
      setError(msg);
      setStatus("error");
    }
  }, []);

  // ─── Disconnect ──────────────────────────────────────────
  const disconnect = useCallback(() => {
    clearAstraSession();
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
        sign: signMessage,
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
