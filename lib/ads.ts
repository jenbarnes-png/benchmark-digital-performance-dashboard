import { sql } from "./db";

export type AdListItem = {
  id: string;
  creativeBody: string | null;
  creativeLinkTitle: string | null;
  snapshotUrl: string | null;
  spendMin: number | null;
  spendMax: number | null;
  currency: string | null;
  publisherPlatforms: string[] | null;
  deliveryStart: string | null;
  deliveryStop: string | null;
  isActive: boolean;
};

export async function getAdsForConstituency(constituencyId: string, limit = 25): Promise<AdListItem[]> {
  const rows = await sql<
    {
      id: string;
      ad_creative_body: string | null;
      ad_creative_link_title: string | null;
      ad_snapshot_url: string | null;
      spend_min: string | null;
      spend_max: string | null;
      currency: string | null;
      publisher_platforms: string[] | null;
      ad_delivery_start_time: string | null;
      ad_delivery_stop_time: string | null;
      is_active: boolean;
    }[]
  >`
    select
      ads.id, ads.ad_creative_body, ads.ad_creative_link_title, ads.ad_snapshot_url,
      ads.spend_min, ads.spend_max, ads.currency, ads.publisher_platforms,
      ads.ad_delivery_start_time::text, ads.ad_delivery_stop_time::text, ads.is_active
    from ads
    join advertisers a on a.id = ads.advertiser_id
    where a.constituency_id = ${constituencyId}
    order by ads.is_active desc, ads.ad_delivery_start_time desc nulls last
    limit ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    creativeBody: r.ad_creative_body,
    creativeLinkTitle: r.ad_creative_link_title,
    snapshotUrl: r.ad_snapshot_url,
    spendMin: r.spend_min === null ? null : Number(r.spend_min),
    spendMax: r.spend_max === null ? null : Number(r.spend_max),
    currency: r.currency,
    publisherPlatforms: r.publisher_platforms,
    deliveryStart: r.ad_delivery_start_time,
    deliveryStop: r.ad_delivery_stop_time,
    isActive: r.is_active,
  }));
}
