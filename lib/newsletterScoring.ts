// Newsletter scoring: 2 points, on the same 0-100 scale as every other
// scored metric (see lib/scoring.ts). Calendar-month-anchored (since
// the 1st) rather than a rolling 30-day window, matching how Jen
// actually wants "sent this month" judged. A 3rd point for subscriber
// list growth is planned but not yet scored — there's no subscriber-
// count data source wired up yet (see lib/dreamWeek.ts's untracked
// "subscribers" item).

export const NEWSLETTER_MAX_POINTS = 2;

/** hasData-aware wrapper, same shape as adRecency's scoreForAdRecency — a
 * constituency with no newsletter data synced earns 0 of these 2 points
 * rather than being excluded from the total (see lib/scoring.ts). */
export function scoreForNewsletter(params: { hasAccount: boolean; sentThisCalendarMonth: boolean }): {
  hasData: boolean;
  score: number | null;
  maxPoints: number;
} {
  const maxPoints = NEWSLETTER_MAX_POINTS;
  if (!params.hasAccount) return { hasData: false, score: null, maxPoints };
  return { hasData: true, score: params.sentThisCalendarMonth ? 100 : 0, maxPoints };
}
