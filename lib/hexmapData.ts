import { sql } from "./db";

const RECENT_WINDOW_DAYS = 60;

export type ConstituencyAdStatus = {
  constituencyId: string;
  name: string;
  status: "no_advertiser" | "stale" | "recent" | "active";
  activeAdCount: number;
  lastActivityAt: string | null;
};

/**
 * One row per constituency currently in our system (only the pilot MPs
 * for now — the map itself covers all 650 hexes, but only these will
 * have anything other than "not yet tracked" to show).
 *
 * Status is a snapshot, not an activity count: "active" means an ad is
 * running right now, "recent" means nothing's running but something was
 * within the last two months, "stale" means confirmed no activity in
 * that window (or ever). "no_advertiser" stays distinct from "stale" —
 * it means we haven't found their Page yet, not that we checked and
 * found nothing.
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

  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const map = new Map<string, ConstituencyAdStatus>();
  for (const row of rows) {
    const activeAdCount = Number(row.active_ad_count);
    const status: ConstituencyAdStatus["status"] = !row.has_advertiser
      ? "no_advertiser"
      : activeAdCount > 0
        ? "active"
        : row.last_activity_at && new Date(row.last_activity_at).getTime() >= cutoff
          ? "recent"
          : "stale";

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
