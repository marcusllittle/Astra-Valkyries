export const GRAZE_CHAIN_TIMEOUT_MS = 1_250;
export const GRAZE_BASE_SCORE = 30;
export const GRAZE_BASE_OVERDRIVE = 0.6;
export const GRAZE_CHAIN_SIZE = 5;
export const GRAZE_CHAIN_MULTIPLIER_STEP = 0.2;
export const GRAZE_CHAIN_MULTIPLIER_CAP = 2.4;

export type GrazeReward = {
  chain: number;
  chainMultiplier: number;
  score: number;
  overdrive: number;
};

function safeMultiplier(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 1;
}

export function grazeReward(
  previousChain: number,
  lastGrazeMs: number,
  elapsedMs: number,
  scoreMultiplier = 1,
  runScoreMultiplier = 1,
): GrazeReward {
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const safeLastGrazeMs = Number.isFinite(lastGrazeMs) ? Math.max(0, lastGrazeMs) : 0;
  const safePreviousChain = Number.isFinite(previousChain)
    ? Math.max(0, Math.floor(previousChain))
    : 0;
  const continuesChain =
    safePreviousChain > 0 &&
    safeElapsedMs >= safeLastGrazeMs &&
    safeElapsedMs - safeLastGrazeMs <= GRAZE_CHAIN_TIMEOUT_MS;
  const chain = continuesChain ? safePreviousChain + 1 : 1;
  const chainMultiplier = Math.min(
    GRAZE_CHAIN_MULTIPLIER_CAP,
    1 + Math.floor((chain - 1) / GRAZE_CHAIN_SIZE) * GRAZE_CHAIN_MULTIPLIER_STEP,
  );

  return {
    chain,
    chainMultiplier,
    score: Math.round(
      GRAZE_BASE_SCORE *
      chainMultiplier *
      safeMultiplier(scoreMultiplier) *
      safeMultiplier(runScoreMultiplier),
    ),
    overdrive: GRAZE_BASE_OVERDRIVE,
  };
}
