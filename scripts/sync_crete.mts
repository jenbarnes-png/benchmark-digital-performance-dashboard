// Pulls Facebook, Instagram and TikTok posts for the pilot MPs from the Crete
// store (Elasticsearch) into the dashboard database. Safe to re-run.
//
// Run with: npx tsx --env-file=.env.local scripts/sync_crete.mts
import { sql } from "../lib/db";
import { syncCrete } from "../lib/creteSync";
import { aggregateWeeklyChannelActivity } from "../lib/channelAggregation";

function mondayOnOrBefore(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1) - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

console.log("Syncing Facebook, Instagram and TikTok from Crete...");
const summary = await syncCrete();

for (const [platform, p] of Object.entries(summary.platforms)) {
  console.log(`\n== ${platform} ==`);
  console.log(`${p.postsRead} posts from ${p.accountsSeen} accounts; ${p.accountsMatched} matched to an MP.`);
  if (p.fallbackMatches.length) {
    console.log("Matched by name (no stored link) - worth a glance:");
    for (const m of p.fallbackMatches) console.log(`  ${m.account} -> ${m.mp}`);
  }
  if (p.unmatchedAccounts.length) {
    console.log("Accounts we couldn't match to an MP:");
    for (const u of p.unmatchedAccounts) console.log(`  ${u.account} (${u.reason})`);
  }
  console.log(`MPs with no ${platform} data in Crete yet: ${p.mpsWithNoData.length}`);
  if (process.argv.includes("--verbose")) for (const m of p.mpsWithNoData) console.log(`  ${m}`);
}
console.log(`\nUpserted ${summary.dailyRowsUpserted} Facebook/Instagram daily rows and ${summary.tiktokVideosUpserted} TikTok videos.`);

// Roll the last two weeks up into the weekly tables the platform cards read.
for (const offset of [0, 7]) {
  const start = mondayOnOrBefore(new Date());
  start.setUTCDate(start.getUTCDate() - offset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  await aggregateWeeklyChannelActivity(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
}
console.log("Weekly roll-ups updated.");
await sql.end();
