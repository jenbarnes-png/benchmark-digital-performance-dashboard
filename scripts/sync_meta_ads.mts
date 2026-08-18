// Fetches current political ad data for every resolved advertiser,
// stores it, and rolls it up into this week's ad_spend figures. Safe to
// run repeatedly (same day or many times a day) — everything is
// upserted, never duplicated.
//
// Run with: npx tsx --env-file=.env.local scripts/sync_meta_ads.ts
import { sql } from "../lib/db";
import { syncMetaAds } from "../lib/adSpendSync";
import { aggregateAdSpendForWeek } from "../lib/adSpendAggregation";

const accessToken = process.env.META_ACCESS_TOKEN;
if (!accessToken) {
  console.error("META_ACCESS_TOKEN is not set in .env.local");
  process.exit(1);
}

function mondayOnOrBefore(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

console.log("Syncing ads from the Meta Ad Library...");
const summary = await syncMetaAds(accessToken);
console.log(summary);

const weekStart = mondayOnOrBefore(new Date());
const weekEnd = new Date(weekStart);
weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
const periodStart = weekStart.toISOString().slice(0, 10);
const periodEnd = weekEnd.toISOString().slice(0, 10);

console.log(`Aggregating spend for the week of ${periodStart}...`);
await aggregateAdSpendForWeek(periodStart, periodEnd);

console.log("Done.");
await sql.end();
