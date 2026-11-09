// SHORT-TERM STOPGAP, used only while Crete is not yet collecting an MP's TikTok.
//
// Reads TikTok's own public video pages (no login) for the videos listed, plus any
// stopgap videos we already hold, and saves their views/likes/comments/shares.
// Only accounts we already hold as a manual link are accepted, so it can't add a
// stranger's videos. Rows are marked source = 'manual'. When Crete starts
// collecting the account its sync writes the same video web address, so it simply
// overwrites these rows: nothing is double-counted.
//
// Usage:
//   npm run read:tiktok:dry -- <video url> <video url> ...   (shows what it would save)
//   npm run read:tiktok -- <video url> ...                   (saves)
//   npm run read:tiktok                                      (just refreshes videos already held)
//
// Finding the video links: open the MP's TikTok profile in a browser and copy each video's address.
import postgres from "postgres";
import { requireEnv } from "../lib/env";
import { log } from "../lib/log";

const dryRun = process.argv.includes("--dry-run");
const urls = process.argv.slice(2).filter((a) => a.startsWith("http"));
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const PAUSE_MS = 1500; // be gentle: one page every 1.5 seconds

type Stats = { id: string; author: string; postedAt: Date; views: number; likes: number; comments: number; shares: number };

async function readVideo(url: string): Promise<Stats | null> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  const item = JSON.parse(m[1])?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
  if (!item?.id || !item?.stats) return null;
  return {
    id: String(item.id),
    author: String(item.author?.uniqueId ?? "").toLowerCase(),
    postedAt: new Date(Number(item.createTime) * 1000),
    views: Number(item.stats.playCount ?? 0),
    likes: Number(item.stats.diggCount ?? 0),
    comments: Number(item.stats.commentCount ?? 0),
    shares: Number(item.stats.shareCount ?? 0),
  };
}

async function main() {
  const sql = postgres(requireEnv("DATABASE_URL", "the database address", "Copy it from your Supabase project settings."), { max: 1 });
  try {
    // Accounts we hold as a manual link, keyed by TikTok handle.
    const accounts = await sql<{ id: string; handle: string }[]>`
      select id, lower(regexp_replace(profile_url, '^.*/@', '')) as handle
      from social_accounts
      where platform = 'tiktok' and source = 'manual' and is_active and profile_url like '%/@%'`;
    const byHandle = new Map(accounts.map((a) => [a.handle, a.id]));

    // Videos already held as a stopgap (source 'manual'), refreshed so their counts stay current.
    const held = await sql<{ video_url: string }[]>`select video_url from tiktok_videos where source = 'manual'`;
    const all = Array.from(new Set([...urls.map((u) => u.split("?")[0]), ...held.map((h) => h.video_url)]));
    log.info("tiktok-public", `${all.length} video(s) to read (${urls.length} given, ${held.length} already held).${dryRun ? " DRY RUN: nothing will be saved." : ""}`);

    let saved = 0;
    for (const url of all) {
      const s = await readVideo(url);
      await new Promise((r) => setTimeout(r, PAUSE_MS));
      if (!s) {
        log.warn("tiktok-public", `could not read ${url} (removed, private, or TikTok blocked the request)`);
        continue;
      }
      const accountId = byHandle.get(s.author);
      if (!accountId) {
        log.warn("tiktok-public", `skipped ${url}: @${s.author} is not an account we hold a manual link for`);
        continue;
      }
      const canonical = `https://www.tiktok.com/@${s.author}/video/${s.id}`;
      log.info("tiktok-public", `@${s.author} ${s.postedAt.toISOString().slice(0, 10)}: ${s.views} views, ${s.likes} likes, ${s.comments} comments`);
      if (dryRun) continue;
      // If Crete already holds this video (same address), leave it alone: Crete is the real source.
      await sql`
        insert into tiktok_videos (account_id, video_url, external_video_id, posted_at, view_count, like_count, comment_count, share_count, source, last_updated_at)
        values (${accountId}, ${canonical}, ${s.id}, ${s.postedAt.toISOString()}, ${s.views}, ${s.likes}, ${s.comments}, ${s.shares}, 'manual', now())
        on conflict (video_url) do update set
          view_count = excluded.view_count, like_count = excluded.like_count, comment_count = excluded.comment_count,
          share_count = excluded.share_count, last_updated_at = excluded.last_updated_at
        where tiktok_videos.source = 'manual'`;
      saved++;
    }
    log.info("tiktok-public", dryRun ? "Dry run finished. Success." : `Saved ${saved} video(s). Success.`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  log.error("tiktok-public", `FAILED. ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
