import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readRenderLabReviewDecisions,
  RENDER_LAB_REVIEW_DECISIONS_KEY,
  writeRenderLabReviewDecision,
} from "../lib/renderLabReview";

describe("Render Lab local review decisions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("persists valid decisions without touching the manifest", () => {
    const values = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    vi.stubGlobal("window", { localStorage });

    writeRenderLabReviewDecision("hub-spaceport-neon-loop", "revise", {});

    expect(readRenderLabReviewDecisions()).toEqual({ "hub-spaceport-neon-loop": "revise" });
    expect(values.get(RENDER_LAB_REVIEW_DECISIONS_KEY)).toContain("revise");
  });

  it("ignores malformed and unsupported stored values", () => {
    vi.stubGlobal("window", {
      localStorage: { getItem: () => JSON.stringify({ valid: "keep-current", invalid: "approved" }) },
    });

    expect(readRenderLabReviewDecisions()).toEqual({ valid: "keep-current" });
  });
});
