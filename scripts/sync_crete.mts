// Pulls Facebook, Instagram and TikTok posts for the pilot MPs from the Crete
// store into the dashboard database. Safe to re-run: every write is an upsert.
//
//   Try it first (reads everything, writes nothing):  npm run sync:crete:dry
//   Run it for real:                                  npm run sync:crete
//
// Needs ES_URL, ES_API_KEY and DATABASE_URL in .env.local (see .env.example).
import { sql } from "../lib/db";
import { syncCrete } from "../lib/creteSync";
import { rollupRecentWeeks } from "../lib/channelAggregation";
import { log } from "../lib/log";

const dryRun = process.argv.includes("--dry-run");
const verbose = process.argv.includes("--verbose");

try {
  log.info("crete-sync", dryRun ? "DRY RUN: reading from Crete, nothing will be written." : "Starting. Reading Facebook, Instagram and TikTok from Crete.");
  const summary = await syncCrete({ dryRun });

  for (const [platform, p] of Object.entries(summary.platforms)) {
    log.info("crete-sync", `${platform}: ${p.postsRead} posts from ${p.accountsSeen} accounts, ${p.accountsMatched} matched to an MP.`);
    for (const m of p.fallbackMatches) log.info("crete-sync", `${platform}: matched by name, worth a glance: ${m.account} -> ${m.mp}`);
    for (const u of p.unmatchedAccounts) log.warn("crete-sync", `${platform}: could not match ${u.account} (${u.reason}).`);
    log.info("crete-sync", `${platform}: ${p.mpsWithNoData.length} MPs have no data in Crete yet.`);
    if (verbose) for (const m of p.mpsWithNoData) log.info("crete-sync", `${platform}:   no data: ${m}`);
  }

  if (dryRun) {
    log.info("crete-sync", `DRY RUN finished. Would write ${summary.dailyRowsUpserted} Facebook/Instagram daily rows and ${summary.tiktokVideosUpserted} TikTok videos. Run "npm run sync:crete" to do it for real.`);
  } else {
    log.info("crete-sync", `Wrote ${summary.dailyRowsUpserted} Facebook/Instagram daily rows and ${summary.tiktokVideosUpserted} TikTok videos.`);
    await rollupRecentWeeks(4);
    log.info("crete-sync", "Weekly roll-ups updated. Success.");
  }
} catch (error) {
  log.error("crete-sync", `FAILED. ${error instanceof Error ? error.message : String(error)}`);
  log.error("crete-sync", "Nothing is half-written: every write is a safe re-runnable upsert, so fix the cause above and run it again.");
  process.exitCode = 1;
} finally {
  await sql.end();
}
