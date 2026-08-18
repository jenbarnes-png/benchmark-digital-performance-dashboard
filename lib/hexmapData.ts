import { sql } from "./db";

export type ConstituencyAdStatus = {
  constituencyId: string;
  name: string;
  status: "no_advertiser" | "no_active_ads" | "active";
  activeAdCount: number;
};

/**
 * One row per constituency currently in our system (only the pilot MPs
 * for now — the map itself covers all 650 hexes, but only these will
 * have anything other than "not yet tracked" to show).
 */
export async function getConstituencyAdStatuses(): Promise<Map<string, ConstituencyAdStatus>> {
  const rows = await sql<
    { constituency_id: string; name: string; has_advertiser: boolean; active_ad_count: number }[]
  >`
    select
      c.id as constituency_id,
      c.name,
      (a.id is not null) as has_advertiser,
      count(ads.id) filter (where ads.is_active) as active_ad_count
    from constituencies c
    left join advertisers a on a.constituency_id = c.id and a.platform = 'meta' and a.ended_at is null
    left join ads on ads.advertiser_id = a.id
    group by c.id, c.name, a.id
  `;

  const map = new Map<string, ConstituencyAdStatus>();
  for (const row of rows) {
    map.set(row.name, {
      constituencyId: row.constituency_id,
      name: row.name,
      status: !row.has_advertiser
        ? "no_advertiser"
        : row.active_ad_count > 0
          ? "active"
          : "no_active_ads",
      activeAdCount: Number(row.active_ad_count),
    });
  }
  return map;
}
