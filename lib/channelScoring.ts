// Facebook/Instagram organic-activity scoring: up to 2 points, on the
// same 0-100 scale as every other scored metric (see lib/scoring.ts).
// Both checks use the same trailing-7-day window as the Dream Week
// organic card in lib/channelActivity.ts, not one point per post.

export const CHANNEL_MAX_POINTS = 2;

/** hasData-aware wrapper, same shape as adRecency's scoreForAdRecency — a
 * constituency with no Facebook/Instagram data synced earns 0 of these
 * 2 points rather than being excluded from the total (see lib/scoring.ts). */
export function scoreForChannel(params: {
  hasAccount: boolean;
  reelIn7Days: boolean;
  postedIn7Days: boolean;
}): {
  hasData: boolean;
  score: number | null;
  maxPoints: number;
} {
  const maxPoints = CHANNEL_MAX_POINTS;
  if (!params.hasAccount) return { hasData: false, score: null, maxPoints };
  const points = (params.reelIn7Days ? 1 : 0) + (params.postedIn7Days ? 1 : 0);
  return { hasData: true, score: (points / CHANNEL_MAX_POINTS) * 100, maxPoints };
}
