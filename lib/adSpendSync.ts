import { sql } from "./db";
import { searchAdsByPageIds, type ArchivedAd } from "./meta";

function num(value: string | undefined): number | null {
  return value === undefined ? null : Number(value);
}

function isAdActive(ad: ArchivedAd): boolean {
  if (!ad.ad_delivery_stop_time) return true;
  return new Date(ad.ad_delivery_stop_time).getTime() > Date.now();
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export type SyncSummary = {
  advertisersChecked: number;
  adsSeen: number;
  newAds: number;
  updatedAds: number;
};

/**
 * Pulls every political ad for every resolved advertiser from the Ad
 * Library, upserts them (keyed on Meta's permanent ad ID, so re-running
 * this never creates duplicates), and records today's snapshot of each
 * ad's spend/impressions so we can later work out week-over-week deltas.
 */
export async function syncMetaAds(accessToken: string): Promise<SyncSummary> {
  const advertisers = await sql<{ id: string; external_page_id: string }[]>`
    select id, external_page_id from advertisers where platform = 'meta' and ended_at is null
  `;
  const advertiserByPageId = new Map(advertisers.map((a) => [a.external_page_id, a.id]));

  let adsSeen = 0;
  let newAds = 0;
  let updatedAds = 0;

  for (const batch of chunk(advertisers.map((a) => a.external_page_id), 10)) {
    const ads = await searchAdsByPageIds(batch, accessToken, { activeStatus: "ALL" });

    for (const ad of ads) {
      adsSeen++;
      const advertiserId = advertiserByPageId.get(ad.page_id);
      if (!advertiserId) continue; // shouldn't happen, but don't crash a whole sync over it

      const active = isAdActive(ad);
      const spendMin = num(ad.spend?.lower_bound);
      const spendMax = num(ad.spend?.upper_bound);
      const impressionsMin = num(ad.impressions?.lower_bound);
      const impressionsMax = num(ad.impressions?.upper_bound);

      const [{ inserted }] = await sql<{ inserted: boolean }[]>`
        insert into ads (
          advertiser_id, external_ad_id, ad_creative_body, ad_creative_link_title,
          ad_snapshot_url, page_name, currency, spend_min, spend_max,
          impressions_min, impressions_max, publisher_platforms,
          ad_delivery_start_time, ad_delivery_stop_time, is_active, last_synced_at, raw_json
        ) values (
          ${advertiserId}, ${ad.id}, ${ad.ad_creative_bodies?.[0] ?? null},
          ${ad.ad_creative_link_titles?.[0] ?? null}, ${ad.ad_snapshot_url ?? null},
          ${ad.page_name ?? null}, ${ad.currency ?? null}, ${spendMin}, ${spendMax},
          ${impressionsMin}, ${impressionsMax}, ${ad.publisher_platforms ?? null},
          ${ad.ad_delivery_start_time ?? null}, ${ad.ad_delivery_stop_time ?? null},
          ${active}, now(), ${JSON.stringify(ad)}
        )
        on conflict (external_ad_id) do update set
          ad_creative_body = excluded.ad_creative_body,
          ad_creative_link_title = excluded.ad_creative_link_title,
          ad_snapshot_url = excluded.ad_snapshot_url,
          spend_min = excluded.spend_min,
          spend_max = excluded.spend_max,
          impressions_min = excluded.impressions_min,
          impressions_max = excluded.impressions_max,
          ad_delivery_stop_time = excluded.ad_delivery_stop_time,
          is_active = excluded.is_active,
          last_synced_at = excluded.last_synced_at,
          raw_json = excluded.raw_json
        returning (xmax = 0) as inserted
      `;
      if (inserted) newAds++;
      else updatedAds++;

      const [{ id: adRowId }] = await sql<{ id: string }[]>`
        select id from ads where external_ad_id = ${ad.id}
      `;
      await sql`
        insert into ad_snapshots (ad_id, snapshot_date, spend_min, spend_max, impressions_min, impressions_max, is_active)
        values (${adRowId}, current_date, ${spendMin}, ${spendMax}, ${impressionsMin}, ${impressionsMax}, ${active})
        on conflict (ad_id, snapshot_date) do update set
          spend_min = excluded.spend_min,
          spend_max = excluded.spend_max,
          impressions_min = excluded.impressions_min,
          impressions_max = excluded.impressions_max,
          is_active = excluded.is_active
      `;
    }
  }

  return { advertisersChecked: advertisers.length, adsSeen, newAds, updatedAds };
}
