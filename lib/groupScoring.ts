// Facebook Group scoring: 2 points, on the same 0-100 scale as every
// other scored metric (see lib/scoring.ts). Threshold-based rather than
// stacking: 0 posts = 0 points, 1 post = 1 point, 2+ posts = 2 points.
// Reads the same manually-reported, approval-gated post count as the
// Rankings "Facebook group posts (manual)" column and the Dream Week
// checklist card — see lib/facebookGroupActivity.ts.

export const GROUP_MAX_POINTS = 2;

export function pointsForGroupPosts(postCount: number): number {
  if (postCount >= 2) return 2;
  if (postCount === 1) return 1;
  return 0;
}

/** hasData-aware wrapper, same shape as adRecency's scoreForAdRecency — a
 * constituency with no approved Facebook Group submission earns 0 of
 * these 2 points rather than being excluded from the total (see
 * lib/scoring.ts). */
export function scoreForGroup(params: { hasAccount: boolean; postCount: number }): {
  hasData: boolean;
  score: number | null;
  maxPoints: number;
} {
  const maxPoints = GROUP_MAX_POINTS;
  if (!params.hasAccount) return { hasData: false, score: null, maxPoints };
  return { hasData: true, score: (pointsForGroupPosts(params.postCount) / maxPoints) * 100, maxPoints };
}
