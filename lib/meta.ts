// Thin client for Meta's Graph API / Ad Library API. Only reads public
// data (Page IDs, political ads) — never touches anything requiring the
// Page owner's permission.

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class MetaApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  const body = await res.json();
  if (!res.ok) {
    throw new MetaApiError(
      `Graph API error on ${path}: ${res.status}`,
      res.status,
      body
    );
  }
  return body as T;
}

export type ArchivedAd = {
  id: string;
  page_id: string;
  page_name: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_snapshot_url?: string;
  currency?: string;
  spend?: { lower_bound?: string; upper_bound?: string };
  impressions?: { lower_bound?: string; upper_bound?: string };
  publisher_platforms?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
};

type AdsArchiveResponse = {
  data: ArchivedAd[];
  paging?: { cursors?: { after?: string }; next?: string };
};

const ADS_ARCHIVE_FIELDS = [
  "id",
  "page_id",
  "page_name",
  "ad_creative_bodies",
  "ad_creative_link_titles",
  "ad_snapshot_url",
  "currency",
  "spend",
  "impressions",
  "publisher_platforms",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
].join(",");

async function searchAdsArchive(
  searchParams: Record<string, string>,
  accessToken: string,
  activeStatus: "ACTIVE" | "INACTIVE" | "ALL"
): Promise<ArchivedAd[]> {
  const ads: ArchivedAd[] = [];
  let after: string | undefined;

  do {
    const params: Record<string, string> = {
      ...searchParams,
      ad_type: "POLITICAL_AND_ISSUE_ADS",
      ad_reached_countries: JSON.stringify(["GB"]),
      ad_active_status: activeStatus,
      fields: ADS_ARCHIVE_FIELDS,
      access_token: accessToken,
      limit: "250",
    };
    if (after) params.after = after;

    const response = await graphGet<AdsArchiveResponse>("ads_archive", params);
    ads.push(...response.data);
    after = response.paging?.cursors?.after;
  } while (after);

  return ads;
}

/**
 * Searches the Ad Library for political/issue ads run by up to 10 Page
 * IDs at once (the API's own batching limit) — so a full 650-constituency
 * sweep is ~65 calls, not 650. This is the precise, reliable path used
 * for every regular sync once a constituency's Page ID is known.
 */
export async function searchAdsByPageIds(
  pageIds: string[],
  accessToken: string,
  options: { activeStatus?: "ACTIVE" | "INACTIVE" | "ALL" } = {}
): Promise<ArchivedAd[]> {
  if (pageIds.length === 0) return [];
  if (pageIds.length > 10) {
    throw new Error("searchAdsByPageIds only accepts up to 10 page IDs per call");
  }
  return searchAdsArchive(
    { search_page_ids: JSON.stringify(pageIds) },
    accessToken,
    options.activeStatus ?? "ALL"
  );
}

/**
 * Searches by name instead of Page ID. Used only once per MP, to
 * bootstrap-discover their Page ID from any ad they've already run —
 * the Graph API's direct username-to-ID lookup requires a permission
 * (Page Public Content Access) that isn't available without a much
 * heavier App Review process, so this is the practical way in for V1.
 * A constituency with no ads yet simply can't be resolved this way
 * until they run their first one.
 */
export async function searchAdsByName(
  name: string,
  accessToken: string
): Promise<ArchivedAd[]> {
  return searchAdsArchive({ search_terms: name }, accessToken, "ALL");
}
