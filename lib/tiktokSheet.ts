import { parse } from "csv-parse/sync";

// Colleague-maintained TikTok data warehouse (Brandwatch-sourced), shared
// as a "anyone with the link" Google Sheet — no API key or login involved,
// same public-data posture as everything else in this project. If Hani
// ever turns off link sharing or restructures the sheet, these fetches
// start failing loudly (non-2xx or a missing column) rather than silently
// syncing garbage.
const SHEET_ID = "1ssvTTk0_B6AsUOxfw4wZF3iZLhMzhJMwYR1OkpSIGM8";
const GIDS = {
  dimAccounts: "722887782",
  factVideo: "2054257735",
  factAccountDay: "1956120444",
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

export type DimAccountRow = {
  username: string;
  display_name: string;
  mp_name: string;
  party: string;
  is_mp: string;
  is_labour: string;
  status: string;
};

export type FactVideoRow = {
  video_id: string;
  username: string;
  uploaded_at: string;
  url: string;
  title: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
};

export type FactAccountDayRow = {
  date: string;
  username: string;
  followers: string;
};

export async function fetchDimAccounts(): Promise<DimAccountRow[]> {
  return fetchTab(GIDS.dimAccounts) as Promise<DimAccountRow[]>;
}

export async function fetchFactVideo(): Promise<FactVideoRow[]> {
  return fetchTab(GIDS.factVideo) as Promise<FactVideoRow[]>;
}

export async function fetchFactAccountDay(): Promise<FactAccountDayRow[]> {
  return fetchTab(GIDS.factAccountDay) as Promise<FactAccountDayRow[]>;
}
