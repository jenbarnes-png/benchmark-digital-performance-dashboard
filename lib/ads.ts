import { sql } from "./db";
import { RECENT_WINDOW_DAYS } from "./adRecency";

export type AdListItem = {
  id: string;
  creativeBody: string | null;
  creativeLinkTitle: string | null;
  /** Meta's own public Ad Library page for this ad — safe to link to,
   * unlike the API's ad_snapshot_url field, which embeds our live
   * access token in its query string. */
  publicLibraryUrl: string;
  spendMin: number | null;
  spendMax: number | null;
  currency: string | null;
  publisherPlatforms: string[] | null;
  deliveryStart: string | null;
  deliveryStop: string | null;
  isActive: boolean;
};

/** Ads whose delivery window overlaps the last RECENT_WINDOW_DAYS days — same window as the hex map and scoring. */
export async function getAdsForConstituency(constituencyId: string, limit = 25): Promise<AdListItem[]> {
  const windowStart = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const rows = await sql<
    {
      id: string;
      external_ad_id: string;
      ad_creative_body: string | null;
      ad_creative_link_title: string | null;
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
      ads.id, ads.external_ad_id, ads.ad_creative_body, ads.ad_creative_link_title,
      ads.spend_min, ads.spend_max, ads.currency, ads.publisher_platforms,
      ads.ad_delivery_start_time::text, ads.ad_delivery_stop_time::text, ads.is_active
    from ads
    join advertisers a on a.id = ads.advertiser_id
    where a.constituency_id = ${constituencyId}
      and ads.ad_delivery_start_time <= now()
      and (ads.ad_delivery_stop_time is null or ads.ad_delivery_stop_time >= ${windowStart})
    order by ads.is_active desc, ads.ad_delivery_start_time desc nulls last
    limit ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    creativeBody: r.ad_creative_body,
    creativeLinkTitle: r.ad_creative_link_title,
    publicLibraryUrl: `https://www.facebook.com/ads/library/?id=${r.external_ad_id}`,
    spendMin: r.spend_min === null ? null : Number(r.spend_min),
    spendMax: r.spend_max === null ? null : Number(r.spend_max),
    currency: r.currency,
    publisherPlatforms: r.publisher_platforms,
    deliveryStart: r.ad_delivery_start_time,
    deliveryStop: r.ad_delivery_stop_time,
    isActive: r.is_active,
  }));
}
