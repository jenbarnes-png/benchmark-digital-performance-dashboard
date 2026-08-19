// Pulls TikTok account + video data for the 28 pilot MPs from Hani's
// data-warehouse sheet (Brandwatch-sourced, publicly link-shared).
// Safe to run repeatedly — everything is upserted.
//
// Run with: npx tsx --env-file=.env.local scripts/sync_tiktok.mts
import { sql } from "../lib/db";
import { syncTiktokFromSheet } from "../lib/tiktokSync";

console.log("Syncing TikTok data for the 28 pilot MPs...");
const summary = await syncTiktokFromSheet();

console.log(`\nMatched ${summary.matched.length} of ${summary.pilotMpCount} pilot MPs:`);
for (const m of summary.matched) {
  console.log(`  ${m.constituency} — ${m.mp} -> @${m.username}`);
}

if (summary.unmatched.length > 0) {
  console.log(`\n${summary.unmatched.length} not found in the sheet (no TikTok tracked, or name didn't match):`);
  for (const u of summary.unmatched) {
    console.log(`  ${u.constituency} — ${u.mp}`);
  }
}

console.log(`\nUpserted ${summary.videosUpserted} videos (last 90 days).`);
await sql.end();
