import { parse } from "csv-parse/sync";

// Hani's "MP Packages | Data Warehouse" sheet — Facebook/Instagram
// organic activity, newsletter sends, and lead-gen ad status. Same
// "anyone with the link" public-data posture as the TikTok warehouse.
const SHEET_ID = "1iemDeSR5zDH7fK7E77_0mOm8pjlWI_VTj4CaN2w7R9I";
const GIDS = {
  channelData: "217623830",
  mpNewsletters: "734385061",
  metaAds: "1418355196",
} as const;

async function fetchTab(gid: string): Promise<Record<string, string>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch channel data warehouse tab (gid=${gid}): HTTP ${res.status}`);
  }
  const text = await res.text();
  return parse(text, { columns: true, skip_empty_lines: true });
}

export type ChannelDataRow = {
  Date: string;
  MP: string;
  "FB posts": string;
  "IG posts": string;
  "FB Reels": string;
  "FB Videos": string;
  "IG Reels": string;
  "FB Reach": string;
  "IG Reach": string;
  "FB Top URL": string;
  "FB Top Text": string;
  "FB Top Reach": string;
  "FB Top Eng": string;
  "IG Top URL": string;
  "IG Top Text": string;
  "IG Top Reach": string;
  "IG Top Eng": string;
};

export type NewsletterRow = {
  "Date Received": string;
  "MP Name": string;
  Subject: string;
  Sender: string;
  "Gmail Message ID": string;
};

export type MetaAdsRow = {
  MP: string;
  "Leads Active": string;
  "Reach Active": string;
  "Total Spend MTD (£)": string;
  Reach: string;
  Leads: string;
  Campaigns: string;
  "Last Updated": string;
  "Top Campaign": string;
  "Top Campaign Reach": string;
};

export async function fetchChannelData(): Promise<ChannelDataRow[]> {
  return fetchTab(GIDS.channelData) as Promise<ChannelDataRow[]>;
}

export async function fetchMpNewsletters(): Promise<NewsletterRow[]> {
  return fetchTab(GIDS.mpNewsletters) as Promise<NewsletterRow[]>;
}

export async function fetchMetaAdsLeadgen(): Promise<MetaAdsRow[]> {
  return fetchTab(GIDS.metaAds) as Promise<MetaAdsRow[]>;
}
