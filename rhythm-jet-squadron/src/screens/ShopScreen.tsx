/**
 * Shop Screen - Gacha pulls with featured banner and pity counter.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { useWallet } from "../context/WalletContext";
import CardArt from "../components/CardArt";
import CutinOverlay from "../components/CutinOverlay";
import { summarizeOutfitKit } from "../lib/outfitKits";
import {
  pullOne,
  pullTen,
  PULL_COST_1,
  PULL_COST_10,
  getFeaturedOutfit,
  loadPityState,
  savePityState,
  PITY_THRESHOLD_SR,
  PITY_THRESHOLD_SSR,
  type PityState,
} from "../lib/gacha";
import { astraSpend } from "../lib/havnApi";
import type { GachaResult } from "../types";

/** Shared credit costs (rebalanced for real economy) */
const SHARED_COST_1 = 10;
const SHARED_COST_10 = 80;

const RARITY_COLORS: Record<string, string> = {
  Common: "#a8a8a8",
  Rare: "#339af0",
  SR: "#be4bdb",
  SSR: "#ffd43b",
};

const RARITY_RANK: Record<string, number> = {
  Common: 1,
  Rare: 2,
  SR: 3,
  SSR: 4,
};

export default function ShopScreen() {
  const navigate = useNavigate();
  const { save, spendCredits, applyGachaResults } = useGame();
  const wallet = useWallet();
  const [results, setResults] = useState<GachaResult[] | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [activeCutin, setActiveCutin] = useState<{ id: number; url: string } | null>(null);
  const [previewResult, setPreviewResult] = useState<GachaResult | null>(null);
  const [spending, setSpending] = useState(false);
  const [pity, setPity] = useState<PityState>(loadPityState);

  const featured = getFeaturedOutfit();

  // Sync pity state on mount
  useEffect(() => {
    setPity(loadPityState());
  }, []);

  /** Whether we're in shared-credits mode (wallet connected with a balance) */
  const useShared = wallet.status === "connected" && wallet.sharedBalance !== null && wallet.sharedBalance > 0;

  const updatePityAfterPull = (pulled: GachaResult[]) => {
    const newPity = { ...pity };
    for (const r of pulled) {
      newPity.totalPulls += 1;
      newPity.pullsSinceSR += 1;
      newPity.pullsSinceSSR += 1;
      if (r.outfit.rarity === "SR" || r.outfit.rarity === "SSR") {
        newPity.pullsSinceSR = 0;
      }
      if (r.outfit.rarity === "SSR") {
        newPity.pullsSinceSSR = 0;
      }
    }
    savePityState(newPity);
    setPity(newPity);
  };

  const doPull = async (count: 1 | 10) => {
    if (spending || isRevealing) return;

    // ── Shared credits path (wallet connected) ───────────
    if (useShared && wallet.address) {
      const action = count === 1 ? "gacha_1" as const : "gacha_10" as const;
      const cost = count === 1 ? SHARED_COST_1 : SHARED_COST_10;
      if ((wallet.sharedBalance ?? 0) < cost) return;

      setSpending(true);
      try {
        const res = await astraSpend(wallet.address, action);
        if (!res.ok) {
          setSpending(false);
          return;
        }
        // Refresh balance after spend
        wallet.refreshBalance();
      } catch {
        setSpending(false);
        return;
      }
      setSpending(false);
    } else {
      // ── Local credits path (offline / anonymous) ───────
      const cost = count === 1 ? PULL_COST_1 : PULL_COST_10;
      if (save.credits < cost) return;
      const success = spendCredits(cost);
      if (!success) return;
    }

    const pulled =
      count === 1
        ? [pullOne(save.ownedOutfits)]
        : pullTen(save.ownedOutfits);

    applyGachaResults(pulled);
    updatePityAfterPull(pulled);
    setIsRevealing(true);
    setResults(pulled);
    const featured = [...pulled].sort(
      (left, right) => RARITY_RANK[right.outfit.rarity] - RARITY_RANK[left.outfit.rarity]
    )[0] ?? null;
    setPreviewResult(featured);

    const ssrCutin = pulled.find(
      (result) => result.outfit.rarity === "SSR" && result.outfit.cutinUrl
    )?.outfit.cutinUrl;

    if (ssrCutin) {
      setActiveCutin({ id: Date.now(), url: ssrCutin });
    }
  };

  const closeResults = () => {
    setResults(null);
    setIsRevealing(false);
    setPreviewResult(null);
  };

  const srPityPct = Math.min(100, (pity.pullsSinceSR / PITY_THRESHOLD_SR) * 100);
  const ssrPityPct = Math.min(100, (pity.pullsSinceSSR / PITY_THRESHOLD_SSR) * 100);

  return (
    <div className="screen shop-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <div className="header-title-stack">
          <h2>Outfit Shop</h2>
          <p>Acquire pilot-specific kits, rare cosmetics, and premium deploy loadouts.</p>
        </div>
      </div>

      <section className="shop-hero panel-surface">
        <div className="shop-credits-row">
          <div className="shop-credits">
            <span className="credit-icon">✦</span> {save.credits.toLocaleString()} Credits
          </div>
          {useShared && (
            <div className="shop-credits shop-credits-shared">
              <span className="shared-icon">&#x26A1;</span> {(wallet.sharedBalance ?? 0).toLocaleString()} HavnAI
              <span className="shared-active-badge">Active</span>
            </div>
          )}
        </div>
        <p className="shop-flavor">
          {useShared
            ? "Pulling with shared HavnAI credits. Costs are rebalanced for the shared economy."
            : "Limited wardrobe uplink is active. High-rarity pulls unlock advanced kits and cut-ins."}
        </p>
      </section>

      {/* Featured Banner */}
      {featured && (
        <section className="shop-featured panel-surface">
          <div className="shop-featured-badge">FEATURED</div>
          <div className="shop-featured-content">
            <CardArt
              title={featured.name}
              artUrl={featured.artUrl}
                            artPlaceholder={featured.artPlaceholder}
              rarity={featured.rarity}
              className="shop-featured-art"
              motionMode="never"
            />
            <div className="shop-featured-info">
              <strong className="shop-featured-name">{featured.name}</strong>
              <span className="rarity-text" style={{ color: RARITY_COLORS[featured.rarity] }}>
                {featured.rarity}
              </span>
              <div className="perk-label">{summarizeOutfitKit(featured)}</div>
              <p className="shop-featured-flavor">Rate-up this week. SSR drops have increased odds of pulling this outfit.</p>
            </div>
          </div>
        </section>
      )}

      <div className="shop-layout">
        <section className="shop-pulls panel-surface">
          <h3>Summon Bay</h3>
          <div className="shop-buttons">
            <button
              className="btn btn-gacha"
              onClick={() => doPull(1)}
              disabled={
                spending || isRevealing ||
                (useShared ? (wallet.sharedBalance ?? 0) < SHARED_COST_1 : save.credits < PULL_COST_1)
              }
            >
              <div className="gacha-btn-title">1-Pull</div>
              <div className="gacha-btn-cost">
                {useShared ? `${SHARED_COST_1} HavnAI` : `${PULL_COST_1} Credits`}
              </div>
            </button>
            <button
              className="btn btn-gacha btn-gacha-10"
              onClick={() => doPull(10)}
              disabled={
                spending || isRevealing ||
                (useShared ? (wallet.sharedBalance ?? 0) < SHARED_COST_10 : save.credits < PULL_COST_10)
              }
            >
              <div className="gacha-btn-title">10-Pull</div>
              <div className="gacha-btn-cost">
                {useShared ? `${SHARED_COST_10} HavnAI` : `${PULL_COST_10} Credits`}
              </div>
            </button>
          </div>
        </section>

        <section className="shop-rates panel-surface">
          <h4>Drop Rates</h4>
          <div className="rate-list">
            <span style={{ color: RARITY_COLORS.Common }}>Common: 70%</span>
            <span style={{ color: RARITY_COLORS.Rare }}>Rare: 20%</span>
            <span style={{ color: RARITY_COLORS.SR }}>SR: 9%</span>
            <span style={{ color: RARITY_COLORS.SSR }}>SSR: 1%</span>
          </div>
          <p className="shop-note">SSR reveals are currently shown with static art.</p>
        </section>
      </div>

      {/* Pity Counters */}
      <section className="shop-pity panel-surface">
        <h4>Pity Progress</h4>
        <p className="shop-pity-note">Guaranteed SR at {PITY_THRESHOLD_SR} pulls, SSR at {PITY_THRESHOLD_SSR} pulls without one.</p>
        <div className="shop-pity-bars">
          <div className="shop-pity-row">
            <span className="shop-pity-label" style={{ color: RARITY_COLORS.SR }}>SR Pity</span>
            <div className="shop-pity-track">
              <div className="shop-pity-fill shop-pity-fill-sr" style={{ width: `${srPityPct}%` }} />
            </div>
            <span className="shop-pity-count">{pity.pullsSinceSR}/{PITY_THRESHOLD_SR}</span>
          </div>
          <div className="shop-pity-row">
            <span className="shop-pity-label" style={{ color: RARITY_COLORS.SSR }}>SSR Pity</span>
            <div className="shop-pity-track">
              <div className="shop-pity-fill shop-pity-fill-ssr" style={{ width: `${ssrPityPct}%` }} />
            </div>
            <span className="shop-pity-count">{pity.pullsSinceSSR}/{PITY_THRESHOLD_SSR}</span>
          </div>
        </div>
        <div className="shop-pity-total">Total pulls: {pity.totalPulls}</div>
      </section>

      {/* Pull results modal */}
      {results && (
        <div className="gacha-results-overlay" onClick={closeResults}>
          <div className="gacha-results-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Pull Results</h3>
            <div className="gacha-results-grid">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`gacha-result-card rarity-${r.outfit.rarity.toLowerCase()}`}
                  onClick={() => setPreviewResult(r)}
                >
                  <CardArt
                    title={r.outfit.name}
                    artUrl={r.outfit.artUrl}
                                        artPlaceholder={r.outfit.artPlaceholder}
                    rarity={r.outfit.rarity}
                    className="card-art-small"
                    motionMode="never"
                  />
                  <div className="gacha-result-info">
                    <span
                      className="rarity-text"
                      style={{ color: RARITY_COLORS[r.outfit.rarity] }}
                    >
                      {r.outfit.rarity}
                    </span>
                    {r.isNew ? (
                      <span className="new-badge">NEW!</span>
                    ) : (
                      <span className="shard-badge">+{r.shardsGained} shards</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={closeResults}>
              OK
            </button>
          </div>
        </div>
      )}

      {previewResult && (
        <div className="card-preview-overlay" onClick={() => setPreviewResult(null)}>
          <div className="card-preview-modal panel-surface" onClick={(event) => event.stopPropagation()}>
            <div className={`card outfit-card card-preview-card rarity-${previewResult.outfit.rarity.toLowerCase()}`}>
              <CardArt
                title={previewResult.outfit.name}
                artUrl={previewResult.outfit.artUrl}
                                artPlaceholder={previewResult.outfit.artPlaceholder}
                rarity={previewResult.outfit.rarity}
                className="card-preview-art"
                motionMode="never"
              />
              <div className="card-info">
                <strong className="card-title">{previewResult.outfit.name}</strong>
                <span
                  className="rarity-text"
                  style={{ color: RARITY_COLORS[previewResult.outfit.rarity] }}
                >
                  {previewResult.outfit.rarity}
                </span>
                <div className="perk-label">{summarizeOutfitKit(previewResult.outfit)}</div>
                {previewResult.isNew ? (
                  <span className="new-badge">NEW Pull</span>
                ) : (
                  <span className="shard-badge">Duplicate • +{previewResult.shardsGained} shards</span>
                )}
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => setPreviewResult(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {activeCutin && (
        <CutinOverlay
          key={activeCutin.id}
          src={activeCutin.url}
          onComplete={() => setActiveCutin(null)}
        />
      )}
    </div>
  );
}
