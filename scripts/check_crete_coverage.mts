// Read-only health check: is Crete collecting, and does every visible MP have
// this week's activity on each platform? Prints a short report; changes nothing.
//
// Run with: npx tsx --env-file=.env.local scripts/check_crete_coverage.mts
import { sql } from "../lib/db";
import { creteHealth } from "../lib/crete";

function mondayOnOrBefore(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + (d.getUTCDay() === 0 ? -6 : 1) - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
const hoursAgo = (iso: string | null) => (iso ? Math.round((Date.now() - new Date(iso).getTime()) / 36e5 * 10) / 10 : null);

const health = await creteHealth();
console.log(`Checked ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC\n`);
console.log("CRETE STORE");
for (const [platform, h] of Object.entries(health)) {
  const ago = hoursAgo(h.lastScraped);
  console.log(
    `  ${platform.padEnd(9)} ${String(h.posts).padStart(4)} posts, ${String(h.accounts).padStart(2)} accounts | earliest post ${h.earliestPost?.slice(0, 10)} | last collected ${ago}h ago${ago !== null && ago > 8 ? "  <-- STALE" : ""}`
  );
}

const weekStart = mondayOnOrBefore(new Date());
const mps = await sql<{ id: string; name: string; constituency: string }[]>`
  select r.id, r.name, c.name as constituency
  from representatives r join constituencies c on c.id = r.constituency_id
  where c.is_pilot = true and not c.is_hidden and r.ended_at is null order by r.name
`;
const feed = await sql<{ representative_id: string; platform: string; posts: number; reels: number; last_day: string }[]>`
  select representative_id, platform, sum(post_count)::int posts, sum(reel_count)::int reels, max(date) filter (where post_count > 0)::text last_day
  from social_activity_daily where date >= ${weekStart} group by 1, 2
`;
const tiktok = await sql<{ representative_id: string; videos: number; last_posted: string }[]>`
  select sa.representative_id, count(*)::int videos, max(tv.posted_at)::text last_posted
  from tiktok_videos tv join social_accounts sa on sa.id = tv.account_id
  where tv.posted_at >= ${weekStart} group by 1
`;
const tiktokAccounts = new Set(
  (await sql<{ representative_id: string }[]>`select representative_id from social_accounts where platform = 'tiktok' and ended_at is null`).map((r) => r.representative_id)
);

const has = (repId: string, platform: string) => (feed.find((f) => f.representative_id === repId && f.platform === platform)?.posts ?? 0) > 0;
const noFb = mps.filter((m) => !has(m.id, "facebook"));
const noIg = mps.filter((m) => !has(m.id, "instagram"));
const ttSet = new Set(tiktok.map((t) => t.representative_id));
const noTt = mps.filter((m) => tiktokAccounts.has(m.id) && !ttSet.has(m.id));

console.log(`\nTHIS WEEK (from ${weekStart}), ${mps.length} visible MPs, counting MPs with at least one post in Crete`);
console.log(`  Facebook   ${mps.length - noFb.length}/${mps.length}   posts ${feed.filter((f) => f.platform === "facebook").reduce((a, f) => a + f.posts, 0)}, reels ${feed.filter((f) => f.platform === "facebook").reduce((a, f) => a + f.reels, 0)}`);
console.log(`  Instagram  ${mps.length - noIg.length}/${mps.length}   posts ${feed.filter((f) => f.platform === "instagram").reduce((a, f) => a + f.posts, 0)}, reels ${feed.filter((f) => f.platform === "instagram").reduce((a, f) => a + f.reels, 0)}`);
console.log(`  TikTok     ${mps.filter((m) => ttSet.has(m.id)).length}/${tiktokAccounts.size ? mps.filter((m) => tiktokAccounts.has(m.id)).length : 0} MPs with a TikTok account   videos ${tiktok.reduce((a, t) => a + t.videos, 0)}`);
console.log(`\nNo Facebook this week yet (${noFb.length}): ${noFb.map((m) => m.name).join(", ") || "none"}`);
console.log(`No Instagram this week yet (${noIg.length}): ${noIg.map((m) => m.name).join(", ") || "none"}`);
console.log(`Have a TikTok account but no video this week yet (${noTt.length}): ${noTt.map((m) => m.name).join(", ") || "none"}`);
await sql.end();
