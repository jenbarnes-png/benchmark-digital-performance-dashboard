// Subscriber growth scoring: 1 point, on the same 0-100 scale as every
// other scored metric (see lib/scoring.ts). Earned when the approved
// subscriber count grew by 20+ versus the previous calendar month's
// approved count — see lib/subscriberCounts.ts.

export const SUBSCRIBER_MAX_POINTS = 1;
export const SUBSCRIBER_GROWTH_TARGET = 20;

/** hasAccount here means "has at least two consecutive approved monthly
 * counts to compare" — a single month's count alone can't show growth. */
export function scoreForSubscriberGrowth(params: { hasAccount: boolean; grewByAtLeastTarget: boolean }): {
  hasData: boolean;
  score: number | null;
  maxPoints: number;
} {
  const maxPoints = SUBSCRIBER_MAX_POINTS;
  if (!params.hasAccount) return { hasData: false, score: null, maxPoints };
  return { hasData: true, score: params.grewByAtLeastTarget ? 100 : 0, maxPoints };
}
