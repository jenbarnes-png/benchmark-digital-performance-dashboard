import { sql } from "./db";
import { fetchMpAggregates } from "./tiktokSheet";

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

  const [mpAggregates, existingTiktokRows] = await Promise.all([
    fetchMpAggregates(),
    sql<{ representative_id: string; handle: string | null; profile_url: string | null; source: string }[]>`
      select representative_id, handle, profile_url, source from social_accounts
      where platform = 'tiktok' and ended_at is null
    `,
  ]);

  // Usernames the sheet actually has a row for — used to sanity-check a
  // hand-entered handle before trusting it (occasionally spelled
  // differently than we have it, e.g. "MacAlister" vs "Macallister", so
  // name-matching alone would miss an account this confirms is really
  // there).
  const usernamesWithData = new Set<string>(mpAggregates.map((v) => v.username.toLowerCase()));

  // A rep already matched on a previous run (source: 'automatic') must
  // keep matching on every later run too, even after this same sync's
  // cleanup step ends their old manual placeholder below — otherwise a
  // rep whose only path to a match was a hand-entered handle (no
  // dim_accounts name match) would silently drop out of tracking the
  // moment that placeholder is gone. Manual rows are read first, then
  // automatic rows override them, so a real match always wins.
  const knownHandleByRepId = new Map<string, string>();
  for (const row of existingTiktokRows) {
    if (row.source !== "manual") continue;
    const handle = extractHandleFromProfileUrl(row.profile_url);
    if (handle) knownHandleByRepId.set(row.representative_id, handle);
  }
  for (const row of existingTiktokRows) {
    if (row.source === "automatic" && row.handle) {
      knownHandleByRepId.set(row.representative_id, row.handle.toLowerCase());
    }
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

    const candidate = mpAggregates.find(
      (a) => a.has_sufficient_data === "TRUE" && isConfidentMatch(a.name || a.username, rep.name)
    );
    if (candidate) {
      representativeIdByUsername.set(candidate.username, rep.id);
      matched.push({ constituency: rep.constituency_name, mp: rep.name, username: candidate.username });
    } else {
      unmatched.push({ constituency: rep.constituency_name, mp: rep.name });
    }
  }

  const aggregateByUsername = new Map(mpAggregates.map((a) => [a.username, a]));

  const socialAccountIdByUsername = new Map<string, string>();
  for (const [username, representativeId] of representativeIdByUsername) {
    const account = aggregateByUsername.get(username);
    const followers = account && account.followers !== "" ? Number(account.followers) : null;
    const followersUpdatedAt = account?.latest_data_update ? new Date(account.latest_data_update) : null;
    const [row] = await sql<{ id: string }[]>`
      insert into social_accounts (
        representative_id, platform, handle, profile_url,
        follower_count, follower_count_updated_at, source, last_refreshed_at
      ) values (
        ${representativeId}, 'tiktok', ${username}, ${`https://www.tiktok.com/@${username}`},
        ${followers}, ${followersUpdatedAt}, 'automatic', now()
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

  // mp_aggregates gives an account-level snapshot, not a full video
  // history, so each sync run upserts at most two rows per matched
  // account: their most recent post (recency, but no view count — TikTok
  // doesn't surface that per-post here) and their current single
  // best-performing video (has a real view count, so it's what drives
  // reach and the "best video nationally" pick). Existing older video
  // rows from before this switch stay in the table untouched — they
  // just age out of the scoring windows naturally.
  let videosUpserted = 0;

  async function upsertVideo(
    socialAccountId: string,
    url: string,
    postedAtRaw: string,
    viewCount: number | null
  ): Promise<void> {
    if (!url) return;
    const postedAt = new Date(postedAtRaw);
    if (Number.isNaN(postedAt.getTime())) return;

    const externalVideoId = url.match(/\/video\/(\d+)/)?.[1] ?? null;

    await sql`
      insert into tiktok_videos (
        account_id, video_url, external_video_id, posted_at, view_count, source, last_updated_at
      ) values (
        ${socialAccountId}, ${url}, ${externalVideoId}, ${postedAt.toISOString()}, ${viewCount}, 'automatic', now()
      )
      on conflict (video_url) do update set
        view_count = coalesce(excluded.view_count, tiktok_videos.view_count),
        last_updated_at = excluded.last_updated_at
    `;
    videosUpserted++;
  }

  for (const [username, socialAccountId] of socialAccountIdByUsername) {
    const account = aggregateByUsername.get(username);
    if (!account) continue;

    await upsertVideo(socialAccountId, account.last_post_url, account.last_post_date, null);

    if (account.top_video_url && account.top_video_url !== account.last_post_url) {
      const topViews = account.top_video_views !== "" ? Number(account.top_video_views) : null;
      await upsertVideo(socialAccountId, account.top_video_url, account.top_video_uploaded, topViews);
    }
  }

  return { pilotMpCount: pilotReps.length, matched, unmatched, videosUpserted };
}
