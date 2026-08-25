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

  type AdRow = {
    advertiser_id: string;
    external_ad_id: string;
    ad_creative_body: string | null;
    ad_creative_link_title: string | null;
    page_name: string | null;
    currency: string | null;
    spend_min: number | null;
    spend_max: number | null;
    impressions_min: number | null;
    impressions_max: number | null;
    publisher_platforms: string[] | null;
    ad_delivery_start_time: string | null;
    ad_delivery_stop_time: string | null;
    is_active: boolean;
    last_synced_at: Date;
  };
  const adRows: AdRow[] = [];
  // Snapshot rows need the ads.id each upsert produces, which only
  // exists once the batched ads upsert below has actually run — so the
  // inputs are collected here (keyed on external_ad_id) and turned into
  // real snapshot rows afterwards.
  const snapshotInputByExternalId = new Map<
    string,
    { spendMin: number | null; spendMax: number | null; impressionsMin: number | null; impressionsMax: number | null; active: boolean }
  >();
  const today = new Date().toISOString().slice(0, 10);

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

      adRows.push({
        advertiser_id: advertiserId,
        external_ad_id: ad.id,
        ad_creative_body: ad.ad_creative_bodies?.[0] ?? null,
        ad_creative_link_title: ad.ad_creative_link_titles?.[0] ?? null,
        page_name: ad.page_name ?? null,
        currency: ad.currency ?? null,
        spend_min: spendMin,
        spend_max: spendMax,
        impressions_min: impressionsMin,
        impressions_max: impressionsMax,
        publisher_platforms: ad.publisher_platforms ?? null,
        ad_delivery_start_time: ad.ad_delivery_start_time ?? null,
        ad_delivery_stop_time: ad.ad_delivery_stop_time ?? null,
        is_active: active,
        last_synced_at: new Date(),
      });
      snapshotInputByExternalId.set(ad.id, { spendMin, spendMax, impressionsMin, impressionsMax, active });
    }
  }

  // Batched instead of one insert-and-a-separate-select-for-the-id per
  // ad (previously ~2 sequential round trips per ad, ~4000+ total for a
  // full sync) — that was what made /api/cron/sync time out. Dropped
  // raw_json from the write path: it was never read anywhere, and
  // storing a jsonb blob per row isn't compatible with this bulk-insert
  // helper.
  const AD_COLUMNS = [
    "advertiser_id",
    "external_ad_id",
    "ad_creative_body",
    "ad_creative_link_title",
    "page_name",
    "currency",
    "spend_min",
    "spend_max",
    "impressions_min",
    "impressions_max",
    "publisher_platforms",
    "ad_delivery_start_time",
    "ad_delivery_stop_time",
    "is_active",
    "last_synced_at",
  ] as const;
  const AD_BATCH_SIZE = 500;
  let newAds = 0;
  let updatedAds = 0;
  const adRowIdByExternalId = new Map<string, string>();
  for (let i = 0; i < adRows.length; i += AD_BATCH_SIZE) {
    const batch = adRows.slice(i, i + AD_BATCH_SIZE);
    const returned = await sql<{ external_ad_id: string; id: string; inserted: boolean }[]>`
      insert into ads ${sql(batch, ...AD_COLUMNS)}
      on conflict (external_ad_id) do update set
        ad_creative_body = excluded.ad_creative_body,
        ad_creative_link_title = excluded.ad_creative_link_title,
        spend_min = excluded.spend_min,
        spend_max = excluded.spend_max,
        impressions_min = excluded.impressions_min,
        impressions_max = excluded.impressions_max,
        ad_delivery_stop_time = excluded.ad_delivery_stop_time,
        is_active = excluded.is_active,
        last_synced_at = excluded.last_synced_at
      returning external_ad_id, id, (xmax = 0) as inserted
    `;
    for (const row of returned) {
      adRowIdByExternalId.set(row.external_ad_id, row.id);
      if (row.inserted) newAds++;
      else updatedAds++;
    }
  }

  const SNAPSHOT_COLUMNS = [
    "ad_id",
    "snapshot_date",
    "spend_min",
    "spend_max",
    "impressions_min",
    "impressions_max",
    "is_active",
  ] as const;
  const snapshotRows = Array.from(adRowIdByExternalId.entries()).map(([externalId, adRowId]) => {
    const s = snapshotInputByExternalId.get(externalId)!;
    return {
      ad_id: adRowId,
      snapshot_date: today,
      spend_min: s.spendMin,
      spend_max: s.spendMax,
      impressions_min: s.impressionsMin,
      impressions_max: s.impressionsMax,
      is_active: s.active,
    };
  });
  const SNAPSHOT_BATCH_SIZE = 1000;
  for (let i = 0; i < snapshotRows.length; i += SNAPSHOT_BATCH_SIZE) {
    const batch = snapshotRows.slice(i, i + SNAPSHOT_BATCH_SIZE);
    await sql`
      insert into ad_snapshots ${sql(batch, ...SNAPSHOT_COLUMNS)}
      on conflict (ad_id, snapshot_date) do update set
        spend_min = excluded.spend_min,
        spend_max = excluded.spend_max,
        impressions_min = excluded.impressions_min,
        impressions_max = excluded.impressions_max,
        is_active = excluded.is_active
    `;
  }

  return { advertisersChecked: advertisers.length, adsSeen, newAds, updatedAds };
}
