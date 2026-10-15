// Fetches current political ad data for every matched advertiser, stores it, and
// rolls it up into a trailing-60-day ad_spend figure. Safe to run repeatedly:
// everything is upserted, never duplicated.
//
//   Try it first (reads from Meta, writes nothing):  npm run sync:meta:dry
//   Run it for real:                                 npm run sync:meta
//
// Cost note: Meta's Ad Library API is free, but a full run makes roughly one
// request per 250 ads and takes a minute or two. META_MAX_PAGES (default 60)
// caps pages per search so a fault can't loop for ever.
// Needs META_ACCESS_TOKEN and DATABASE_URL in .env.local (see .env.example).
import { sql } from "../lib/db";
import { syncMetaAds } from "../lib/adSpendSync";
import { aggregateRecentAdSpend } from "../lib/adSpendAggregation";
import { requireEnv } from "../lib/env";
import { log } from "../lib/log";

const dryRun = process.argv.includes("--dry-run");

function mondayOnOrBefore(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1) - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

try {
  // WARNING: this token is a secret. Never print it.
  const accessToken = requireEnv(
    "META_ACCESS_TOKEN",
    "the key that lets us read Meta's public Ad Library",
    "Generate one in Meta's Graph API Explorer (developers.facebook.com > Tools). Tokens last about 60 days, so an expired one is the usual cause of a failure."
  );

  log.info("meta-ads", dryRun ? "DRY RUN: reading from the Meta Ad Library, nothing will be written." : "Starting. Reading ads from the Meta Ad Library.");
  const summary = await syncMetaAds(accessToken, { dryRun });
  log.info("meta-ads", `Checked ${summary.advertisersChecked} advertisers, saw ${summary.adsSeen} ads, ${summary.newAds} new, ${summary.updatedAds} updated.`);

  if (dryRun) {
    log.info("meta-ads", 'DRY RUN finished. Run "npm run sync:meta" to do it for real.');
  } else {
    const weekStart = mondayOnOrBefore(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const periodStart = weekStart.toISOString().slice(0, 10);
    const periodEnd = weekEnd.toISOString().slice(0, 10);
    log.info("meta-ads", `Rolling up trailing 60-day spend as of ${periodEnd}.`);
    await aggregateRecentAdSpend(periodStart, periodEnd);
    log.info("meta-ads", "Success.");
  }
} catch (error) {
  log.error("meta-ads", `FAILED. ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
