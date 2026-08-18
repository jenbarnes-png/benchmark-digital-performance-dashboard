import { sql } from "./db";

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

/**
 * Rolls per-ad snapshots up into one weekly ad_spend row per
 * constituency — "this week's spend" is each ad's latest cumulative
 * total minus its total as of just before the week started. New ads
 * (no prior snapshot) count their full cumulative spend as this week's,
 * since there's nothing earlier to subtract.
 */
export async function aggregateAdSpendForWeek(periodStart: string, periodEnd: string): Promise<void> {
  const dayBefore = new Date(periodStart);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const baselineDate = dayBefore.toISOString().slice(0, 10);

  const [current, baseline, facebookPlatform, constituenciesWithAdvertisers] = await Promise.all([
    latestSnapshotOnOrBefore(periodEnd),
    latestSnapshotOnOrBefore(baselineDate),
    sql<{ id: string }[]>`select id from platforms where name = 'Facebook'`,
    sql<{ constituency_id: string }[]>`select distinct constituency_id from advertisers where platform = 'meta'`,
  ]);

  const platformId = facebookPlatform[0]?.id;
  if (!platformId) throw new Error("No 'Facebook' row in platforms table");

  const baselineByAd = new Map(baseline.map((b) => [b.ad_id, b]));

  const totals = new Map<string, { spendMin: number; spendMax: number }>();
  for (const row of current) {
    const prior = baselineByAd.get(row.ad_id);
    const deltaMin = Math.max(0, (row.spend_min ?? 0) - (prior?.spend_min ?? 0));
    const deltaMax = Math.max(0, (row.spend_max ?? 0) - (prior?.spend_max ?? 0));

    const existing = totals.get(row.constituency_id) ?? { spendMin: 0, spendMax: 0 };
    existing.spendMin += deltaMin;
    existing.spendMax += deltaMax;
    totals.set(row.constituency_id, existing);
  }

  for (const { constituency_id } of constituenciesWithAdvertisers) {
    const totalForWeek = totals.get(constituency_id) ?? { spendMin: 0, spendMax: 0 };
    // spend_max is the more useful single figure for scoring/display —
    // amount_spent stores that; the exact range stays on the raw ads.
    await sql`
      insert into ad_spend (constituency_id, platform_id, period_start, period_end, amount_spent, source, has_data)
      values (${constituency_id}, ${platformId}, ${periodStart}, ${periodEnd}, ${totalForWeek.spendMax}, 'automatic', true)
      on conflict (constituency_id, platform_id, period_start) do update set
        amount_spent = excluded.amount_spent,
        source = excluded.source,
        has_data = excluded.has_data
    `;
  }
}
