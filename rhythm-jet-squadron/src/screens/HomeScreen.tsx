/**
 * Home Screen - Space-themed main menu with animated starfield,
 * configurable hero media (image or video), and glowing title.
 *
 * Hero media:  Drop your own file into public/assets/hero/
 *   Supported: hero.mp4, hero.webm, hero.png, hero.jpg, hero.webp
 *   The component auto-detects the format.
 *   If no file is found, a gradient fallback is shown.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

// ─── Hero media config ───────────────────────────────────
// Order matters: first match wins. Videos before images.
const HERO_CANDIDATES = [
  { src: "/assets/hero/hero.mp4", type: "video" },
  { src: "/assets/hero/hero.webm", type: "video" },
  { src: "/assets/hero/hero.png", type: "image" },
  { src: "/assets/hero/hero.jpg", type: "image" },
  { src: "/assets/hero/hero.webp", type: "image" },
] as const;

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const starsRef = useRef<Star[]>([]);
  const floatersRef = useRef<FloatingParticle[]>([]);

  // ─── Detect hero media ─────────────────────────────────
  const [heroMedia, setHeroMedia] = useState<{ src: string; type: "video" | "image" } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      for (const candidate of HERO_CANDIDATES) {
        try {
          const res = await fetch(candidate.src, { method: "HEAD" });
          if (res.ok && !cancelled) {
            setHeroMedia({ src: candidate.src, type: candidate.type });
            return;
          }
        } catch {
          // not found, try next
        }
      }
    }

    probe();
    return () => { cancelled = true; };
  }, []);

  // ─── Starfield ─────────────────────────────────────────

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
        if (star.y > h + 5) { star.y = -5; star.x = Math.random() * w; }

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

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="screen home-screen">
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

        {/* Hero media slot — drop your own image or video in public/assets/hero/ */}
        <aside className="home-hero-media" aria-label="Hero media">
          <div className="home-hero-media-inner">
            {heroMedia?.type === "video" ? (
              <video
                className="home-hero-media-content"
                src={heroMedia.src}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : heroMedia?.type === "image" ? (
              <img
                className="home-hero-media-content"
                src={heroMedia.src}
                alt="Astra Valkyries"
                loading="eager"
              />
            ) : (
              <div
                className="home-hero-media-content home-hero-fallback"
                aria-hidden
              />
            )}
            <div className="home-hero-media-vignette" aria-hidden />
          </div>
        </aside>
      </div>
    </div>
  );
}
