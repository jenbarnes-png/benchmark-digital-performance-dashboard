import { sql } from "./db";
import { fetchDimAccounts, fetchFactVideo, fetchFactAccountDay } from "./tiktokSheet";

// Same all-words-present matching used to resolve Meta advertisers
// (scripts/resolve_advertisers.mts) — a name match only counts if every
// word of our MP's name appears in the sheet's mp_name, so a shared
// surname alone can't cause a false match.
function normalizedWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function isConfidentMatch(sheetName: string, ourName: string): boolean {
  const sheetWords = new Set(normalizedWords(sheetName));
  const ourWords = normalizedWords(ourName);
  return ourWords.length > 0 && ourWords.every((w) => sheetWords.has(w));
}

function extractHandleFromProfileUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/tiktok\.com\/@([^/?]+)/i);
  return match ? match[1].toLowerCase() : null;
}

export type TiktokSyncSummary = {
  pilotMpCount: number;
  matched: { constituency: string; mp: string; username: string }[];
  unmatched: { constituency: string; mp: string }[];
  videosUpserted: number;
};

/**
 * Pulls the 28 pilot MPs' TikTok accounts and videos from the shared
 * data-warehouse sheet. Scoped to the pilot only — the sheet covers
 * every party, but this dashboard's tracking scope hasn't been widened
 * beyond the 28 Labour pilot seats yet.
 */
export async function syncTiktokFromSheet(): Promise<TiktokSyncSummary> {
  const pilotReps = await sql<{ id: string; name: string; constituency_name: string }[]>`
    select r.id, r.name, c.name as constituency_name
    from representatives r
    join constituencies c on c.id = r.constituency_id
    where c.is_pilot = true and r.ended_at is null
  `;

  const [dimAccounts, factVideo, factAccountDay, existingManualRows] = await Promise.all([
    fetchDimAccounts(),
    fetchFactVideo(),
    fetchFactAccountDay(),
    sql<{ representative_id: string; profile_url: string | null }[]>`
      select representative_id, profile_url from social_accounts
      where platform = 'tiktok' and source = 'manual' and ended_at is null
    `,
  ]);

  // Usernames the sheet actually has activity data for — used to sanity-
  // check a hand-entered handle before trusting it (dim_accounts is a
  // curated subset and occasionally spells an MP's name differently
  // than we do, e.g. "MacAlister" vs "Macallister", so name-matching
  // alone would miss an account this confirms is really there).
  const usernamesWithData = new Set<string>([
    ...factVideo.map((v) => v.username.toLowerCase()),
    ...factAccountDay.map((v) => v.username.toLowerCase()),
  ]);

  const knownHandleByRepId = new Map<string, string>();
  for (const row of existingManualRows) {
    const handle = extractHandleFromProfileUrl(row.profile_url);
    if (handle) knownHandleByRepId.set(row.representative_id, handle);
  }

  const matched: TiktokSyncSummary["matched"] = [];
  const unmatched: TiktokSyncSummary["unmatched"] = [];
  const representativeIdByUsername = new Map<string, string>();

  for (const rep of pilotReps) {
    const knownHandle = knownHandleByRepId.get(rep.id);
    if (knownHandle && usernamesWithData.has(knownHandle)) {
      representativeIdByUsername.set(knownHandle, rep.id);
      matched.push({ constituency: rep.constituency_name, mp: rep.name, username: knownHandle });
      continue;
    }

    const candidate = dimAccounts.find(
      (a) => a.status === "active" && isConfidentMatch(a.mp_name || a.display_name, rep.name)
    );
    if (candidate) {
      representativeIdByUsername.set(candidate.username, rep.id);
      matched.push({ constituency: rep.constituency_name, mp: rep.name, username: candidate.username });
    } else {
      unmatched.push({ constituency: rep.constituency_name, mp: rep.name });
    }
  }

  // Latest follower count per matched username.
  const latestFollowerRow = new Map<string, { date: string; followers: number }>();
  for (const row of factAccountDay) {
    if (!representativeIdByUsername.has(row.username)) continue;
    const existing = latestFollowerRow.get(row.username);
    if (!existing || row.date > existing.date) {
      latestFollowerRow.set(row.username, { date: row.date, followers: Number(row.followers) || 0 });
    }
  }

  const socialAccountIdByUsername = new Map<string, string>();
  for (const [username, representativeId] of representativeIdByUsername) {
    const follower = latestFollowerRow.get(username);
    const [row] = await sql<{ id: string }[]>`
      insert into social_accounts (
        representative_id, platform, handle, profile_url,
        follower_count, follower_count_updated_at, source, last_refreshed_at
      ) values (
        ${representativeId}, 'tiktok', ${username}, ${`https://www.tiktok.com/@${username}`},
        ${follower?.followers ?? null}, ${follower ? new Date() : null}, 'automatic', now()
      )
      on conflict (representative_id, platform, handle) do update set
        profile_url = excluded.profile_url,
        follower_count = excluded.follower_count,
        follower_count_updated_at = excluded.follower_count_updated_at,
        last_refreshed_at = excluded.last_refreshed_at
      returning id
    `;
    socialAccountIdByUsername.set(username, row.id);
  }

  // A rep now confirmed to have a real, data-backed automatic row no
  // longer needs their old hand-entered placeholder (source='manual',
  // no follower/video data) — leaving both would show two TikTok links
  // on their constituency page, one of them dead weight.
  const matchedRepIds = Array.from(new Set(representativeIdByUsername.values()));
  if (matchedRepIds.length > 0) {
    await sql`
      update social_accounts
      set ended_at = current_date
      where platform = 'tiktok' and source = 'manual' and ended_at is null
        and representative_id = any(${matchedRepIds})
    `;
  }

  // Videos for matched accounts only, capped to a rolling 90-day window
  // — the scoring model only looks at the trailing 30 days, but a wider
  // window keeps a bit of trend history without the table growing
  // unbounded on every sync.
  const windowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let videosUpserted = 0;

  for (const video of factVideo) {
    const socialAccountId = socialAccountIdByUsername.get(video.username);
    if (!socialAccountId) continue;

    const postedAt = new Date(video.uploaded_at);
    if (Number.isNaN(postedAt.getTime()) || postedAt < windowStart) continue;

    await sql`
      insert into tiktok_videos (
        account_id, video_url, external_video_id, posted_at,
        view_count, like_count, comment_count, share_count, source, last_updated_at
      ) values (
        ${socialAccountId}, ${video.url}, ${video.video_id}, ${postedAt.toISOString()},
        ${Number(video.views) || 0}, ${Number(video.likes) || 0}, ${Number(video.comments) || 0},
        ${Number(video.shares) || 0}, 'automatic', now()
      )
      on conflict (video_url) do update set
        view_count = excluded.view_count,
        like_count = excluded.like_count,
        comment_count = excluded.comment_count,
        share_count = excluded.share_count,
        last_updated_at = excluded.last_updated_at
    `;
    videosUpserted++;
  }

  return { pilotMpCount: pilotReps.length, matched, unmatched, videosUpserted };
}
