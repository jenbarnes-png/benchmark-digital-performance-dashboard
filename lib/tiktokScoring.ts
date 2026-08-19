// TikTok activity scoring: up to 5 points per week, on the same 0-100
// scale as every other scored metric (see lib/scoring.ts). Wired into
// the overall ranking average in lib/rankings.ts, same pattern as
// lib/adRecency.ts — a constituency with no matched TikTok account is
// excluded from the average (hasData: false), not scored as zero.

export const TIKTOK_MAX_POINTS = 5;

export type TiktokVideoLite = {
  constituencyId: string;
  postedAt: string; // ISO timestamp
  viewCount: number | null;
  likeCount: number | null;
};

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

/**
 * 1 point each for posting within the last 48 hours / 7 days / 14 days
 * / 30 days. These stack — someone who posted yesterday gets all four,
 * not just one tier — unlike the Meta ad-activity score, which is
 * exclusive tiers.
 */
export function recencyPoints(mostRecentPostedAt: string | null, referenceDate: Date): number {
  if (!mostRecentPostedAt) return 0;
  const hoursAgo = hoursBetween(new Date(mostRecentPostedAt), referenceDate);
  if (hoursAgo < 0) return 0; // posted in the future — bad data, don't reward it

  let points = 0;
  if (hoursAgo <= 48) points++;
  if (hoursAgo <= 24 * 7) points++;
  if (hoursAgo <= 24 * 14) points++;
  if (hoursAgo <= 24 * 30) points++;
  return points;
}

/**
 * The single best-performing video posted nationally within a period
 * (by view count, ties broken by like count then constituency ID for
 * determinism) wins its constituency +1 point for that period only —
 * it moves to a new constituency each week rather than being held.
 * Call once per period across every constituency's videos, not
 * per-constituency.
 */
export function weeklyBestPostWinner(videosInPeriod: TiktokVideoLite[]): string | null {
  if (videosInPeriod.length === 0) return null;

  const best = [...videosInPeriod].sort((a, b) => {
    const viewDiff = (b.viewCount ?? 0) - (a.viewCount ?? 0);
    if (viewDiff !== 0) return viewDiff;
    const likeDiff = (b.likeCount ?? 0) - (a.likeCount ?? 0);
    if (likeDiff !== 0) return likeDiff;
    return a.constituencyId.localeCompare(b.constituencyId);
  })[0];

  return best.constituencyId;
}

export function scoreForTiktokPoints(points: number): number {
  return Math.max(0, Math.min(TIKTOK_MAX_POINTS, points)) * (100 / TIKTOK_MAX_POINTS);
}

/** hasData-aware wrapper, same shape as adRecency's scoreForAdRecency — a
 * constituency with no matched TikTok account has no basis for a score at
 * all, so it's excluded from the overall average rather than dragged down. */
export function scoreForTiktok(params: { hasAccount: boolean; points: number }): {
  hasData: boolean;
  score: number | null;
} {
  if (!params.hasAccount) return { hasData: false, score: null };
  return { hasData: true, score: scoreForTiktokPoints(params.points) };
}
