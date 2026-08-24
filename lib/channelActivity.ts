import { sql } from "./db";

export type RecentChannelActivity = {
  organicPosts7d: number;
  reelsIn7d: number;
  hasAnyChannelData: boolean;
  newsletterInLast30Days: boolean;
  hasNewsletterData: boolean;
};

/**
 * Trailing-window activity for a constituency's current representative,
 * as of right now — same "as of now" approach as ad recency and TikTok
 * scoring, rather than a fixed calendar week. A fixed week would read
 * "0 this week" for the first day or two of every new week purely
 * because the data warehouse hasn't caught up yet, not because nothing
 * happened.
 */
export async function getRecentChannelActivity(constituencyId: string): Promise<RecentChannelActivity> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [postRows, anyRows, newsletterRows] = await Promise.all([
    sql<{ total_posts: number; total_reels: number }[]>`
      select coalesce(sum(sad.post_count), 0)::int as total_posts, coalesce(sum(sad.reel_count), 0)::int as total_reels
      from social_activity_daily sad
      join representatives r on r.id = sad.representative_id and r.ended_at is null
      where r.constituency_id = ${constituencyId} and sad.date >= ${sevenDaysAgo}
    `,
    sql<{ exists: boolean }[]>`
      select exists(
        select 1 from social_activity_daily sad
        join representatives r on r.id = sad.representative_id and r.ended_at is null
        where r.constituency_id = ${constituencyId}
      ) as exists
    `,
    sql<{ received_at: string }[]>`
      select ne.received_at::text
      from newsletter_events ne
      join representatives r on r.id = ne.representative_id and r.ended_at is null
      where r.constituency_id = ${constituencyId}
      order by ne.received_at desc
      limit 1
    `,
  ]);

  const hasNewsletterData = newsletterRows.length > 0;

  return {
    organicPosts7d: postRows[0]?.total_posts ?? 0,
    reelsIn7d: postRows[0]?.total_reels ?? 0,
    hasAnyChannelData: anyRows[0]?.exists ?? false,
    hasNewsletterData,
    newsletterInLast30Days: hasNewsletterData && new Date(newsletterRows[0].received_at) >= thirtyDaysAgo,
  };
}

export type LeadgenSnapshot = {
  hasData: boolean;
  leadsActive: boolean;
  spendMtd: number | null;
};

/** The real "is there a Lead Generation ad running" signal — more precise than the general ad-recency status, which can't distinguish campaign objective. */
export async function getLeadgenSnapshot(constituencyId: string): Promise<LeadgenSnapshot> {
  const rows = await sql<{ leads_active: boolean; spend_mtd: string | null }[]>`
    select mls.leads_active, mls.spend_mtd
    from meta_leadgen_snapshot mls
    join representatives r on r.id = mls.representative_id and r.ended_at is null
    where r.constituency_id = ${constituencyId}
  `;
  if (rows.length === 0) return { hasData: false, leadsActive: false, spendMtd: null };
  return { hasData: true, leadsActive: rows[0].leads_active, spendMtd: rows[0].spend_mtd === null ? null : Number(rows[0].spend_mtd) };
}

export type ChannelPostItem = {
  id: string;
  platform: "facebook" | "instagram";
  url: string;
  text: string | null;
  reach: number | null;
  engagement: number | null;
  date: string;
  mpName: string;
  constituencyId: string;
  constituencyName: string;
};

type PostRow = {
  platform: "facebook" | "instagram";
  date: string;
  top_post_url: string;
  top_post_text: string | null;
  top_post_reach: number | null;
  top_post_engagement: number | null;
  mp_name: string;
  constituency_id: string;
  constituency_name: string;
};

function toChannelPostItem(r: PostRow): ChannelPostItem {
  return {
    id: `${r.constituency_id}-${r.platform}-${r.date}`,
    platform: r.platform,
    url: r.top_post_url,
    text: r.top_post_text,
    reach: r.top_post_reach,
    engagement: r.top_post_engagement,
    date: r.date,
    mpName: r.mp_name,
    constituencyId: r.constituency_id,
    constituencyName: r.constituency_name,
  };
}

/** Best-performing individual Facebook/Instagram posts nationally in the last 30 days, ranked by reach. */
export async function getTopChannelPostsNational(limit = 3): Promise<ChannelPostItem[]> {
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows = await sql<PostRow[]>`
    select
      sad.platform, sad.date::text, sad.top_post_url, sad.top_post_text,
      sad.top_post_reach, sad.top_post_engagement,
      r.name as mp_name, c.id as constituency_id, c.name as constituency_name
    from social_activity_daily sad
    join representatives r on r.id = sad.representative_id and r.ended_at is null
    join constituencies c on c.id = r.constituency_id
    where sad.top_post_url is not null and sad.date >= ${windowStart}
    order by sad.top_post_reach desc nulls last
    limit ${limit}
  `;

  return rows.map(toChannelPostItem);
}

/** A constituency's own best Facebook/Instagram posts in the last 30 days, ranked by reach. */
export async function getChannelPostsForConstituency(
  constituencyId: string,
  limit = 6
): Promise<ChannelPostItem[]> {
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows = await sql<PostRow[]>`
    select
      sad.platform, sad.date::text, sad.top_post_url, sad.top_post_text,
      sad.top_post_reach, sad.top_post_engagement,
      r.name as mp_name, c.id as constituency_id, c.name as constituency_name
    from social_activity_daily sad
    join representatives r on r.id = sad.representative_id and r.ended_at is null
    join constituencies c on c.id = r.constituency_id
    where c.id = ${constituencyId} and sad.top_post_url is not null and sad.date >= ${windowStart}
    order by sad.top_post_reach desc nulls last
    limit ${limit}
  `;

  return rows.map(toChannelPostItem);
}
