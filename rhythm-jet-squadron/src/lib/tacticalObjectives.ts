export const FLAWLESS_ROUTE_BASE_SCORE = 1_000;
export const FLAWLESS_ROUTE_OVERDRIVE = 12;

export interface FlawlessRouteReward {
  score: number;
  overdrive: number;
  streak: number;
}

export function isFlawlessRoute(
  damageAtDeployment: number,
  damageAtRelief: number,
): boolean {
  return damageAtRelief === damageAtDeployment;
}

export function flawlessRouteReward(
  previousStreak: number,
  loop: number,
  scoreMultiplier = 1,
): FlawlessRouteReward {
  const streak = Math.max(0, Math.trunc(previousStreak)) + 1;
  const loopBonus = 1 + Math.max(0, Math.trunc(loop)) * 0.2;
  const streakBonus = 1 + Math.min(5, streak - 1) * 0.25;
  return {
    score: Math.round(
      FLAWLESS_ROUTE_BASE_SCORE * loopBonus * streakBonus * Math.max(0, scoreMultiplier),
    ),
    overdrive: FLAWLESS_ROUTE_OVERDRIVE,
    streak,
  };
}
