import { sql } from "./db";
import { classifyAdRecency } from "./adRecency";
import { getRankings } from "./rankings";
import type { HexTier, ConstituencyHexStatus } from "./hexTypes";

export type { HexTier, ConstituencyHexStatus } from "./hexTypes";

/**
 * Ad activity as of right now. Only the pilot MPs will have anything
 * other than "not yet tracked" — see lib/rankings.ts for the same
 * classification applied historically, per ranking period.
 */
export async function getAdHexStatuses(): Promise<Map<string, ConstituencyHexStatus>> {
  const rows = await sql<
    {
      constituency_id: string;
      name: string;
      has_advertiser: boolean;
      active_ad_count: number;
      last_activity_at: string | null;
    }[]
  >`
    select
      c.id as constituency_id,
      c.name,
      (a.id is not null) as has_advertiser,
      count(ads.id) filter (where ads.is_active) as active_ad_count,
      max(greatest(ads.ad_delivery_start_time, coalesce(ads.ad_delivery_stop_time, ads.ad_delivery_start_time)))::text as last_activity_at
    from constituencies c
    left join advertisers a on a.constituency_id = c.id and a.platform = 'meta' and a.ended_at is null
    left join ads on ads.advertiser_id = a.id
    group by c.id, c.name, a.id
  `;

  const now = new Date();
  const map = new Map<string, ConstituencyHexStatus>();
  for (const row of rows) {
    const activeAdCount = Number(row.active_ad_count);
    const status = classifyAdRecency({
      hasAdvertiser: row.has_advertiser,
      isActiveAsOf: activeAdCount > 0,
      lastActivityAt: row.last_activity_at,
      referenceDate: now,
    });

    // Scoring is binary (live or not — see AD_RECENCY_POINTS), so the
    // hex colour is too: "recent" still exists as a classification for
    // the detail tooltip, but doesn't get its own colour tier anymore.
    const tier: HexTier = status === "no_advertiser" ? "not_tracked" : status === "active" ? "active" : "stale";
    const detail =
      status === "no_advertiser"
        ? "Not yet tracked"
        : status === "active"
          ? `${activeAdCount} active ad${activeAdCount === 1 ? "" : "s"}`
          : status === "recent"
            ? "No ad running right now, active within the last 2 months"
            : "No ad activity in the last 2 months";

    map.set(row.name, { constituencyId: row.constituency_id, name: row.name, tier, detail });
  }
  return map;
}

/** TikTok activity as of right now — green within 7 days, amber within 30, red beyond that or no account matched. */
export async function getTiktokHexStatuses(): Promise<Map<string, ConstituencyHexStatus>> {
  const rows = await sql<
    { constituency_id: string; name: string; has_account: boolean; last_posted_at: string | null }[]
  >`
    select
      c.id as constituency_id,
      c.name,
      bool_or(sa.id is not null) as has_account,
      max(tv.posted_at)::text as last_posted_at
    from constituencies c
    left join representatives r on r.constituency_id = c.id and r.ended_at is null
    left join social_accounts sa on sa.representative_id = r.id and sa.platform = 'tiktok' and sa.ended_at is null
    left join tiktok_videos tv on tv.account_id = sa.id
    group by c.id, c.name
  `;

  const now = new Date();
  const map = new Map<string, ConstituencyHexStatus>();
  for (const row of rows) {
    if (!row.has_account) {
      map.set(row.name, {
        constituencyId: row.constituency_id,
        name: row.name,
        tier: "not_tracked",
        detail: "Not yet tracked",
      });
      continue;
    }

    const daysAgo = row.last_posted_at
      ? (now.getTime() - new Date(row.last_posted_at).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    let tier: HexTier;
    let detail: string;
    if (daysAgo <= 7) {
      tier = "active";
      detail = "Posted within the last 7 days";
    } else if (daysAgo <= 30) {
      tier = "recent";
      detail = "Posted within the last 30 days";
    } else {
      tier = "stale";
      detail = row.last_posted_at ? "No TikTok activity in the last 30 days" : "No TikTok videos tracked yet";
    }
    map.set(row.name, { constituencyId: row.constituency_id, name: row.name, tier, detail });
  }
  return map;
}

/** Overall score for the most recent period — same tiering as ScoreBar's colour thresholds. */
export async function getOverallHexStatuses(): Promise<Map<string, ConstituencyHexStatus>> {
  const { rows } = await getRankings({});
  const map = new Map<string, ConstituencyHexStatus>();
  for (const row of rows) {
    if (row.score === null) {
      map.set(row.constituency.name, {
        constituencyId: row.constituency.id,
        name: row.constituency.name,
        tier: "not_tracked",
        detail: "No data yet",
      });
      continue;
    }
    const fraction = row.scoreMaxPoints > 0 ? row.score / row.scoreMaxPoints : 0;
    const tier: HexTier = fraction >= 0.7 ? "active" : fraction >= 0.4 ? "recent" : "stale";
    map.set(row.constituency.name, {
      constituencyId: row.constituency.id,
      name: row.constituency.name,
      tier,
      detail: `${row.score} / ${row.scoreMaxPoints} points`,
    });
  }
  return map;
}
