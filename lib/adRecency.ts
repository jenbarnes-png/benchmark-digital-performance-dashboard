// Shared definition of ad-activity status, used identically by the hex
// map and the ranking score — one rule, not two that could drift apart.

export const RECENT_WINDOW_DAYS = 60;

export type AdRecencyStatus = "no_advertiser" | "stale" | "recent" | "active";

export function classifyAdRecency(params: {
  hasAdvertiser: boolean;
  isActiveAsOf: boolean; // an ad was running at the reference date
  lastActivityAt: string | null; // most recent start/stop date on or before the reference date
  referenceDate: Date;
}): AdRecencyStatus {
  if (!params.hasAdvertiser) return "no_advertiser";
  if (params.isActiveAsOf) return "active";
  if (params.lastActivityAt) {
    const cutoff = params.referenceDate.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (new Date(params.lastActivityAt).getTime() >= cutoff) return "recent";
  }
  return "stale";
}

/**
 * The points system: 2 if an ad is running right now, 0 otherwise —
 * binary, not a recency gradient. Expressed on the same 0-100 scale as
 * every other scored metric so it can be averaged into the overall
 * score without special-casing — the ranking page and /scoring both
 * read POINTS below, so update it there if the weighting ever changes.
 * `recent` (active within RECENT_WINDOW_DAYS) still exists as a
 * classification, used for hex map/Dream Week tooltip detail, but no
 * longer earns a point of its own.
 */
export const AD_RECENCY_POINTS: Record<Exclude<AdRecencyStatus, "no_advertiser">, number> = {
  active: 2,
  recent: 0,
  stale: 0,
};

export function scoreForAdRecency(status: AdRecencyStatus): {
  hasData: boolean;
  score: number | null;
  maxPoints: number;
} {
  // maxPoints is fixed at the metric's max (2) regardless of hasData —
  // see MetricScore.maxPoints in lib/scoring.ts for why.
  const maxPoints = AD_RECENCY_POINTS.active;
  if (status === "no_advertiser") return { hasData: false, score: null, maxPoints };
  return { hasData: true, score: (AD_RECENCY_POINTS[status] / 2) * 100, maxPoints };
}
