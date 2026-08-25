import { describe, expect, it } from "vitest";
import { renderMediaCatalog } from "../generated/renderMediaCatalog";
import {
  getApprovedRenderMedia,
  resolveRenderMediaEntry,
} from "../lib/renderMedia";

describe("approved render media", () => {
  const entry = {
    kind: "video",
    hd: "https://media.joinhavn.io/astra/test/shot.mp4",
    fallback: "/assets/cutins/ships/astra_interceptor_launch.mp4",
    poster: "/assets/ships/astra_interceptor.png",
  };

  it("selects HD media with a compact local fallback", () => {
    expect(resolveRenderMediaEntry(entry)).toEqual({
      kind: "video",
      src: entry.hd,
      fallbackSrc: entry.fallback,
      poster: entry.poster,
      usesHd: true,
    });
  });

  it("can explicitly select packaged media for offline use", () => {
    expect(resolveRenderMediaEntry(entry, false)).toEqual({
      kind: "video",
      src: entry.fallback,
      poster: entry.poster,
      usesHd: false,
    });
  });

  it("does not expose unapproved manifest candidates", () => {
    expect(Object.keys(renderMediaCatalog)).toHaveLength(0);
    expect(getApprovedRenderMedia("marketing-key-art")).toBeUndefined();
  });
});
