/**
 * Home Screen - Epic space-themed main menu with animated starfield,
 * featured pilot banner, and glowing title.
 */

import { useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { resolveAssetUrl } from "../lib/assetUrl";
import type { Pilot } from "../types";
import pilotsData from "../data/pilots.json";

// ─── Starfield types ─────────────────────────────────────

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  isHero: boolean;
}

interface FloatingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { save } = useGame();
  const pilots = pilotsData as Pilot[];
  const featuredPilot = pilots.find((pilot) => pilot.id === save.selectedPilotId) ?? pilots[0];
  const featuredPilotArtUrl = resolveAssetUrl(featuredPilot?.artUrl);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const starsRef = useRef<Star[]>([]);
  const floatersRef = useRef<FloatingParticle[]>([]);

  const initStars = useCallback((width: number, height: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.5 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        isHero: false,
      });
    }
    for (let i = 0; i < 6; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 1.5,
        baseAlpha: 0.8 + Math.random() * 0.2,
        twinkleSpeed: 0.3 + Math.random() * 0.5,
        twinkleOffset: Math.random() * Math.PI * 2,
        isHero: true,
      });
    }
    starsRef.current = stars;

    const floaters: FloatingParticle[] = [];
    for (let i = 0; i < 8; i++) {
      floaters.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 8,
        vy: -(5 + Math.random() * 10),
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.15 + Math.random() * 0.25,
      });
    }
    floatersRef.current = floaters;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (starsRef.current.length === 0) {
        initStars(canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      const time = performance.now() / 1000;

      ctx.clearRect(0, 0, w, h);

      for (const star of starsRef.current) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
        const alpha = star.baseAlpha * (0.6 + 0.4 * twinkle);

        star.y += 0.08;
        if (star.y > h + 5) {
          star.y = -5;
          star.x = Math.random() * w;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        if (star.isHero) {
          ctx.globalAlpha = Math.max(0, alpha * 0.4);
          ctx.strokeStyle = "#aaccff";
          ctx.lineWidth = 0.5;
          const flareLen = star.size * 4 + twinkle * 2;
          ctx.beginPath();
          ctx.moveTo(star.x - flareLen, star.y);
          ctx.lineTo(star.x + flareLen, star.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(star.x, star.y - flareLen);
          ctx.lineTo(star.x, star.y + flareLen);
          ctx.stroke();
        }
        ctx.restore();
      }

      for (const p of floatersRef.current) {
        p.x += p.vx / 60;
        p.y += p.vy / 60;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = "#667eea";
        ctx.shadowBlur = 6;
        ctx.fillStyle = "#aabbff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [initStars]);

  return (
    <div className="screen home-screen">
      {/* Animated starfield canvas */}
      <canvas ref={canvasRef} className="home-starfield" />

      <div className="home-atmosphere" aria-hidden />
      <div className="home-vignette" aria-hidden />

      <header className="home-topbar">
        <div className="home-credits-pill">
          <span className="credit-icon">{"\u2726"}</span> {save.credits.toLocaleString()} Credits
        </div>
      </header>

      <div className="home-hero-stage">
        <section className="home-title-block">
          <p className="home-kicker">Featured Sortie</p>
          <h1 className="game-title">
            <span className="title-line title-astra">ASTRA</span>
            <span className="title-line title-valkyries">VALKYRIES</span>
          </h1>
          <div className="title-light-line" />
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
