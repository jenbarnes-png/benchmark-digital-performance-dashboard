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
import { getTokenStatus } from "../lib/meta";
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

  // Check the token first so an expired one gives a clear message, and a soon-to-expire one gives warning.
  const status = await getTokenStatus(accessToken);
  if (!status.valid) {
    throw new Error(
      `The Meta access token is no longer valid (${status.problem}). What failed: ads can't be read from Meta. ` +
        `Why: Meta tokens expire about every 60 days. How to fix: generate a new token and run "npm run meta:renew" (see README, "Renewing the Meta token").`
    );
  }
  if (status.expiresAt) {
    const daysLeft = Math.floor((status.expiresAt.getTime() - Date.now()) / 86_400_000);
    if (daysLeft <= 10) {
      log.warn("meta-ads", `The Meta token expires in ${daysLeft} day(s) (${status.expiresAt.toISOString().slice(0, 10)}). Renew it soon with "npm run meta:renew".`);
      console.log(`::warning::Meta token expires in ${daysLeft} day(s). Renew it with npm run meta:renew.`);
    }
  }

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
