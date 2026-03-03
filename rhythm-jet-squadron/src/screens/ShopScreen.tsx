/**
 * Shop Screen - Gacha pulls for outfits.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import CardArt from "../components/CardArt";
import CutinOverlay from "../components/CutinOverlay";
import { pullOne, pullTen, PULL_COST_1, PULL_COST_10 } from "../lib/gacha";
import type { GachaResult } from "../types";

const RARITY_COLORS: Record<string, string> = {
  Common: "#a8a8a8",
  Rare: "#339af0",
  SR: "#be4bdb",
  SSR: "#ffd43b",
};

export default function ShopScreen() {
  const navigate = useNavigate();
  const { save, spendCredits, applyGachaResults } = useGame();
  const [results, setResults] = useState<GachaResult[] | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [activeCutin, setActiveCutin] = useState<{ id: number; url: string } | null>(null);

  const doPull = (count: 1 | 10) => {
    const cost = count === 1 ? PULL_COST_1 : PULL_COST_10;
    if (save.credits < cost) return;

    const success = spendCredits(cost);
    if (!success) return;

    const pulled =
      count === 1
        ? [pullOne(save.ownedOutfits)]
        : pullTen(save.ownedOutfits);

    applyGachaResults(pulled);
    setIsRevealing(true);
    setResults(pulled);

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
  };

  return (
    <div className="screen shop-screen">
      <div className="screen-header">
        <button className="btn btn-back" onClick={() => navigate("/")}>← Back</button>
        <h2>Outfit Shop</h2>
      </div>

      <div className="shop-credits">
        <span className="credit-icon">✦</span> {save.credits} Credits
      </div>

      <div className="shop-buttons">
        <button
          className="btn btn-gacha"
          onClick={() => doPull(1)}
          disabled={save.credits < PULL_COST_1 || isRevealing}
        >
          <div className="gacha-btn-title">1-Pull</div>
          <div className="gacha-btn-cost">{PULL_COST_1} Credits</div>
        </button>
        <button
          className="btn btn-gacha btn-gacha-10"
          onClick={() => doPull(10)}
          disabled={save.credits < PULL_COST_10 || isRevealing}
        >
          <div className="gacha-btn-title">10-Pull</div>
          <div className="gacha-btn-cost">{PULL_COST_10} Credits</div>
        </button>
      </div>

      <div className="shop-rates">
        <h4>Pull Rates</h4>
        <div className="rate-list">
          <span style={{ color: RARITY_COLORS.Common }}>Common: 70%</span>
          <span style={{ color: RARITY_COLORS.Rare }}>Rare: 20%</span>
          <span style={{ color: RARITY_COLORS.SR }}>SR: 9%</span>
          <span style={{ color: RARITY_COLORS.SSR }}>SSR: 1%</span>
        </div>
      </div>

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
                >
                  <CardArt
                    artUrl={r.outfit.artUrl}
                    placeholder={r.outfit.artPlaceholder}
                    label={r.outfit.name}
                    className="card-art-small"
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
