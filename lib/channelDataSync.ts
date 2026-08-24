import { sql } from "./db";
import { fetchChannelData, fetchMpNewsletters, fetchMetaAdsLeadgen } from "./channelDataSheet";

// Same all-words-present matching used for TikTok/Meta advertiser
// resolution — see scripts/resolve_advertisers.mts.
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

// "Liv Bailey" (our records) vs "Olivia Bailey" (the sheet) — the same
// person under her formal first name, not a typo, so handled as an
// alias rather than correcting our own data the way the Josh
// MacAlister spelling was.
const NAME_ALIASES: Record<string, string> = {
  "Liv Bailey": "Olivia Bailey",
};

function num(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function numOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export type ChannelDataSyncSummary = {
  pilotMpCount: number;
  matched: { constituency: string; mp: string; sheetName: string }[];
  unmatched: { constituency: string; mp: string }[];
  dailyRowsUpserted: number;
  newsletterEventsUpserted: number;
  leadgenSnapshotsUpserted: number;
};

/**
 * Pulls Facebook/Instagram daily activity, newsletter send events, and
 * lead-gen ad status for the 28 pilot MPs from Hani's data-warehouse
 * sheet. Scoped to the pilot only, same as the TikTok sync.
 */
export async function syncChannelDataFromSheet(): Promise<ChannelDataSyncSummary> {
  const pilotReps = await sql<{ id: string; name: string; constituency_name: string }[]>`
    select r.id, r.name, c.name as constituency_name
    from representatives r
    join constituencies c on c.id = r.constituency_id
    where c.is_pilot = true and r.ended_at is null
  `;

  const [channelData, newsletters, leadgen] = await Promise.all([
    fetchChannelData(),
    fetchMpNewsletters(),
    fetchMetaAdsLeadgen(),
  ]);

  const sheetNames = Array.from(new Set(channelData.map((r) => r.MP)));

  const matched: ChannelDataSyncSummary["matched"] = [];
  const unmatched: ChannelDataSyncSummary["unmatched"] = [];
  const repIdBySheetName = new Map<string, string>();

  for (const rep of pilotReps) {
    const alias = NAME_ALIASES[rep.name];
    const candidates = alias ? [alias, rep.name] : [rep.name];
    const sheetName = candidates
      .map((candidate) => sheetNames.find((sn) => isConfidentMatch(sn, candidate)))
      .find((found): found is string => Boolean(found));

    if (sheetName) {
      repIdBySheetName.set(sheetName, rep.id);
      matched.push({ constituency: rep.constituency_name, mp: rep.name, sheetName });
    } else {
      unmatched.push({ constituency: rep.constituency_name, mp: rep.name });
    }
  }

  let dailyRowsUpserted = 0;
  for (const row of channelData) {
    const repId = repIdBySheetName.get(row.MP);
    if (!repId) continue;

    await sql`
      insert into social_activity_daily (
        representative_id, platform, date, post_count, reel_count, video_count, reach,
        top_post_url, top_post_text, top_post_reach, top_post_engagement, source
      ) values (
        ${repId}, 'facebook', ${row.Date},
        ${num(row["FB posts"])}, ${num(row["FB Reels"])}, ${num(row["FB Videos"])},
        ${numOrNull(row["FB Reach"])}, ${row["FB Top URL"] || null}, ${row["FB Top Text"] || null},
        ${numOrNull(row["FB Top Reach"])}, ${numOrNull(row["FB Top Eng"])}, 'automatic'
      )
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
    dailyRowsUpserted++;

    await sql`
      insert into social_activity_daily (
        representative_id, platform, date, post_count, reel_count, video_count, reach,
        top_post_url, top_post_text, top_post_reach, top_post_engagement, source
      ) values (
        ${repId}, 'instagram', ${row.Date},
        ${num(row["IG posts"])}, ${num(row["IG Reels"])}, ${null},
        ${numOrNull(row["IG Reach"])}, ${row["IG Top URL"] || null}, ${row["IG Top Text"] || null},
        ${numOrNull(row["IG Top Reach"])}, ${numOrNull(row["IG Top Eng"])}, 'automatic'
      )
      on conflict (representative_id, platform, date) do update set
        post_count = excluded.post_count,
        reel_count = excluded.reel_count,
        reach = excluded.reach,
        top_post_url = excluded.top_post_url,
        top_post_text = excluded.top_post_text,
        top_post_reach = excluded.top_post_reach,
        top_post_engagement = excluded.top_post_engagement
    `;
    dailyRowsUpserted++;
  }

  let newsletterEventsUpserted = 0;
  for (const row of newsletters) {
    const repId = repIdBySheetName.get(row["MP Name"]);
    if (!repId || !row["Gmail Message ID"]) continue;

    await sql`
      insert into newsletter_events (representative_id, received_at, subject, sender, external_message_id, source)
      values (
        ${repId}, ${row["Date Received"]}, ${row.Subject || null}, ${row.Sender || null},
        ${row["Gmail Message ID"]}, 'automatic'
      )
      on conflict (external_message_id) do update set
        subject = excluded.subject,
        sender = excluded.sender
    `;
    newsletterEventsUpserted++;
  }

  let leadgenSnapshotsUpserted = 0;
  for (const row of leadgen) {
    const repId = repIdBySheetName.get(row.MP);
    if (!repId) continue;

    await sql`
      insert into meta_leadgen_snapshot (
        representative_id, leads_active, reach_active, spend_mtd, reach, leads, campaigns,
        top_campaign, top_campaign_reach, last_updated_at, source
      ) values (
        ${repId}, ${row["Leads Active"]?.trim().toUpperCase() === "YES"},
        ${row["Reach Active"]?.trim().toUpperCase() === "YES"},
        ${numOrNull(row["Total Spend MTD (£)"])}, ${numOrNull(row.Reach)}, ${numOrNull(row.Leads)},
        ${numOrNull(row.Campaigns)}, ${row["Top Campaign"] || null}, ${numOrNull(row["Top Campaign Reach"])},
        ${row["Last Updated"] ? new Date(row["Last Updated"]) : null}, 'automatic'
      )
      on conflict (representative_id) do update set
        leads_active = excluded.leads_active,
        reach_active = excluded.reach_active,
        spend_mtd = excluded.spend_mtd,
        reach = excluded.reach,
        leads = excluded.leads,
        campaigns = excluded.campaigns,
        top_campaign = excluded.top_campaign,
        top_campaign_reach = excluded.top_campaign_reach,
        last_updated_at = excluded.last_updated_at
    `;
    leadgenSnapshotsUpserted++;
  }

  return {
    pilotMpCount: pilotReps.length,
    matched,
    unmatched,
    dailyRowsUpserted,
    newsletterEventsUpserted,
    leadgenSnapshotsUpserted,
  };
}

/**
 * Rolls this period's Facebook/Instagram post counts and newsletter
 * sends into the existing organic_posts/newsletter_sends tables — the
 * same tables manual entry would use — so the Platform breakdown
 * cards, charts, and Dream Week checklist light up with real data
 * without needing separate wiring.
 */
export async function aggregateWeeklyChannelActivity(periodStart: string, periodEnd: string): Promise<void> {
  const [facebookPlatform, instagramPlatform] = await Promise.all([
    sql<{ id: string }[]>`select id from platforms where name = 'Facebook'`,
    sql<{ id: string }[]>`select id from platforms where name = 'Instagram'`,
  ]);
  const fbId = facebookPlatform[0]?.id;
  const igId = instagramPlatform[0]?.id;
  if (!fbId || !igId) throw new Error("Facebook/Instagram rows missing from platforms table");

  const postRows = await sql<{ constituency_id: string; platform: string; total_posts: number }[]>`
    select r.constituency_id, sad.platform, sum(sad.post_count)::int as total_posts
    from social_activity_daily sad
    join representatives r on r.id = sad.representative_id and r.ended_at is null
    where sad.date >= ${periodStart} and sad.date <= ${periodEnd}
    group by r.constituency_id, sad.platform
  `;

  for (const row of postRows) {
    const platformId = row.platform === "facebook" ? fbId : igId;
    await sql`
      insert into organic_posts (constituency_id, platform_id, period_start, period_end, post_count, source, has_data)
      values (${row.constituency_id}, ${platformId}, ${periodStart}, ${periodEnd}, ${row.total_posts}, 'automatic', true)
      on conflict (constituency_id, platform_id, period_start) do update set
        post_count = excluded.post_count,
        source = excluded.source,
        has_data = excluded.has_data
    `;
  }

  const newsletterRows = await sql<{ constituency_id: string; send_count: number }[]>`
    select r.constituency_id, count(*)::int as send_count
    from newsletter_events ne
    join representatives r on r.id = ne.representative_id and r.ended_at is null
    where ne.received_at::date >= ${periodStart} and ne.received_at::date <= ${periodEnd}
    group by r.constituency_id
  `;

  for (const row of newsletterRows) {
    await sql`
      insert into newsletter_sends (constituency_id, period_start, period_end, send_count, source, has_data)
      values (${row.constituency_id}, ${periodStart}, ${periodEnd}, ${row.send_count}, 'automatic', true)
      on conflict (constituency_id, period_start) do update set
        send_count = excluded.send_count,
        source = excluded.source,
        has_data = excluded.has_data
    `;
  }
}
