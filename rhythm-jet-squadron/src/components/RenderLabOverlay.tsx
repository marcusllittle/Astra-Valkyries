import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { renderLabPreviewCatalog } from "../generated/renderLabPreviewCatalog";
import { useRenderLab } from "../context/RenderLabContext";
import RenderLabMedia from "./RenderLabMedia";
import type { RenderLabMediaSource } from "./RenderLabMedia";

const ROUTE_SCREENS: Record<string, string> = {
  "/": "home",
  "/spaceport": "spaceport",
  "/hangar": "hangar",
  "/briefing": "briefing",
  "/video-cutscene": "video-cutscene",
  "/shmup": "shmup",
  "/shmup-results": "shmup-results",
  "/shop": "shop",
  "/collection": "collection",
  "/codex": "codex",
  "/missions": "missions",
  "/skills": "skills",
  "/leaderboard": "leaderboard",
  "/network": "network",
};

export default function RenderLabOverlay() {
  const { enabled, mode, usesCandidate } = useRenderLab();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(0);
  const screen = ROUTE_SCREENS[pathname];
  const entries = useMemo(
    () => Object.values(renderLabPreviewCatalog).filter(
      (entry) => screen && entry.screens.includes(screen) && usesCandidate(entry.id),
    ),
    [screen, usesCandidate],
  );

  useEffect(() => {
    if (entries.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % entries.length), 10000);
    return () => window.clearInterval(timer);
  }, [entries.length]);

  const handleSourceChange = useCallback((source: RenderLabMediaSource) => {
    if (source === "missing" && entries.length > 1) {
      setIndex((current) => (current + 1) % entries.length);
    }
  }, [entries.length]);

  if (!enabled || mode === "current" || pathname === "/renderlab") return null;
  const active = entries[index % Math.max(entries.length, 1)];

  return (
    <>
      {active ? (
        <div className="renderlab-route-media" aria-hidden="true">
          <RenderLabMedia
            key={active.id}
            entry={active}
            className="renderlab-route-media-asset"
            decorative
            onSourceChange={handleSourceChange}
          />
          <div className="renderlab-route-media-wash" />
        </div>
      ) : null}
      <Link className="renderlab-dev-badge" to="/renderlab">
        RENDER LAB — {mode === "all" ? "ALL CANDIDATES" : "CUSTOM"}
      </Link>
    </>
  );
}
