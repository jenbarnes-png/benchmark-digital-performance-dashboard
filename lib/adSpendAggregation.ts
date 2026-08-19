import { sql } from "./db";
import { RECENT_WINDOW_DAYS } from "./adRecency";

type ConstituencyAdRow = {
  constituency_id: string;
  ad_id: string;
  spend_min: number | null;
  spend_max: number | null;
  snapshot_date: string;
};

async function latestSnapshotOnOrBefore(date: string): Promise<ConstituencyAdRow[]> {
  return sql<ConstituencyAdRow[]>`
    select distinct on (a.constituency_id, s.ad_id)
      a.constituency_id,
      s.ad_id,
      s.spend_min,
      s.spend_max,
      s.snapshot_date::text
    from ad_snapshots s
    join ads on ads.id = s.ad_id
    join advertisers a on a.id = ads.advertiser_id
    where s.snapshot_date <= ${date}
    order by a.constituency_id, s.ad_id, s.snapshot_date desc
  `;
}

type AdWindow = { ad_id: string; start: string | null; stop: string | null };

async function adDeliveryWindows(): Promise<AdWindow[]> {
  return sql<AdWindow[]>`
    select ads.id as ad_id, ads.ad_delivery_start_time::text as start, ads.ad_delivery_stop_time::text as stop
    from ads
    join advertisers a on a.id = ads.advertiser_id
    where a.platform = 'meta' and a.ended_at is null
  `;
}

/**
 * Rolls up spend into a trailing RECENT_WINDOW_DAYS-day total per
 * constituency (not a single week's isolated spend, and not
 * all-time-ever spend). Two things combine to make that figure honest:
 *
 * 1. Ads whose delivery window doesn't overlap the last
 *    RECENT_WINDOW_DAYS days are excluded entirely — a seat that ran
 *    ads two years ago and nothing since shouldn't show that old
 *    campaign's full lifetime spend as if it were current.
 * 2. For ads that do overlap, we still only get a *cumulative*
 *    spend-to-date from Meta, not a daily breakdown — so we subtract
 *    whatever was already spent as of RECENT_WINDOW_DAYS ago (via
 *    snapshot history) to isolate the recent portion. Until we've been
 *    syncing for a full RECENT_WINDOW_DAYS days, there's no snapshot
 *    that old to subtract, so long-running-but-still-active ads will
 *    still show inflated toward their full total — this self-corrects
 *    automatically as daily snapshots accumulate.
 */
export async function aggregateRecentAdSpend(periodStart: string, periodEnd: string): Promise<void> {
  const periodEndDate = new Date(periodEnd);
  const windowStartDate = new Date(periodEndDate);
  windowStartDate.setUTCDate(windowStartDate.getUTCDate() - RECENT_WINDOW_DAYS);
  const windowStart = windowStartDate.toISOString().slice(0, 10);

  const [current, baseline, windows, facebookPlatform, constituenciesWithAdvertisers] = await Promise.all([
    latestSnapshotOnOrBefore(periodEnd),
    latestSnapshotOnOrBefore(windowStart),
    adDeliveryWindows(),
    sql<{ id: string }[]>`select id from platforms where name = 'Facebook'`,
    sql<{ constituency_id: string }[]>`select distinct constituency_id from advertisers where platform = 'meta'`,
  ]);

  const platformId = facebookPlatform[0]?.id;
  if (!platformId) throw new Error("No 'Facebook' row in platforms table");

  const windowStartMs = windowStartDate.getTime();
  const periodEndMs = periodEndDate.getTime();
  const withinWindow = new Set(
    windows
      .filter((w) => {
        if (!w.start) return false;
        const startMs = new Date(w.start).getTime();
        if (startMs > periodEndMs) return false;
        const stopMs = w.stop ? new Date(w.stop).getTime() : null;
        return stopMs === null || stopMs >= windowStartMs;
      })
      .map((w) => w.ad_id)
  );

  const baselineByAd = new Map(baseline.map((b) => [b.ad_id, b]));

  const totals = new Map<string, { spendMin: number; spendMax: number }>();
  for (const row of current) {
    if (!withinWindow.has(row.ad_id)) continue; // stale — excluded, not just zeroed
    const prior = baselineByAd.get(row.ad_id);
    const deltaMin = Math.max(0, (row.spend_min ?? 0) - (prior?.spend_min ?? 0));
    const deltaMax = Math.max(0, (row.spend_max ?? 0) - (prior?.spend_max ?? 0));

    const existing = totals.get(row.constituency_id) ?? { spendMin: 0, spendMax: 0 };
    existing.spendMin += deltaMin;
    existing.spendMax += deltaMax;
    totals.set(row.constituency_id, existing);
  }

  for (const { constituency_id } of constituenciesWithAdvertisers) {
    const totalForWindow = totals.get(constituency_id) ?? { spendMin: 0, spendMax: 0 };
    // spend_max is the more useful single figure for scoring/display —
    // amount_spent stores that; the exact range stays on the raw ads.
    await sql`
      insert into ad_spend (constituency_id, platform_id, period_start, period_end, amount_spent, source, has_data)
      values (${constituency_id}, ${platformId}, ${periodStart}, ${periodEnd}, ${totalForWindow.spendMax}, 'automatic', true)
      on conflict (constituency_id, platform_id, period_start) do update set
        amount_spent = excluded.amount_spent,
        source = excluded.source,
        has_data = excluded.has_data
    `;
  }
}
