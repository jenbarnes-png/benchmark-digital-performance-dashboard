import { sql } from "./db";
import { classifyAdRecency, type AdRecencyStatus } from "./adRecency";

export type ConstituencyAdStatus = {
  constituencyId: string;
  name: string;
  status: AdRecencyStatus;
  activeAdCount: number;
  lastActivityAt: string | null;
};

/**
 * One row per constituency currently in our system (only the pilot MPs
 * for now — the map itself covers all 650 hexes, but only these will
 * have anything other than "not yet tracked" to show). Status is
 * "as of right now" — see lib/rankings.ts for the same classification
 * applied historically, per ranking period.
 */
export async function getConstituencyAdStatuses(): Promise<Map<string, ConstituencyAdStatus>> {
  const rows = await sql<
    {
      constituency_id: string;
      name: string;
      has_advertiser: boolean;
      active_ad_count: number;
      last_activity_at: string | null;
    }[]
  >`
    select
      c.id as constituency_id,
      c.name,
      (a.id is not null) as has_advertiser,
      count(ads.id) filter (where ads.is_active) as active_ad_count,
      max(greatest(ads.ad_delivery_start_time, coalesce(ads.ad_delivery_stop_time, ads.ad_delivery_start_time)))::text as last_activity_at
    from constituencies c
    left join advertisers a on a.constituency_id = c.id and a.platform = 'meta' and a.ended_at is null
    left join ads on ads.advertiser_id = a.id
    group by c.id, c.name, a.id
  `;

  const now = new Date();

  const map = new Map<string, ConstituencyAdStatus>();
  for (const row of rows) {
    const activeAdCount = Number(row.active_ad_count);
    const status = classifyAdRecency({
      hasAdvertiser: row.has_advertiser,
      isActiveAsOf: activeAdCount > 0,
      lastActivityAt: row.last_activity_at,
      referenceDate: now,
    });

    map.set(row.name, {
      constituencyId: row.constituency_id,
      name: row.name,
      status,
      activeAdCount,
      lastActivityAt: row.last_activity_at,
    });
  }
  return map;
}
