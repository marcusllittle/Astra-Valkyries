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

  const hasSharedBalance = wallet.status === "connected" && wallet.sharedBalance !== null && wallet.sharedBalance > 0;

  const canAffordWithCredits = (count: 1 | 10) => save.credits >= (count === 1 ? PULL_COST_1 : PULL_COST_10);
  const canAffordWithShared = (count: 1 | 10) => (wallet.sharedBalance ?? 0) >= (count === 1 ? SHARED_COST_1 : SHARED_COST_10);
  const shouldUseSharedForPull = (count: 1 | 10) => !canAffordWithCredits(count) && hasSharedBalance && canAffordWithShared(count);

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

    const useSharedForThisPull = shouldUseSharedForPull(count);

    // ── Shared credits path, only as fallback when local credits cannot cover the pull ──
    if (useSharedForThisPull && wallet.address) {
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
        wallet.refreshBalance();
      } catch {
        setSpending(false);
        return;
      }
      setSpending(false);
    } else {
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

  const featuredPull = results
    ? [...results].sort((left, right) => RARITY_RANK[right.outfit.rarity] - RARITY_RANK[left.outfit.rarity])[0] ?? null
    : null;

  const srPityPct = Math.min(100, (pity.pullsSinceSR / PITY_THRESHOLD_SR) * 100);
  const ssrPityPct = Math.min(100, (pity.pullsSinceSSR / PITY_THRESHOLD_SSR) * 100);

  return (
    <div className="screen shop-screen">
      <header className="shop-hero panel-surface">
        <div className="shop-hero-copy">
          <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
          <span className="shop-kicker">Black market outfit exchange</span>
          <h1 className="shop-title">Summon Bay</h1>
          <p className="shop-flavor">
            Pull for pilot-exclusive looks, combat kits, and the kind of premium mission loadout that makes the next sortie feel unfair.
          </p>
        </div>

        <div className="shop-hero-economy">
          <div className="shop-credits-row">
            <div className="shop-credits">
              <span className="credit-icon">✦</span> {save.credits.toLocaleString()} Credits
            </div>
            {hasSharedBalance && (
              <div className="shop-credits shop-credits-shared">
                <span className="shared-icon">&#x26A1;</span> {(wallet.sharedBalance ?? 0).toLocaleString()} HavnAI
                <span className="shared-active-badge">Active</span>
              </div>
            )}
          </div>
          <p className="shop-economy-note">
            {hasSharedBalance
              ? "Local credits spend first. Shared HavnAI only fires when you come up short."
              : "High-rarity pulls unlock sharper kits, better cut-ins, and stronger identity in the lane."}
          </p>
          <div className="shop-economy-micro">
            <span>SR pity in {Math.max(0, PITY_THRESHOLD_SR - pity.pullsSinceSR)} pulls</span>
            <span>SSR pity in {Math.max(0, PITY_THRESHOLD_SSR - pity.pullsSinceSSR)} pulls</span>
          </div>
        </div>
      </header>

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
              <span className="shop-featured-kicker">Rate-up live</span>
              <strong className="shop-featured-name">{featured.name}</strong>
              <span className="rarity-text" style={{ color: RARITY_COLORS[featured.rarity] }}>
                {featured.rarity}
              </span>
              <div className="perk-label">{summarizeOutfitKit(featured)}</div>
              <p className="shop-featured-flavor">If you are going to chase something expensive, chase the one that actually changes how the sortie feels.</p>
            </div>
          </div>
        </section>
      )}

      <div className="shop-layout">
        <section className="shop-pulls panel-surface">
          <div className="shop-section-head">
            <div>
              <span className="shop-section-kicker">Summon controls</span>
              <h3>Pull the banner</h3>
            </div>
            <span className="shop-section-note">Pick your spend, then let the bay decide how generous it wants to be.</span>
          </div>
          <div className="shop-buttons">
            <button
              className="btn btn-gacha"
              onClick={() => doPull(1)}
              disabled={
                spending || isRevealing ||
                (!canAffordWithCredits(1) && !canAffordWithShared(1))
              }
            >
              <div className="gacha-btn-title">1-Pull</div>
              <div className="gacha-btn-cost">
                {shouldUseSharedForPull(1) ? `${SHARED_COST_1} HavnAI` : `${PULL_COST_1} Credits`}
              </div>
            </button>
            <button
              className="btn btn-gacha btn-gacha-10"
              onClick={() => doPull(10)}
              disabled={
                spending || isRevealing ||
                (!canAffordWithCredits(10) && !canAffordWithShared(10))
              }
            >
              <div className="gacha-btn-title">10-Pull</div>
              <div className="gacha-btn-cost">
                {shouldUseSharedForPull(10) ? `${SHARED_COST_10} HavnAI` : `${PULL_COST_10} Credits`}
              </div>
            </button>
          </div>
        </section>

        <section className="shop-rates panel-surface">
          <div className="shop-section-head shop-section-head-tight">
            <div>
              <span className="shop-section-kicker">Banner intel</span>
              <h4>Odds and pressure</h4>
            </div>
          </div>
          <div className="rate-list">
            <span style={{ color: RARITY_COLORS.Common }}>Common: 70%</span>
            <span style={{ color: RARITY_COLORS.Rare }}>Rare: 20%</span>
            <span style={{ color: RARITY_COLORS.SR }}>SR: 9%</span>
            <span style={{ color: RARITY_COLORS.SSR }}>SSR: 1%</span>
          </div>
          <p className="shop-note">SSR reveals still use static art, but the drop itself lands correctly.</p>
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
            <div className="gacha-results-head">
              <span className="shop-section-kicker">Summon result</span>
              <h3>{featuredPull?.isNew ? "You hit something worth keeping" : "Pull complete"}</h3>
              <p className="shop-note">
                {featuredPull
                  ? `${featuredPull.outfit.name} landed as your top pull. ${featuredPull.isNew ? "New acquisition." : `Duplicate converted into +${featuredPull.shardsGained} shards.`}`
                  : "Review the pull stack and inspect anything worth a second look."}
              </p>
            </div>

            {featuredPull && (
              <button
                type="button"
                className={`gacha-featured-result rarity-${featuredPull.outfit.rarity.toLowerCase()}`}
                onClick={() => setPreviewResult(featuredPull)}
              >
                <CardArt
                  title={featuredPull.outfit.name}
                  artUrl={featuredPull.outfit.artUrl}
                  artPlaceholder={featuredPull.outfit.artPlaceholder}
                  rarity={featuredPull.outfit.rarity}
                  className="shop-featured-art"
                  motionMode="never"
                />
                <div className="gacha-featured-copy">
                  <span className="shop-section-kicker">Top pull</span>
                  <strong className="shop-featured-name">{featuredPull.outfit.name}</strong>
                  <span className="rarity-text" style={{ color: RARITY_COLORS[featuredPull.outfit.rarity] }}>
                    {featuredPull.outfit.rarity}
                  </span>
                  <div className="perk-label">{summarizeOutfitKit(featuredPull.outfit)}</div>
                  {featuredPull.isNew ? (
                    <span className="new-badge">NEW acquisition</span>
                  ) : (
                    <span className="shard-badge">Duplicate converted, +{featuredPull.shardsGained} shards</span>
                  )}
                </div>
              </button>
            )}

            <div className="gacha-results-grid">
              {results.map((r, i) => (
                <button
                  type="button"
                  key={i}
                  className={`gacha-result-card rarity-${r.outfit.rarity.toLowerCase()} ${featuredPull === r ? "gacha-result-card-featured" : ""}`}
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
                    <strong className="gacha-result-name">{r.outfit.name}</strong>
                    {r.isNew ? (
                      <span className="new-badge">NEW</span>
                    ) : (
                      <span className="shard-badge">+{r.shardsGained} shards</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={closeResults}>
              Lock It In
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
