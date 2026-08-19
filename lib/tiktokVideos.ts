import { sql } from "./db";
import { RECENT_WINDOW_DAYS } from "./adRecency";

export type TiktokVideoItem = {
  id: string;
  videoUrl: string;
  postedAt: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  handle: string | null;
  mpName: string;
  constituencyId: string;
  constituencyName: string;
};

type Row = {
  id: string;
  video_url: string;
  posted_at: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
  handle: string | null;
  mp_name: string;
  constituency_id: string;
  constituency_name: string;
};

function toItem(r: Row): TiktokVideoItem {
  return {
    id: r.id,
    videoUrl: r.video_url,
    postedAt: r.posted_at,
    viewCount: r.view_count,
    likeCount: r.like_count,
    commentCount: r.comment_count,
    shareCount: r.share_count,
    handle: r.handle,
    mpName: r.mp_name,
    constituencyId: r.constituency_id,
    constituencyName: r.constituency_name,
  };
}

/** The single best-performing videos nationally in the last 30 days, ranked by views — a shout-out list, not one-per-MP. */
export async function getTopTiktokVideosNational(limit = 3): Promise<TiktokVideoItem[]> {
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const rows = await sql<Row[]>`
    select
      tv.id, tv.video_url, tv.posted_at::text, tv.view_count, tv.like_count, tv.comment_count, tv.share_count,
      sa.handle, r.name as mp_name, c.id as constituency_id, c.name as constituency_name
    from tiktok_videos tv
    join social_accounts sa on sa.id = tv.account_id and sa.ended_at is null
    join representatives r on r.id = sa.representative_id and r.ended_at is null
    join constituencies c on c.id = r.constituency_id
    where tv.posted_at >= ${windowStart}
    order by tv.view_count desc nulls last
    limit ${limit}
  `;

  return rows.map(toItem);
}

/** A constituency's own videos in the last RECENT_WINDOW_DAYS days, most viewed first. */
export async function getTiktokVideosForConstituency(
  constituencyId: string,
  limit = 6
): Promise<TiktokVideoItem[]> {
  const windowStart = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const rows = await sql<Row[]>`
    select
      tv.id, tv.video_url, tv.posted_at::text, tv.view_count, tv.like_count, tv.comment_count, tv.share_count,
      sa.handle, r.name as mp_name, c.id as constituency_id, c.name as constituency_name
    from tiktok_videos tv
    join social_accounts sa on sa.id = tv.account_id and sa.ended_at is null
    join representatives r on r.id = sa.representative_id and r.ended_at is null
    join constituencies c on c.id = r.constituency_id
    where c.id = ${constituencyId} and tv.posted_at >= ${windowStart}
    order by tv.view_count desc nulls last
    limit ${limit}
  `;

  return rows.map(toItem);
}
