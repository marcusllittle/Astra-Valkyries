import { describe, expect, it } from "vitest";
import { renderLabPreviewCatalog } from "../generated/renderLabPreviewCatalog";
import { shouldUseRenderLabCandidate } from "../lib/renderLabPreview";

describe("Render Lab development preview", () => {
  it("contains every manifest entry, including rejected candidates", () => {
    expect(Object.keys(renderLabPreviewCatalog)).toHaveLength(47);
    expect(renderLabPreviewCatalog["hub-home-establishing"].status).toBe("rejected");
    expect(renderLabPreviewCatalog["hub-spaceport-loop"]).toBeUndefined();
  });

  it("keeps environment candidates separate from transition fallbacks", () => {
    const spaceport = renderLabPreviewCatalog["hub-spaceport-neon-loop"];
    const hangar = renderLabPreviewCatalog["hub-hangar-neon-flythrough"];
    expect(spaceport.fallback).toBeUndefined();
    expect(hangar.fallback).toBeUndefined();
    expect(spaceport.provenance?.package).toBe("Neon Parallax");
    expect(spaceport.destination).toContain("spaceport");
  });

  it("forces every candidate in all mode without considering approval", () => {
    expect(shouldUseRenderLabCandidate("all", "hub-home-establishing", {}, true)).toBe(true);
    expect(shouldUseRenderLabCandidate("all", "settings-low-motion-plate", {}, true)).toBe(true);
  });

  it("uses only explicit overrides in custom mode", () => {
    const overrides = { "hub-spaceport-neon-loop": true };
    expect(shouldUseRenderLabCandidate("custom", "hub-spaceport-neon-loop", overrides, true)).toBe(true);
    expect(shouldUseRenderLabCandidate("custom", "hub-hangar-neon-flythrough", overrides, true)).toBe(false);
  });

  it("cannot activate outside the dedicated development build", () => {
    expect(shouldUseRenderLabCandidate("all", "hub-spaceport-neon-loop", {}, false)).toBe(false);
  });
});
