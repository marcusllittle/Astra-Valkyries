import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  isRenderLabBuild,
  readRenderLabMode,
  readRenderLabOverrides,
  RENDER_LAB_MODE_KEY,
  RENDER_LAB_OVERRIDES_KEY,
  shouldUseRenderLabCandidate,
  type RenderLabMode,
} from "../lib/renderLabPreview";

interface RenderLabContextValue {
  enabled: boolean;
  mode: RenderLabMode;
  overrides: Readonly<Record<string, boolean>>;
  setMode: (mode: RenderLabMode) => void;
  setOverride: (id: string, enabled: boolean) => void;
  usesCandidate: (id: string) => boolean;
}

const RenderLabContext = createContext<RenderLabContextValue | null>(null);

export function RenderLabProvider({ children }: { children: ReactNode }) {
  const [modeState, setModeState] = useState<RenderLabMode>(readRenderLabMode);
  const [overrides, setOverrides] = useState<Record<string, boolean>>(readRenderLabOverrides);
  const mode = isRenderLabBuild ? modeState : "current";

  const setMode = useCallback((nextMode: RenderLabMode) => {
    if (!isRenderLabBuild) return;
    setModeState(nextMode);
    window.localStorage.setItem(RENDER_LAB_MODE_KEY, nextMode);
  }, []);

  const setOverride = useCallback((id: string, enabled: boolean) => {
    if (!isRenderLabBuild) return;
    setOverrides((current) => {
      const next = { ...current, [id]: enabled };
      window.localStorage.setItem(RENDER_LAB_OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<RenderLabContextValue>(() => ({
    enabled: isRenderLabBuild,
    mode,
    overrides,
    setMode,
    setOverride,
    usesCandidate: (id) => shouldUseRenderLabCandidate(mode, id, overrides),
  }), [mode, overrides, setMode, setOverride]);

  return <RenderLabContext.Provider value={value}>{children}</RenderLabContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRenderLab() {
  const context = useContext(RenderLabContext);
  if (!context) throw new Error("useRenderLab must be used inside RenderLabProvider");
  return context;
}
