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

export function scoreMetric(input: MetricInput): MetricScore {
  if (!input.hasData) {
    return { key: input.key, hasData: false, score: null };
  }
  const score =
    input.target !== undefined
      ? scoreAgainstTarget(input.value, input.target)
      : scoreAgainstPeers(input.value, input.peerValues ?? []);
  return { key: input.key, hasData: true, score };
}

/**
 * Overall score: average of the metrics that have data. Metrics with no
 * data are excluded rather than counted as zero, so an incomplete-data
 * seat doesn't look like an inactive one.
 */
export function overallScore(metrics: MetricScore[]): number | null {
  const withData = metrics.filter(
    (m): m is MetricScore & { score: number } => m.hasData && m.score !== null
  );
  if (withData.length === 0) return null;
  const sum = withData.reduce((total, m) => total + m.score, 0);
  return Math.round(sum / withData.length);
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
