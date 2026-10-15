import { SUBSCRIBER_GROWTH_TARGET } from "./subscriberScoring";

// Subscriber lists are logged by hand as they change, so one constituency can
// have several approved counts, even within a single month. This module turns
// that history into the growth point and the "latest list size" shown on Rankings.

/** One approved count, oldest first when passed in a list. `month` is the first day of the month, e.g. "2026-10-01". */
export type DeclaredCount = { month: string; count: number };

export type SubscriberGrowth = {
  /** True when there is a starting count and a later one to compare. */
  hasComparison: boolean;
  /** True when the list is at least SUBSCRIBER_GROWTH_TARGET above the starting count. */
  grewByAtLeastTarget: boolean;
  /** The latest declared list size as of the reference date. */
  listSize: number | null;
  /** The month that size was declared for. */
  listSizeMonth: string | null;
  /** Latest count minus the starting count, when there is a comparison. */
  listChange: number | null;
};

const NOTHING: SubscriberGrowth = {
  hasComparison: false,
  grewByAtLeastTarget: false,
  listSize: null,
  listSizeMonth: null,
  listChange: null,
};

/**
 * Growth for the calendar month the reference date falls in.
 *  - current  = the latest count logged this month.
 *  - baseline = the latest count from an earlier month; if there is none, the
 *               first count logged this month (the starting point).
 * Counts logged for a later month than the reference date are ignored.
 */
export function computeSubscriberGrowth(
  declared: DeclaredCount[] | undefined,
  referenceDate: Date,
  target: number = SUBSCRIBER_GROWTH_TARGET
): SubscriberGrowth {
  if (!declared || declared.length === 0) return NOTHING;

  const y = referenceDate.getUTCFullYear();
  const m = String(referenceDate.getUTCMonth() + 1).padStart(2, "0");
  const thisMonth = `${y}-${m}-01`;

  const upToNow = declared.filter((d) => d.month <= thisMonth);
  if (upToNow.length === 0) return NOTHING;

  const latest = upToNow[upToNow.length - 1];
  const inThisMonth = upToNow.filter((d) => d.month === thisMonth);
  const earlier = upToNow.filter((d) => d.month < thisMonth);

  const baseline = earlier.length > 0 ? earlier[earlier.length - 1] : inThisMonth.length > 1 ? inThisMonth[0] : null;
  const current = inThisMonth.length > 0 ? inThisMonth[inThisMonth.length - 1] : null;

  const size = { listSize: latest.count, listSizeMonth: latest.month };
  if (!baseline || !current || baseline === current) return { ...NOTHING, ...size };

  const change = current.count - baseline.count;
  return { hasComparison: true, grewByAtLeastTarget: change >= target, ...size, listChange: change };
}
