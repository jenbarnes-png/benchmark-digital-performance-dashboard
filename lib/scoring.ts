// Turns raw activity numbers into a 0-100 score per metric, and an overall
// score per constituency per period. This is a placeholder scoring model —
// "what's a fair basis for ranking" is still an open pilot question. Kept
// as plain functions (not stored in the database) so the formula can change
// without a migration.

export type MetricInput = {
  key: string;
  hasData: boolean;
  /** Raw value, e.g. amount spent, post count, send count. */
  value: number;
  /** Target to score against, e.g. ad spend target. Omit to score against peers instead. */
  target?: number;
  /** Peer values (same metric, other constituencies, same period) to score against when there's no fixed target. */
  peerValues?: number[];
};

export type MetricScore = {
  key: string;
  hasData: boolean;
  score: number | null; // null when hasData is false
  /**
   * This metric's weight in the overall score, expressed as its share of
   * a real points total (today: 2 for paid advertising + 5 for TikTok +
   * 2 for Facebook/Instagram + 2 for newsletter + 2 for Facebook Group
   * posts = 13 possible). Fixed per metric — it doesn't depend on
   * hasData, so a constituency with no advertiser resolved yet still
   * has those 2 points counted against it in the total, not excluded. 0
   * for the older manually-reported metrics that don't have a points
   * scale (organic posting, the manually-reported "newsletter" — peer-
   * relative percentages, not points, distinct from the automated
   * "newsletterActivity" metric which does have a points scale; same
   * for "group" vs "groupPoints") — they still show on their own card,
   * just don't count toward the overall score.
   */
  maxPoints: number;
};

function scoreAgainstTarget(value: number, target: number): number {
  if (target <= 0) return value > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (value / target) * 100));
}

function scoreAgainstPeers(value: number, peerValues: number[]): number {
  const max = Math.max(0, ...peerValues);
  if (max <= 0) return value > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

/** Peer-relative metrics (organic posting, group activity, newsletter) have no points scale of their own yet, so maxPoints is always 0 — see MetricScore. */
export function scoreMetric(input: MetricInput): MetricScore {
  if (!input.hasData) {
    return { key: input.key, hasData: false, score: null, maxPoints: 0 };
  }
  const score =
    input.target !== undefined
      ? scoreAgainstTarget(input.value, input.target)
      : scoreAgainstPeers(input.value, input.peerValues ?? []);
  return { key: input.key, hasData: true, score, maxPoints: 0 };
}

/**
 * Overall score: real points earned — today, out of 2 for paid
 * advertising + 5 for TikTok + 2 for Facebook/Instagram + 2 for
 * newsletter + 2 for Facebook Group posts = 13 possible, since those
 * are the only metrics with an actual points scale defined so far (see
 * totalPossiblePoints). Shown as the raw point count (e.g. "3"), not a
 * percentage — a rescaled-to-100 number invites reading it like a
 * grade, which a 13-point system isn't. A constituency missing a
 * point-scored metric (no advertiser resolved, no TikTok account
 * matched) earns 0 of that metric's points rather than being excluded —
 * same as zero activity would score. The one exception: a seat with no
 * data on ANY point-scored metric returns null ("No data") rather than
 * a misleadingly exact 0, since we can't yet tell "confirmed inactive"
 * from "not tracked".
 */
export function overallScore(metrics: MetricScore[]): number | null {
  const pointScored = metrics.filter((m) => m.maxPoints > 0);
  const withData = pointScored.filter(
    (m): m is MetricScore & { score: number } => m.hasData && m.score !== null
  );
  if (withData.length === 0) return null;

  const earnedPoints = withData.reduce((sum, m) => sum + (m.score / 100) * m.maxPoints, 0);
  return Math.round(earnedPoints);
}

/** Total points possible across every metric with a defined points scale — the denominator to show alongside overallScore (e.g. "3 of 13 points"). */
export function totalPossiblePoints(metrics: MetricScore[]): number {
  return metrics.reduce((sum, m) => sum + m.maxPoints, 0);
}

export type ChangeDirection = "up" | "down" | "flat" | "unknown";

export function scoreChange(
  current: number | null,
  previous: number | null
): { delta: number | null; direction: ChangeDirection } {
  if (current === null || previous === null) {
    return { delta: null, direction: "unknown" };
  }
  const delta = current - previous;
  if (delta > 0) return { delta, direction: "up" };
  if (delta < 0) return { delta, direction: "down" };
  return { delta: 0, direction: "flat" };
}

export type Ranked<T> = T & { rank: number };

/**
 * Ranks items by score descending (nulls last). Ties share the same rank
 * (standard competition ranking: 1, 2, 2, 4).
 */
export function rankByScore<T extends { score: number | null }>(
  items: T[]
): Ranked<T>[] {
  const sorted = [...items].sort((a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score;
  });

  let rank = 0;
  let previousScore: number | null | undefined = undefined;
  return sorted.map((item, index) => {
    if (item.score !== previousScore) {
      rank = index + 1;
      previousScore = item.score;
    }
    return { ...item, rank };
  });
}
