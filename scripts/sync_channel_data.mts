// Pulls Facebook/Instagram activity, newsletter sends, and lead-gen ad
// status for the 28 pilot MPs from Hani's "MP Packages | Data
// Warehouse" sheet, then rolls this week's totals into the existing
// organic_posts/newsletter_sends tables. Safe to run repeatedly.
//
// Run with: npx tsx --env-file=.env.local scripts/sync_channel_data.mts
import { sql } from "../lib/db";
import { syncChannelDataFromSheet, aggregateWeeklyChannelActivity } from "../lib/channelDataSync";

function mondayOnOrBefore(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

console.log("Syncing Facebook/Instagram/newsletter/lead-gen data for the 28 pilot MPs...");
const summary = await syncChannelDataFromSheet();

console.log(`\nMatched ${summary.matched.length} of ${summary.pilotMpCount} pilot MPs:`);
for (const m of summary.matched) {
  console.log(`  ${m.constituency} — ${m.mp} -> "${m.sheetName}"`);
}

if (summary.unmatched.length > 0) {
  console.log(`\n${summary.unmatched.length} not found in the sheet:`);
  for (const u of summary.unmatched) {
    console.log(`  ${u.constituency} — ${u.mp}`);
  }
}

console.log(`\nUpserted ${summary.dailyRowsUpserted} daily activity rows.`);
console.log(`Upserted ${summary.newsletterEventsUpserted} newsletter events.`);
console.log(`Upserted ${summary.leadgenSnapshotsUpserted} lead-gen ad snapshots.`);

const weekStart = mondayOnOrBefore(new Date());
const weekEnd = new Date(weekStart);
weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
const periodStart = weekStart.toISOString().slice(0, 10);
const periodEnd = weekEnd.toISOString().slice(0, 10);

console.log(`\nRolling up ${periodStart} to ${periodEnd} into organic_posts/newsletter_sends...`);
await aggregateWeeklyChannelActivity(periodStart, periodEnd);

console.log("Done.");
await sql.end();
