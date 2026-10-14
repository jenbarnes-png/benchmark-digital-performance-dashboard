import { sql } from "./db";
import { accountKey, fetchCretePosts, type CretePlatform, type CretePost } from "./crete";

// Same all-words-present matching used to resolve Meta advertisers.
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
// Short forms we hold vs the formal name an account may use ("Jess" / "Jessica").
const FORMAL_NAMES: Record<string, string> = { jess: "jessica", liv: "olivia", dan: "daniel", becky: "rebecca" };
function nameMatches(candidate: string | null, mpName: string): boolean {
  if (!candidate) return false;
  const have = new Set(words(candidate));
  const want = words(mpName);
  return want.length > 0 && want.every((w) => have.has(w) || (FORMAL_NAMES[w] !== undefined && have.has(FORMAL_NAMES[w])));
}
// "katiewhiteobemp" contains "katiewhite". Handles have no spaces, so squash the name.
function handleContainsName(handle: string, mpName: string): boolean {
  const squashed = words(mpName).join("");
  return squashed.length >= 8 && handle.toLowerCase().replace(/[^a-z0-9]/g, "").includes(squashed);
}

const LONDON_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
function londonDate(d: Date): string {
  return LONDON_DATE.format(d);
}
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Rep = { id: string; name: string; constituency: string };
type AccountRow = { id: string; representative_id: string; platform: string; handle: string | null; profile_url: string | null; source: string };

export type CreteSyncSummary = {
  platforms: Record<
    CretePlatform,
    {
      postsRead: number;
      accountsSeen: number;
      accountsMatched: number;
      unmatchedAccounts: { account: string; reason: string }[];
      fallbackMatches: { account: string; mp: string }[];
      mpsWithNoData: string[];
    }
  >;
  dailyRowsUpserted: number;
  tiktokVideosUpserted: number;
};

const FEED_LOOKBACK_DAYS = 120;
const TIKTOK_LOOKBACK_DAYS = 90;

/**
 * Pulls Facebook, Instagram and TikTok posts from the Crete store and writes
 * them into the tables the dashboard already reads (social_activity_daily,
 * tiktok_videos, social_accounts). Safe to re-run: every write is an upsert.
 *
 * Counts here are "posts published that day", derived straight from the
 * documents. Days before an account's first collected post are left empty
 * (unknown), not written as zero, because the store only started collecting
 * recently and a backfill may still fill them in on a later run.
 */
export async function syncCrete(): Promise<CreteSyncSummary> {
  const reps = await sql<Rep[]>`
    select r.id, r.name, c.name as constituency
    from representatives r join constituencies c on c.id = r.constituency_id
    where c.is_pilot = true and r.ended_at is null
  `;
  const accounts = await sql<AccountRow[]>`
    select id, representative_id, platform, handle, profile_url, source
    from social_accounts where ended_at is null
  `;

  const summary: CreteSyncSummary = {
    platforms: {
      facebook: blankSummary(),
      instagram: blankSummary(),
      tiktok: blankSummary(),
    },
    dailyRowsUpserted: 0,
    tiktokVideosUpserted: 0,
  };

  const today = londonDate(new Date());
  type DailyRow = {
    representative_id: string;
    platform: "facebook" | "instagram";
    date: string;
    post_count: number;
    reel_count: number;
    video_count: number | null;
    reach: number | null;
    top_post_url: string | null;
    top_post_text: string | null;
    top_post_reach: number | null;
    top_post_engagement: number | null;
    source: "automatic";
  };
  const dailyRows: DailyRow[] = [];

  for (const platform of ["facebook", "instagram", "tiktok"] as CretePlatform[]) {
    const lookback = platform === "tiktok" ? TIKTOK_LOOKBACK_DAYS : FEED_LOOKBACK_DAYS;
    const posts = await fetchCretePosts(platform, new Date(Date.now() - lookback * 86_400_000));
    const out = summary.platforms[platform];
    out.postsRead = posts.length;

    // Known accounts for this platform, keyed the same way as the Crete account URLs.
    const repByKey = new Map<string, { repId: string; accountRowId: string }>();
    const repHasRow = new Set<string>();
    for (const a of accounts.filter((x) => x.platform === platform)) {
      repHasRow.add(a.representative_id);
      for (const k of [accountKey(platform, a.profile_url), a.handle ? a.handle.toLowerCase() : null]) {
        if (k) repByKey.set(k, { repId: a.representative_id, accountRowId: a.id });
      }
    }

    // Group posts by account.
    const byAccount = new Map<string, CretePost[]>();
    for (const p of posts) {
      const key = accountKey(platform, p.accountUrl);
      if (!key) continue;
      if (!byAccount.has(key)) byAccount.set(key, []);
      byAccount.get(key)!.push(p);
    }
    out.accountsSeen = byAccount.size;

    const matchedReps = new Set<string>();
    const resolved: { key: string; repId: string; accountRowId: string | null; posts: CretePost[]; fixLink: boolean }[] = [];

    // Pass 1: accounts whose URL matches a link we already hold.
    const leftovers: [string, CretePost[]][] = [];
    for (const [key, accPosts] of byAccount) {
      const exact = repByKey.get(key);
      if (exact) {
        resolved.push({ key, repId: exact.repId, accountRowId: exact.accountRowId, posts: accPosts, fixLink: false });
        matchedReps.add(exact.repId);
      } else {
        leftovers.push([key, accPosts]);
      }
    }

    // Pass 2: match by name / handle. An MP is eligible if they have no link for this
    // platform, or only a hand-entered one that nothing in Crete matched (the collector's
    // URL then replaces it). Links from earlier automatic syncs are never overridden.
    const manualRowByRep = new Map<string, string>();
    const automaticRepIds = new Set<string>();
    for (const a of accounts.filter((x) => x.platform === platform)) {
      if (a.source === "manual") {
        if (!manualRowByRep.has(a.representative_id)) manualRowByRep.set(a.representative_id, a.id);
      } else {
        automaticRepIds.add(a.representative_id);
      }
    }
    for (const [key, accPosts] of leftovers) {
      const sample = accPosts[0];
      const label = `${sample.accountName ?? sample.accountNickname ?? key} (${sample.accountUrl})`;
      const candidates = reps.filter(
        (r) =>
          !matchedReps.has(r.id) &&
          !automaticRepIds.has(r.id) &&
          (nameMatches(sample.accountName, r.name) ||
            nameMatches(sample.accountNickname, r.name) ||
            handleContainsName(key, r.name))
      );
      if (candidates.length === 1) {
        const rep = candidates[0];
        const manualRow = manualRowByRep.get(rep.id) ?? null;
        resolved.push({ key, repId: rep.id, accountRowId: manualRow, posts: accPosts, fixLink: manualRow !== null });
        matchedReps.add(rep.id);
        out.fallbackMatches.push({ account: label, mp: rep.name + (manualRow ? " (replaced their stored link)" : "") });
      } else {
        out.unmatchedAccounts.push({
          account: label,
          reason: candidates.length > 1 ? "matched several MPs" : "no MP with that name",
        });
      }
    }
    out.accountsMatched = resolved.length;
    out.mpsWithNoData = reps.filter((r) => !matchedReps.has(r.id)).map((r) => `${r.name} (${r.constituency})`);

    // Make sure each matched account has a social_accounts row with a fresh follower count.
    for (const acct of resolved) {
      const sample = acct.posts[0];
      const followers = acct.posts.map((p) => p.followers).find((f) => f !== null) ?? null;
      const username = acct.key.startsWith("id:") ? null : acct.key;

      if (acct.accountRowId) {
        await sql`
          update social_accounts
          set profile_url = case when ${acct.fixLink} then ${sample.accountUrl} else profile_url end,
              follower_count = coalesce(${followers}, follower_count),
              follower_count_updated_at = case when ${followers}::int is null then follower_count_updated_at else now() end,
              last_refreshed_at = now()
          where id = ${acct.accountRowId}
        `;
      } else {
        const [row] = await sql<{ id: string }[]>`
          insert into social_accounts (representative_id, platform, handle, profile_url, follower_count, follower_count_updated_at, source, last_refreshed_at)
          values (${acct.repId}, ${platform}, ${username}, ${sample.accountUrl}, ${followers}, ${followers === null ? null : new Date()}, 'automatic', now())
          on conflict (representative_id, platform, handle) do update set
            profile_url = excluded.profile_url,
            follower_count = coalesce(excluded.follower_count, social_accounts.follower_count),
            last_refreshed_at = excluded.last_refreshed_at
          returning id
        `;
        acct.accountRowId = row.id;
        if (platform === "tiktok") {
          // A confirmed automatic row replaces any hand-entered placeholder for the same MP.
          await sql`
            update social_accounts set ended_at = current_date
            where platform = 'tiktok' and source = 'manual' and ended_at is null and representative_id = ${acct.repId}
          `;
        }
      }
    }

    if (platform === "tiktok") {
      type VideoRow = {
        account_id: string;
        video_url: string;
        external_video_id: string | null;
        posted_at: string;
        view_count: number | null;
        like_count: number;
        comment_count: number;
        share_count: number;
        source: "automatic";
        last_updated_at: Date;
      };
      const videos = new Map<string, VideoRow>();
      for (const acct of resolved) {
        if (!acct.accountRowId) continue;
        for (const p of acct.posts) {
          videos.set(p.postUrl, {
            account_id: acct.accountRowId,
            video_url: p.postUrl,
            external_video_id: p.postId,
            posted_at: p.postedAt.toISOString(),
            view_count: p.views,
            like_count: p.likes,
            comment_count: p.comments,
            share_count: p.shares,
            source: "automatic",
            last_updated_at: new Date(),
          });
        }
      }
      const rows = Array.from(videos.values());
      const cols = ["account_id", "video_url", "external_video_id", "posted_at", "view_count", "like_count", "comment_count", "share_count", "source", "last_updated_at"] as const;
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        await sql`
          insert into tiktok_videos ${sql(batch, ...cols)}
          on conflict (video_url) do update set
            account_id = excluded.account_id,
            view_count = excluded.view_count,
            like_count = excluded.like_count,
            comment_count = excluded.comment_count,
            share_count = excluded.share_count,
            last_updated_at = excluded.last_updated_at
        `;
      }
      summary.tiktokVideosUpserted = rows.length;
      continue;
    }

    // Facebook / Instagram: one row per MP per day.
    const feedPlatform = platform as "facebook" | "instagram";
    const postsByRep = new Map<string, CretePost[]>();
    for (const acct of resolved) {
      if (!postsByRep.has(acct.repId)) postsByRep.set(acct.repId, []);
      postsByRep.get(acct.repId)!.push(...acct.posts);
    }
    for (const [repId, repPosts] of postsByRep) {
      const byDay = new Map<string, CretePost[]>();
      for (const p of repPosts) {
        const day = londonDate(p.postedAt);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push(p);
      }
      const firstDay = Array.from(byDay.keys()).sort()[0];
      for (let day = firstDay; day <= today; day = addDays(day, 1)) {
        const dayPosts = byDay.get(day) ?? [];
        const top = [...dayPosts].sort((a, b) => b.likes + b.comments + b.shares - (a.likes + a.comments + a.shares))[0];
        dailyRows.push({
          representative_id: repId,
          platform: feedPlatform,
          date: day,
          post_count: dayPosts.length,
          reel_count: dayPosts.filter((p) => p.type === "Reel").length,
          video_count: feedPlatform === "facebook" ? dayPosts.filter((p) => p.type === "Reel" || p.type === "Video").length : null,
          // The Crete store has no reach figure, only likes/comments/shares (and views on video).
          reach: null,
          top_post_url: top?.postUrl ?? null,
          top_post_text: top?.text?.slice(0, 500) ?? null,
          top_post_reach: null,
          top_post_engagement: top ? top.likes + top.comments + top.shares : null,
          source: "automatic",
        });
      }
    }
  }

  const cols = ["representative_id", "platform", "date", "post_count", "reel_count", "video_count", "reach", "top_post_url", "top_post_text", "top_post_reach", "top_post_engagement", "source"] as const;
  for (let i = 0; i < dailyRows.length; i += 1000) {
    const batch = dailyRows.slice(i, i + 1000);
    await sql`
      insert into social_activity_daily ${sql(batch, ...cols)}
      on conflict (representative_id, platform, date) do update set
        post_count = excluded.post_count,
        reel_count = excluded.reel_count,
        video_count = excluded.video_count,
        reach = excluded.reach,
        top_post_url = excluded.top_post_url,
        top_post_text = excluded.top_post_text,
        top_post_reach = excluded.top_post_reach,
        top_post_engagement = excluded.top_post_engagement
    `;
  }
  summary.dailyRowsUpserted = dailyRows.length;

  return summary;
}

function blankSummary(): CreteSyncSummary["platforms"][CretePlatform] {
  return { postsRead: 0, accountsSeen: 0, accountsMatched: 0, unmatchedAccounts: [], fallbackMatches: [], mpsWithNoData: [] };
}
