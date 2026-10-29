import { toCsv, type CsvValue } from "./csv";
import type { RankingRow } from "./rankings";
import type { Period } from "./rankings";

// The columns of the Rankings CSV export: one row per MP per week. A blank cell means "no data
// for this", which is different from a 0 (tracked, but nothing happened).
export const RANKINGS_CSV_HEADERS = [
  "Week starting",
  "Week ending",
  "Rank",
  "MP",
  "Constituency",
  "Region",
  "Overall score",
  "Points possible",
  "Previous week score",
  "Change vs previous week",
  "Ad running (Meta)",
  "TikTok points",
  "TikTok posted in last 7 days",
  "TikTok posted in last 30 days",
  "TikTok views (last 30 days)",
  "Best TikTok of the week",
  "Facebook/Instagram points",
  "Reel in last 7 days",
  "Posted on Facebook/Instagram in last 7 days",
  "Newsletter sent this month",
  "Facebook group posts (reported)",
  "Amplifier group points",
  "Amplifier group members",
  "Email list size (declared)",
  "Email list declared for month",
  "Email list change",
  "Subscriber growth point",
];

export function rankingRowToRecord(period: Period, r: RankingRow): CsvValue[] {
  const has = <T,>(ok: boolean, value: T): T | "" => (ok ? value : "");
  return [
    period.start,
    period.end,
    r.score === null ? "" : r.rank,
    r.constituency.mp_or_candidate_name,
    r.constituency.name,
    r.constituency.region,
    r.score,
    r.scoreMaxPoints,
    r.previousScore,
    r.change.delta,
    r.adLive,
    has(r.tiktok.hasData, r.tiktok.points ?? ""),
    has(r.tiktok.hasData, r.tiktok.postedInLast7Days),
    has(r.tiktok.hasData, r.tiktok.postedInLast30Days),
    has(r.tiktok.hasData, r.tiktok.reach),
    has(r.tiktok.hasData, r.tiktok.isBestPostWinner),
    has(r.channel.hasData, (r.channel.reelIn7Days ? 1 : 0) + (r.channel.postedIn7Days ? 1 : 0)),
    has(r.channel.hasData, r.channel.reelIn7Days),
    has(r.channel.hasData, r.channel.postedIn7Days),
    has(r.newsletterActivity.hasData, r.newsletterActivity.sentThisCalendarMonth),
    has(r.group.hasData, r.group.postCount),
    has(r.amplifiers.hasData, r.amplifiers.points),
    has(r.amplifiers.hasData, r.amplifiers.memberCount),
    r.subscriberGrowth.listSize,
    r.subscriberGrowth.listSizeMonth,
    r.subscriberGrowth.listChange,
    has(r.subscriberGrowth.hasData, r.subscriberGrowth.grewByAtLeastTarget),
  ];
}

export function rankingsToCsv(weeks: { period: Period; rows: RankingRow[] }[]): string {
  const records = weeks.flatMap((w) => w.rows.map((r) => rankingRowToRecord(w.period, r)));
  return toCsv(RANKINGS_CSV_HEADERS, records);
}

/** A readable file name, e.g. "rankings_2026-10-05_to_2026-10-26_Wales.csv". */
export function rankingsFileName(from: string, to: string, region?: string): string {
  const safeRegion = region ? `_${region.replace(/[^A-Za-z0-9]+/g, "-")}` : "_all-regions";
  return `rankings_${from}_to_${to}${safeRegion}.csv`;
}
