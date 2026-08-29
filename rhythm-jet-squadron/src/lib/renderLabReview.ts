export type RenderLabReviewDecision = "keep-current" | "revise" | "approve-candidate";

export const RENDER_LAB_REVIEW_DECISIONS_KEY = "astra.renderLab.reviewDecisions";

export function readRenderLabReviewDecisions(): Record<string, RenderLabReviewDecision> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RENDER_LAB_REVIEW_DECISIONS_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, RenderLabReviewDecision>>((decisions, [id, value]) => {
      if (value === "keep-current" || value === "revise" || value === "approve-candidate") {
        decisions[id] = value;
      }
      return decisions;
    }, {});
  } catch {
    return {};
  }
}

export function writeRenderLabReviewDecision(
  id: string,
  decision: RenderLabReviewDecision,
  current: Readonly<Record<string, RenderLabReviewDecision>>,
) {
  const next = { ...current, [id]: decision };
  window.localStorage.setItem(RENDER_LAB_REVIEW_DECISIONS_KEY, JSON.stringify(next));
  return next;
}
