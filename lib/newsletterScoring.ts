// Newsletter scoring: 1 point, on the same 0-100 scale as every other
// scored metric (see lib/scoring.ts). Binary — sent within the last 30
// days or not — matching the Dream Week target of "at least 1 per
// month", not the older peer-relative newsletter_sends metric.

export const NEWSLETTER_MAX_POINTS = 1;

/** hasData-aware wrapper, same shape as adRecency's scoreForAdRecency — a
 * constituency with no newsletter data synced earns 0 of this 1 point
 * rather than being excluded from the total (see lib/scoring.ts). */
export function scoreForNewsletter(params: { hasAccount: boolean; sentInLast30Days: boolean }): {
  hasData: boolean;
  score: number | null;
  maxPoints: number;
} {
  const maxPoints = NEWSLETTER_MAX_POINTS;
  if (!params.hasAccount) return { hasData: false, score: null, maxPoints };
  return { hasData: true, score: params.sentInLast30Days ? 100 : 0, maxPoints };
}
