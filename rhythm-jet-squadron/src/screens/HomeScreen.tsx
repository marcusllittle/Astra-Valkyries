/**
 * Home Screen - Main menu with navigation buttons.
 */

import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { resolveAssetUrl } from "../lib/assetUrl";
import type { Pilot } from "../types";
import pilotsData from "../data/pilots.json";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { save } = useGame();
  const pilots = pilotsData as Pilot[];
  const featuredPilot = pilots.find((pilot) => pilot.id === save.selectedPilotId) ?? pilots[0];
  const featuredPilotArtUrl = resolveAssetUrl(featuredPilot?.artUrl);

  return (
    <div className="screen home-screen">
      <div className="home-atmosphere" aria-hidden />
      <div className="home-vignette" aria-hidden />

      <header className="home-topbar">
        <div className="home-credits-pill">
          <span className="credit-icon">✦</span> {save.credits.toLocaleString()} Credits
        </div>
      </header>

      <div className="home-hero-stage">
        <section className="home-title-block">
          <p className="home-kicker">Featured Sortie</p>
          <h1 className="game-title">Astra Valkyries</h1>
          <p className="subtitle">Assemble your squad. Tune your frame. Launch into the frontline.</p>
          <div className="home-banner-meta">
            <span className="home-meta-chip">Current Banner</span>
            <span className="home-meta-chip">Pilot Collection</span>
            <span className="home-meta-chip">Arcade Operations</span>
          </div>

          <nav className="home-action-cluster">
            <div className="home-primary-row">
              <button className="btn home-menu-btn home-menu-primary" onClick={() => navigate("/shmup")}>
                Deploy
              </button>
              <button className="btn home-menu-btn home-menu-primary" onClick={() => navigate("/hangar")}>
                Loadout
              </button>
            </div>
            <div className="home-secondary-row">
              <button className="btn home-menu-btn home-menu-secondary" onClick={() => navigate("/collection")}>
                Collection
              </button>
              <button className="btn home-menu-btn home-menu-secondary" onClick={() => navigate("/shop")}>
                Shop
              </button>
            </div>
            <button className="btn home-menu-btn home-menu-tertiary" onClick={() => navigate("/settings")}>
              Settings
            </button>
          </nav>
        </section>

        <aside className="home-feature-banner" aria-label="Featured pilot banner">
          <div
            className="home-feature-backdrop"
            style={{ background: featuredPilot?.artPlaceholder ?? "linear-gradient(145deg, #334a7d, #18274d)" }}
            aria-hidden
          />
          {featuredPilotArtUrl ? (
            <img
              src={featuredPilotArtUrl}
              alt={featuredPilot.name}
              className="home-feature-pilot"
              loading="eager"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <div className="home-feature-overlay" aria-hidden />
          <div className="home-feature-info">
            <p className="home-feature-label">Featured Pilot</p>
            <h2 className="home-feature-title">{featuredPilot?.name ?? "Vanguard Ace"}</h2>
            <p className="home-feature-copy">
              {featuredPilot?.description ?? "Elite strike pilot configured for high-intensity sortie lanes."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
