// Swaps a short-lived Meta token (from Graph API Explorer) for one that lasts about 60 days,
// then saves it in .env.local, Vercel and GitHub in one go. Nothing is printed except the new
// expiry date. Try it first with --dry-run: it does the swap and checks the result, but saves nothing.
//
// Before running, add THREE lines to .env.local (never paste these into chat):
//   META_APP_ID=...             your Facebook app's ID        (developers.facebook.com > your app > Settings > Basic)
//   META_APP_SECRET=...         that page's "App secret"      (same page, click Show)
//   META_SHORT_LIVED_TOKEN=...  a fresh token from Graph API Explorer. IMPORTANT: choose YOUR app in the
//                               "Meta App" dropdown first, then Generate Access Token (permission: ads_read).
//
//   npm run meta:renew:dry    then    npm run meta:renew
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { requireEnv } from "../lib/env";
import { getTokenStatus } from "../lib/meta";
import { log } from "../lib/log";

const dryRun = process.argv.includes("--dry-run");
const repo = process.env.GITHUB_REPO ?? "jenbarnes-png/benchmark-digital-performance-dashboard";

function saveEverywhere(newToken: string) {
  // 1. .env.local on this computer: replace the old token, clear the short-lived one.
  let env = readFileSync(".env.local", "utf8");
  env = /^META_ACCESS_TOKEN=/m.test(env) ? env.replace(/^META_ACCESS_TOKEN=.*$/m, () => `META_ACCESS_TOKEN=${newToken}`) : `${env.trimEnd()}\nMETA_ACCESS_TOKEN=${newToken}\n`;
  env = env.replace(/^META_SHORT_LIVED_TOKEN=.*$/m, "META_SHORT_LIVED_TOKEN=");
  writeFileSync(".env.local", env, { mode: 0o600 });
  log.info("meta-renew", "Saved to .env.local.");

  // 2. Vercel (the live site). The token goes in through stdin, never on the command line.
  spawnSync("npx", ["vercel", "env", "rm", "META_ACCESS_TOKEN", "production", "--yes"], { encoding: "utf8" });
  const vercel = spawnSync("npx", ["vercel", "env", "add", "META_ACCESS_TOKEN", "production", "--sensitive"], { input: newToken, encoding: "utf8" });
  if (vercel.status !== 0) throw new Error("Could not update Vercel. Run 'npx vercel login' and try again.");
  log.info("meta-renew", "Saved to Vercel.");

  // 3. GitHub (the scheduled sync).
  const gh = spawnSync("gh", ["secret", "set", "META_ACCESS_TOKEN", "--repo", repo], { input: newToken, encoding: "utf8" });
  if (gh.status !== 0) throw new Error("Could not update GitHub. Run 'gh auth login' and try again.");
  log.info("meta-renew", "Saved to GitHub.");
}

try {
  // WARNING: all four values below are secrets. Never print them.
  const appId = requireEnv("META_APP_ID", "your Facebook app's ID", "developers.facebook.com > your app > Settings > Basic.");
  const appSecret = requireEnv("META_APP_SECRET", "your Facebook app's secret", "Same page as the app ID: click Show next to App secret.");
  const shortToken = requireEnv("META_SHORT_LIVED_TOKEN", "a fresh token from Graph API Explorer", "In Graph API Explorer pick YOUR app in the Meta App dropdown, then Generate Access Token.");

  log.info("meta-renew", dryRun ? "DRY RUN: swapping the token and checking it, nothing will be saved." : "Swapping for a long-lived token.");
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.search = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken }).toString();
  const res = await fetch(url);
  const json = (await res.json()) as { access_token?: string; error?: { message?: string } };
  if (!json.access_token) {
    const why = json.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Meta refused the swap: ${why}. The usual cause is generating the short-lived token under Meta's default app instead of yours. In Graph API Explorer, pick your own app in the Meta App dropdown, generate a new token, and try again.`);
  }

  const status = await getTokenStatus(json.access_token);
  if (!status.valid) throw new Error(`The new token didn't pass Meta's check: ${status.problem}`);
  const days = status.expiresAt ? Math.floor((status.expiresAt.getTime() - Date.now()) / 86_400_000) : null;
  log.info("meta-renew", `New token works. Expires ${status.expiresAt?.toISOString().slice(0, 10) ?? "never"}${days !== null ? ` (${days} days)` : ""}.`);

  if (dryRun) {
    log.info("meta-renew", 'DRY RUN finished. Run "npm run meta:renew" to save it. (Generate a fresh short-lived token first if this one is used up.)');
  } else {
    saveEverywhere(json.access_token);
    log.info("meta-renew", "Done. Ads tracking picks it up on the next sync. To refresh straight away: npm run sync:meta.");
  }
} catch (error) {
  log.error("meta-renew", `FAILED. ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
