/**
 * Home Screen — PS1/JRPG-style title screen.
 *
 * Two phases:
 *  1. "title" — atmospheric starfield + glowing title + blinking "PRESS START"
 *  2. "menu"  — title moves up, vertical menu with ▶ cursor + keyboard nav
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { cursorMove, menuConfirm, pressStart } from "../lib/retroSfx";

// ─── Menu items ─────────────────────────────────────────
const MENU_ITEMS = [
  { label: "SORTIE", route: "/shmup" },
  { label: "LOADOUT", route: "/hangar" },
  { label: "COLLECTION", route: "/collection" },
  { label: "REQUISITIONS", route: "/shop" },
  { label: "SETTINGS", route: "/settings" },
] as const;

// ─── Starfield types ────────────────────────────────────

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  speed: number;        // drift speed — far stars slow, near stars fast
  isHero: boolean;
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { save } = useGame();

  const [phase, setPhase] = useState<"title" | "menu">("title");
  const [cursorIdx, setCursorIdx] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const starsRef = useRef<Star[]>([]);

  // ─── Starfield init ───────────────────────────────────

  const initStars = useCallback((w: number, h: number) => {
    const stars: Star[] = [];

    // Far layer — small, slow
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 0.4 + Math.random() * 1,
        baseAlpha: 0.2 + Math.random() * 0.4,
        twinkleSpeed: 0.3 + Math.random() * 1.2,
        twinkleOffset: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.04,
        isHero: false,
      });
    }

    // Near layer — larger, faster
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.4 + Math.random() * 0.6,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        speed: 0.06 + Math.random() * 0.1,
        isHero: false,
      });
    }

    // Hero stars with lens flares
    for (let i = 0; i < 5; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 2 + Math.random() * 1.5,
        baseAlpha: 0.8 + Math.random() * 0.2,
        twinkleSpeed: 0.3 + Math.random() * 0.5,
        twinkleOffset: Math.random() * Math.PI * 2,
        speed: 0.03 + Math.random() * 0.05,
        isHero: true,
      });
    }

    starsRef.current = stars;
  }, []);

  // ─── Canvas animation ─────────────────────────────────

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
        star.y += star.speed;
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

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [initStars]);

  // ─── Transition to menu ───────────────────────────────

  const enterMenu = useCallback(() => {
    if (phase !== "title") return;
    pressStart();
    setPhase("menu");
    // Stagger menu entrance
    setTimeout(() => setMenuVisible(true), 300);
  }, [phase]);

  // ─── Keyboard navigation ─────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "title") {
        enterMenu();
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setCursorIdx(i => {
            cursorMove();
            return i <= 0 ? MENU_ITEMS.length - 1 : i - 1;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setCursorIdx(i => {
            cursorMove();
            return i >= MENU_ITEMS.length - 1 ? 0 : i + 1;
          });
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          menuConfirm();
          navigate(MENU_ITEMS[cursorIdx].route);
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, cursorIdx, enterMenu, navigate]);

  // ─── Render ───────────────────────────────────────────

  return (
    <div
      className={`screen home-screen ${phase === "menu" ? "home-menu-phase" : ""}`}
      onClick={phase === "title" ? enterMenu : undefined}
    >
      <canvas ref={canvasRef} className="home-starfield" />
      <div className="home-atmosphere" aria-hidden />
      <div className="home-vignette" aria-hidden />

      {/* Credits — visible in menu phase */}
      {phase === "menu" && (
        <header className="home-topbar home-fade-in">
          <div className="home-credits-pill">
            <span className="credit-icon">{"\u2726"}</span> {save.credits.toLocaleString()} Credits
          </div>
        </header>
      )}

      {/* Title area — centered in title phase, moves up in menu phase */}
      <div className="home-title-area">
        <h1 className="game-title">
          <span className="title-line title-astra">ASTRA</span>
          <span className="title-line title-valkyries">VALKYRIES</span>
        </h1>
        <div className="title-light-line" />

        {/* PRESS START — only in title phase */}
        {phase === "title" && (
          <p className="press-start">PRESS START</p>
        )}

        {/* Vertical menu — only in menu phase */}
        {phase === "menu" && menuVisible && (
          <nav className="retro-menu">
            {MENU_ITEMS.map((item, i) => (
              <button
                key={item.route}
                className={`retro-menu-item ${cursorIdx === i ? "active" : ""}`}
                style={{ "--i": i } as React.CSSProperties}
                onClick={() => { menuConfirm(); navigate(item.route); }}
                onMouseEnter={() => {
                  if (cursorIdx !== i) {
                    cursorMove();
                    setCursorIdx(i);
                  }
                }}
              >
                <span className="retro-menu-cursor" aria-hidden>
                  {cursorIdx === i ? "▶" : "\u00A0\u00A0"}
                </span>
                <span className="retro-menu-label">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
