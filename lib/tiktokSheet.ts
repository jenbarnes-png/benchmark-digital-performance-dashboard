import { parse } from "csv-parse/sync";

// Colleague-maintained TikTok data warehouse (Brandwatch-sourced), shared
// as a "anyone with the link" Google Sheet — no API key or login involved,
// same public-data posture as everything else in this project. If Hani
// ever turns off link sharing or restructures the sheet, these fetches
// start failing loudly (non-2xx or a missing column) rather than silently
// syncing garbage.
//
// The sheet's original fact_video / dim_accounts / fact_account_day tabs
// are fed by an import job (raw_import_log) that stopped running after
// 4 Aug 2026 — confirmed dead, not just slow. mp_aggregates is a separate,
// still-live tab (latest_data_update ticks over multiple times a day),
// so that's what we read from. The tradeoff: it gives one account-level
// snapshot per MP (their latest post + their single best-performing
// video) rather than a full video-by-video history, so the "best TikTok
// nationally this week" pick is an approximation off top_video rather
// than an exact comparison across every video posted that week.
const SHEET_ID = "1ssvTTk0_B6AsUOxfw4wZF3iZLhMzhJMwYR1OkpSIGM8";
const GIDS = {
  mpAggregates: "1332447479",
} as const;

async function fetchTab(gid: string): Promise<Record<string, string>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch TikTok warehouse tab (gid=${gid}): HTTP ${res.status}`);
  }
  const text = await res.text();
  return parse(text, { columns: true, skip_empty_lines: true });
}

export type MpAggregateRow = {
  username: string;
  name: string;
  labels: string;
  followers: string;
  last_post_date: string;
  last_post_url: string;
  top_video_url: string;
  top_video_views: string;
  top_video_uploaded: string;
  has_sufficient_data: string;
  latest_data_update: string;
};

export async function fetchMpAggregates(): Promise<MpAggregateRow[]> {
  return fetchTab(GIDS.mpAggregates) as Promise<MpAggregateRow[]>;
}
