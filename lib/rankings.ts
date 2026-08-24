import { sql, type Constituency } from "./db";
import { scoreMetric, overallScore, totalPossiblePoints, scoreChange, rankByScore, type MetricScore } from "./scoring";
import { classifyAdRecency, scoreForAdRecency, AD_RECENCY_POINTS, type AdRecencyStatus } from "./adRecency";
import {
  recencyPoints,
  weeklyBestPostWinner,
  scoreForTiktok,
  TIKTOK_MAX_POINTS,
  type TiktokVideoLite,
} from "./tiktokScoring";
import { scoreForChannel, CHANNEL_MAX_POINTS } from "./channelScoring";
import { scoreForNewsletter, NEWSLETTER_MAX_POINTS } from "./newsletterScoring";
import { scoreForGroup, GROUP_MAX_POINTS } from "./groupScoring";
import { scoreForSubscriberGrowth, SUBSCRIBER_MAX_POINTS, SUBSCRIBER_GROWTH_TARGET } from "./subscriberScoring";

// Used only when literally nothing has been tracked yet (periods.length
// === 0 below) — the real total is always computed from the actual
// metrics array via totalPossiblePoints, this is just its value before
// any metrics exist to sum.
const FALLBACK_MAX_POINTS =
  AD_RECENCY_POINTS.active +
  TIKTOK_MAX_POINTS +
  CHANNEL_MAX_POINTS +
  NEWSLETTER_MAX_POINTS +
  GROUP_MAX_POINTS +
  SUBSCRIBER_MAX_POINTS;

export type Period = { start: string; end: string };

type PlatformRow = { id: string; name: string };

type OrganicRow = {
  constituency_id: string;
  platform_id: string;
  period_start: string;
  post_count: number | null;
  has_data: boolean;
};

type AdSpendRow = {
  constituency_id: string;
  platform_id: string;
  period_start: string;
  amount_spent: string | null;
  target_amount: string | null;
  has_data: boolean;
};

type SingleRow = {
  constituency_id: string;
  period_start: string;
  value: number | null;
  has_data: boolean;
};

function num(value: string | number | null): number {
  return value === null ? 0 : Number(value);
}

function periodKey(constituencyId: string, period: string) {
  return `${constituencyId}|${period}`;
}

function mondayOnOrBefore(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Weekly periods to show on Rankings. Most of our metrics (ad recency,
 * TikTok, Facebook/Instagram, newsletter) are computed "as of" a
 * reference date directly from timestamped raw data (ads, tiktok_videos,
 * social_activity_daily, newsletter_events) — so they already
 * reconstruct any past week correctly with zero extra storage, as long
 * as a period for that week exists here. So rather than a scheduled
 * snapshot job, we generate every Monday-Sunday week from the earliest
 * tracked activity through the current week, merged with whatever weeks
 * the older manually-entered tables (organic_posts, ad_spend,
 * facebook_group_activity, newsletter_sends) have rows for — those
 * still only show real data for weeks someone actually logged.
 */
export async function listPeriods(): Promise<Period[]> {
  const [manualRows, [earliestRow]] = await Promise.all([
    sql<{ period_start: string; period_end: string }[]>`
      select distinct period_start::text, period_end::text from (
        select period_start, period_end from organic_posts
        union
        select period_start, period_end from ad_spend
        union select period_start, period_end from facebook_group_activity
        union select period_start, period_end from newsletter_sends
      ) p
    `,
    // Deliberately excludes ads.ad_delivery_start_time — Meta's Ad
    // Library reports when an ad itself first started running, which
    // for a long-running "always-on" ad can be years before we ever
    // started tracking it, and isn't a signal of when OUR tracking
    // began. TikTok/channel/newsletter dates are all real content
    // posted after tracking started, so they're a much saner floor.
    sql<{ earliest: string | null }[]>`
      select least(
        (select min(posted_at)::date from tiktok_videos),
        (select min(date) from social_activity_daily),
        (select min(received_at)::date from newsletter_events)
      )::text as earliest
    `,
  ]);

  const manualByStart = new Map(manualRows.map((r) => [r.period_start, r.period_end]));
  const weekStarts = new Set<string>(manualRows.map((r) => r.period_start));

  if (earliestRow?.earliest) {
    const currentWeekMonday = mondayOnOrBefore(new Date());
    // Belt-and-braces cap, independent of the query above, in case any
    // future data source has its own long-ago outlier timestamp — 26
    // weeks comfortably covers this pilot's real history.
    const maxLookback = new Date(currentWeekMonday.getTime() - 26 * 7 * 24 * 60 * 60 * 1000);
    const earliestMonday = mondayOnOrBefore(new Date(earliestRow.earliest));
    let cursor = earliestMonday.getTime() < maxLookback.getTime() ? maxLookback : earliestMonday;
    while (cursor.getTime() <= currentWeekMonday.getTime()) {
      weekStarts.add(toDateStr(cursor));
      cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  const periods = Array.from(weekStarts)
    .map((start) => {
      const end = manualByStart.get(start) ?? toDateStr(new Date(new Date(start).getTime() + 6 * 24 * 60 * 60 * 1000));
      return { start, end };
    })
    .sort((a, b) => (a.start < b.start ? 1 : -1));

  return periods;
}

export async function listRegions(): Promise<string[]> {
  const rows = await sql<{ region: string }[]>`
    select distinct region from constituencies order by region
  `;
  return rows.map((r) => r.region);
}

export async function listCohorts(): Promise<string[]> {
  const rows = await sql<{ cohort: string }[]>`
    select distinct cohort from constituencies where cohort is not null order by cohort
  `;
  return rows.map((r) => r.cohort);
}

export async function getLastUpdated(): Promise<string | null> {
  const [row] = await sql<{ last_updated: string | null }[]>`
    select max(t) as last_updated from (
      select max(created_at) as t from organic_posts
      union all select max(created_at) from ad_spend
      union all select max(created_at) from facebook_group_activity
      union all select max(created_at) from newsletter_sends
    ) x
  `;
  return row?.last_updated ?? null;
}

export type PlatformBreakdown = {
  platform: string;
  postCount: number;
  hasData: boolean;
};

export type AdPlatformBreakdown = {
  platform: string;
  spent: number;
  target: number;
  hasData: boolean;
};

export type PeriodMetrics = {
  period: string;
  periodEnd: string;
  overall: number | null;
  /** Total points possible for `overall`, e.g. 7 (2 ad + 5 TikTok) today. */
  overallMaxPoints: number;
  adSpend: {
    spent: number;
    target: number;
    hasData: boolean;
    byPlatform: AdPlatformBreakdown[];
    recencyStatus: AdRecencyStatus;
  };
  organic: { total: number; hasData: boolean; byPlatform: PlatformBreakdown[] };
  group: { postCount: number; hasData: boolean };
  newsletter: { sendCount: number; hasData: boolean };
  tiktok: {
    points: number;
    hasData: boolean;
    isBestPostWinner: boolean;
    /** Total views across videos posted in the last 30 days — see tiktokReachFor. */
    reach: number;
    /** Posted at all in the 30 days before this period ended — the loosest of the four stacking recency tiers. */
    postedInLast30Days: boolean;
    /** Posted at all in the 7 days before this period ended. */
    postedInLast7Days: boolean;
  };
  channel: {
    points: number;
    hasData: boolean;
    /** Posted a Reel on Facebook or Instagram in the 7 days before this period ended. */
    reelIn7Days: boolean;
    /** Posted anything organically on Facebook or Instagram in the 7 days before this period ended. */
    postedIn7Days: boolean;
  };
  /**
   * The real, automated newsletter-send signal from Hani's data
   * warehouse (newsletter_events) — distinct from the older
   * `newsletter` field above, which is the manually-reported
   * newsletter_sends peer-relative metric.
   */
  newsletterActivity: {
    points: number;
    hasData: boolean;
    /** Sent within the 30 days before this period ended. */
    sentInLast30Days: boolean;
    /** Sent since the 1st of the calendar month this period ended in. */
    sentThisCalendarMonth: boolean;
  };
  /** Subscriber-list growth vs the previous calendar month — see lib/subscriberCounts.ts. */
  subscriberGrowth: {
    points: number;
    hasData: boolean;
    grewByAtLeastTarget: boolean;
  };
};

/**
 * Loads every activity row and folds it into one metrics-by-constituency-
 * by-period index. This is the single place that turns raw tables into
 * the shape both pages need — scoring rules live here, once.
 */
async function buildMetricsIndex() {
  const [
    organic,
    adSpend,
    groupRaw,
    newsletterRaw,
    platforms,
    periods,
    advertiserRows,
    adWindowRows,
    tiktokAccountRows,
    tiktokVideoRows,
    channelActivityRows,
    newsletterEventRows,
    subscriberCountRows,
  ] = await Promise.all([
    sql<OrganicRow[]>`select constituency_id, platform_id, period_start::text, post_count, has_data from organic_posts`,
    sql<AdSpendRow[]>`select constituency_id, platform_id, period_start::text, amount_spent, target_amount, has_data from ad_spend`,
    sql<{ constituency_id: string; period_start: string; post_count: number | null; has_data: boolean }[]>`
      select constituency_id, period_start::text, post_count, has_data from facebook_group_activity
    `,
    sql<{ constituency_id: string; period_start: string; send_count: number | null; has_data: boolean }[]>`
      select constituency_id, period_start::text, send_count, has_data from newsletter_sends
    `,
    sql<PlatformRow[]>`select id, name from platforms`,
    listPeriods(),
    sql<{ constituency_id: string }[]>`
      select distinct constituency_id from advertisers where platform = 'meta' and ended_at is null
    `,
    sql<{ constituency_id: string; start: string | null; stop: string | null }[]>`
      select a.constituency_id, ads.ad_delivery_start_time::text as start, ads.ad_delivery_stop_time::text as stop
      from ads
      join advertisers a on a.id = ads.advertiser_id
      where a.platform = 'meta' and a.ended_at is null
    `,
    sql<{ constituency_id: string }[]>`
      select distinct r.constituency_id
      from social_accounts sa
      join representatives r on r.id = sa.representative_id and r.ended_at is null
      where sa.platform = 'tiktok' and sa.ended_at is null
    `,
    sql<{ constituency_id: string; posted_at: string; view_count: number | null; like_count: number | null }[]>`
      select r.constituency_id, tv.posted_at::text, tv.view_count, tv.like_count
      from tiktok_videos tv
      join social_accounts sa on sa.id = tv.account_id and sa.ended_at is null
      join representatives r on r.id = sa.representative_id and r.ended_at is null
    `,
    sql<{ constituency_id: string; date: string; post_count: number | null; reel_count: number | null }[]>`
      select r.constituency_id, sad.date::text, sad.post_count, sad.reel_count
      from social_activity_daily sad
      join representatives r on r.id = sad.representative_id and r.ended_at is null
    `,
    sql<{ constituency_id: string; received_at: string }[]>`
      select r.constituency_id, ne.received_at::text
      from newsletter_events ne
      join representatives r on r.id = ne.representative_id and r.ended_at is null
    `,
    sql<{ constituency_id: string; month_start: string; subscriber_count: number | null; has_data: boolean }[]>`
      select constituency_id, month_start::text, subscriber_count, has_data from subscriber_counts
    `,
  ]);

  const tiktokAccountConstituencyIds = new Set(tiktokAccountRows.map((r) => r.constituency_id));
  const tiktokVideosByConstituency = new Map<
    string,
    { postedAt: string; viewCount: number | null; likeCount: number | null }[]
  >();
  for (const row of tiktokVideoRows) {
    if (!tiktokVideosByConstituency.has(row.constituency_id)) tiktokVideosByConstituency.set(row.constituency_id, []);
    tiktokVideosByConstituency
      .get(row.constituency_id)!
      .push({ postedAt: row.posted_at, viewCount: row.view_count, likeCount: row.like_count });
  }

  /** Recency points as of a given date, same "cap at reference date" rule as adRecencyAsOf. */
  function tiktokPointsAsOf(constituencyId: string, referenceDate: Date): number {
    const videos = tiktokVideosByConstituency.get(constituencyId) ?? [];
    let mostRecent: string | null = null;
    for (const v of videos) {
      const postedAt = new Date(v.postedAt);
      if (postedAt > referenceDate) continue;
      if (!mostRecent || new Date(mostRecent) < postedAt) mostRecent = v.postedAt;
    }
    return recencyPoints(mostRecent, referenceDate);
  }

  // Computed once per period (not per constituency) and cached, grouped
  // by constituency so both the national best-post winner and each
  // seat's own weekly reach can be read off the same pass. Window is
  // the 7 calendar days ending on referenceDate's day, not the fixed
  // [period.start, period.end] range — for a completed past period
  // referenceDate is that week's Sunday, so this reproduces the exact
  // same Monday-Sunday window as before. But for the CURRENT,
  // still-in-progress period referenceDate is "now", so on (say) a
  // Monday this rolls back into last week's posts instead of coming up
  // empty just because this week hasn't had a chance to produce a
  // winner yet — same "Monday morning gap" fix as adRecencyAsOf etc.
  const videosByPeriodCache = new Map<string, Map<string, TiktokVideoLite[]>>();
  function videosNearReferenceByConstituency(period: Period, referenceDate: Date): Map<string, TiktokVideoLite[]> {
    const cached = videosByPeriodCache.get(period.start);
    if (cached) return cached;

    const rangeEnd = new Date(referenceDate);
    rangeEnd.setUTCHours(23, 59, 59, 999);
    const rangeStart = new Date(rangeEnd);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 6);
    rangeStart.setUTCHours(0, 0, 0, 0);

    const result = new Map<string, TiktokVideoLite[]>();
    for (const [constituencyId, videos] of tiktokVideosByConstituency) {
      for (const v of videos) {
        const postedAt = new Date(v.postedAt);
        if (postedAt >= rangeStart && postedAt <= rangeEnd) {
          if (!result.has(constituencyId)) result.set(constituencyId, []);
          result
            .get(constituencyId)!
            .push({ constituencyId, postedAt: v.postedAt, viewCount: v.viewCount, likeCount: v.likeCount });
        }
      }
    }
    videosByPeriodCache.set(period.start, result);
    return result;
  }

  const bestPostWinnerByPeriod = new Map<string, string | null>();
  function bestPostWinnerFor(period: Period, referenceDate: Date): string | null {
    const cached = bestPostWinnerByPeriod.get(period.start);
    if (cached !== undefined) return cached;

    const videosInPeriod = Array.from(videosNearReferenceByConstituency(period, referenceDate).values()).flat();
    const winner = weeklyBestPostWinner(videosInPeriod);
    bestPostWinnerByPeriod.set(period.start, winner);
    return winner;
  }

  /** Total views across videos posted in the 30 days before the reference
   * date — our proxy for "reach", since TikTok's own reach figures aren't
   * exposed to us, only per-video view counts. Same trailing-30-day
   * window as tiktokPointsAsOf's loosest tier, not the calendar week. */
  function tiktokReachFor(constituencyId: string, referenceDate: Date): number {
    const cutoff = new Date(referenceDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const videos = tiktokVideosByConstituency.get(constituencyId) ?? [];
    return videos.reduce((sum, v) => {
      const postedAt = new Date(v.postedAt);
      if (postedAt > referenceDate || postedAt < cutoff) return sum;
      return sum + (v.viewCount ?? 0);
    }, 0);
  }

  const channelAccountConstituencyIds = new Set(channelActivityRows.map((r) => r.constituency_id));
  const channelDaysByConstituency = new Map<
    string,
    { date: string; postCount: number; reelCount: number }[]
  >();
  for (const row of channelActivityRows) {
    if (!channelDaysByConstituency.has(row.constituency_id)) channelDaysByConstituency.set(row.constituency_id, []);
    channelDaysByConstituency
      .get(row.constituency_id)!
      .push({ date: row.date, postCount: row.post_count ?? 0, reelCount: row.reel_count ?? 0 });
  }

  /** Reel-in-7-days / posted-at-all-in-7-days as of a given date — same
   * trailing-window approach as ad recency and TikTok, and the same
   * 7-day window as the Dream Week organic card, to avoid a "Monday
   * morning gap" where a brand-new period reads false purely because
   * the data warehouse hasn't caught up yet. */
  function channelActivityAsOf(
    constituencyId: string,
    referenceDate: Date
  ): { reelIn7Days: boolean; postedIn7Days: boolean } {
    const cutoff = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days = channelDaysByConstituency.get(constituencyId) ?? [];
    let reelCount = 0;
    let postCount = 0;
    for (const d of days) {
      const date = new Date(d.date);
      if (date > referenceDate || date < cutoff) continue;
      reelCount += d.reelCount;
      postCount += d.postCount;
    }
    return { reelIn7Days: reelCount > 0, postedIn7Days: postCount > 0 };
  }

  const newsletterAccountConstituencyIds = new Set(newsletterEventRows.map((r) => r.constituency_id));
  const newsletterEventsByConstituency = new Map<string, string[]>();
  for (const row of newsletterEventRows) {
    if (!newsletterEventsByConstituency.has(row.constituency_id)) {
      newsletterEventsByConstituency.set(row.constituency_id, []);
    }
    newsletterEventsByConstituency.get(row.constituency_id)!.push(row.received_at);
  }

  /** Sent-within-30-days as of a given date — same trailing-window
   * approach as channelActivityAsOf, matching the Dream Week target of
   * "at least 1 per month". Also reports sentThisCalendarMonth — a
   * separate, calendar-anchored view ("since the 1st") rather than a
   * rolling 30-day window, for the Rankings column of the same name;
   * it doesn't feed the points score. */
  function newsletterActivityAsOf(
    constituencyId: string,
    referenceDate: Date
  ): { sentInLast30Days: boolean; sentThisCalendarMonth: boolean } {
    const cutoff = new Date(referenceDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
    const events = newsletterEventsByConstituency.get(constituencyId) ?? [];
    let sentInLast30Days = false;
    let sentThisCalendarMonth = false;
    for (const receivedAt of events) {
      const date = new Date(receivedAt);
      if (date > referenceDate) continue;
      if (date >= cutoff) sentInLast30Days = true;
      if (date >= monthStart) sentThisCalendarMonth = true;
    }
    return { sentInLast30Days, sentThisCalendarMonth };
  }

  const subscriberCountsByConstituency = new Map<string, Map<string, number>>();
  for (const row of subscriberCountRows) {
    if (!row.has_data || row.subscriber_count === null) continue;
    if (!subscriberCountsByConstituency.has(row.constituency_id)) {
      subscriberCountsByConstituency.set(row.constituency_id, new Map());
    }
    subscriberCountsByConstituency.get(row.constituency_id)!.set(row.month_start, row.subscriber_count);
  }

  /** Growth vs the previous calendar month's approved count, as of a
   * given date. Needs both months' counts approved to say anything —
   * a single month alone can't show growth, so hasComparison is false
   * until there are two consecutive approved months. */
  function subscriberGrowthAsOf(
    constituencyId: string,
    referenceDate: Date
  ): { hasComparison: boolean; grewByAtLeastTarget: boolean } {
    const byMonth = subscriberCountsByConstituency.get(constituencyId);
    if (!byMonth) return { hasComparison: false, grewByAtLeastTarget: false };

    const thisMonthStart = toDateStr(new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1)));
    const prevMonthStart = toDateStr(
      new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - 1, 1))
    );
    const thisCount = byMonth.get(thisMonthStart);
    const prevCount = byMonth.get(prevMonthStart);
    if (thisCount === undefined || prevCount === undefined) return { hasComparison: false, grewByAtLeastTarget: false };

    return { hasComparison: true, grewByAtLeastTarget: thisCount - prevCount >= SUBSCRIBER_GROWTH_TARGET };
  }

  const advertiserConstituencyIds = new Set(advertiserRows.map((r) => r.constituency_id));
  const adWindowsByConstituency = new Map<string, { start: string | null; stop: string | null }[]>();
  for (const row of adWindowRows) {
    if (!adWindowsByConstituency.has(row.constituency_id)) adWindowsByConstituency.set(row.constituency_id, []);
    adWindowsByConstituency.get(row.constituency_id)!.push({ start: row.start, stop: row.stop });
  }

  /** Ad recency as of a given date, capping "last activity" at that date
   * so a future ad can't retroactively make a past period look active. */
  function adRecencyAsOf(constituencyId: string, referenceDate: Date): AdRecencyStatus {
    const windows = adWindowsByConstituency.get(constituencyId) ?? [];
    let isActiveAsOf = false;
    let lastActivityAt: string | null = null;
    for (const w of windows) {
      if (!w.start) continue;
      const startDate = new Date(w.start);
      if (startDate > referenceDate) continue;
      const stopDate = w.stop ? new Date(w.stop) : null;
      if (!stopDate || stopDate >= referenceDate) isActiveAsOf = true;
      const activityEnd = stopDate && stopDate < referenceDate ? stopDate : referenceDate;
      if (!lastActivityAt || new Date(lastActivityAt) < activityEnd) lastActivityAt = activityEnd.toISOString();
    }
    return classifyAdRecency({
      hasAdvertiser: advertiserConstituencyIds.has(constituencyId),
      isActiveAsOf,
      lastActivityAt,
      referenceDate,
    });
  }

  const platformName = Object.fromEntries(platforms.map((p) => [p.id, p.name]));
  const periodEnd = Object.fromEntries(periods.map((p) => [p.start, p.end]));

  const group: SingleRow[] = groupRaw.map((r) => ({ ...r, value: r.post_count }));
  const newsletter: SingleRow[] = newsletterRaw.map((r) => ({ ...r, value: r.send_count }));

  // Group organic + ad spend rows by constituency+period so we can sum
  // across platforms.
  const organicByKey = new Map<string, OrganicRow[]>();
  for (const row of organic) {
    const key = periodKey(row.constituency_id, row.period_start);
    if (!organicByKey.has(key)) organicByKey.set(key, []);
    organicByKey.get(key)!.push(row);
  }
  const adByKey = new Map<string, AdSpendRow[]>();
  for (const row of adSpend) {
    const key = periodKey(row.constituency_id, row.period_start);
    if (!adByKey.has(key)) adByKey.set(key, []);
    adByKey.get(key)!.push(row);
  }
  const groupByKey = new Map(group.map((r) => [periodKey(r.constituency_id, r.period_start), r]));
  const newsletterByKey = new Map(
    newsletter.map((r) => [periodKey(r.constituency_id, r.period_start), r])
  );

  const constituencyIds = Array.from(
    new Set([
      ...organic.map((r) => r.constituency_id),
      ...adSpend.map((r) => r.constituency_id),
      ...group.map((r) => r.constituency_id),
      ...newsletter.map((r) => r.constituency_id),
      ...advertiserConstituencyIds,
      ...tiktokAccountConstituencyIds,
      ...channelAccountConstituencyIds,
      ...newsletterAccountConstituencyIds,
    ])
  );

  // First pass: raw aggregates per constituency+period (no scoring yet —
  // peer-relative metrics need every constituency's raw value first).
  type RawPoint = {
    constituencyId: string;
    period: string;
    adSpend: PeriodMetrics["adSpend"];
    organic: PeriodMetrics["organic"];
    group: PeriodMetrics["group"];
    newsletter: PeriodMetrics["newsletter"];
    tiktok: {
      hasAccount: boolean;
      points: number;
      isBestPostWinner: boolean;
      reach: number;
      postedInLast30Days: boolean;
      postedInLast7Days: boolean;
    };
    channel: {
      hasAccount: boolean;
      reelIn7Days: boolean;
      postedIn7Days: boolean;
    };
    newsletterActivity: {
      hasAccount: boolean;
      sentInLast30Days: boolean;
      sentThisCalendarMonth: boolean;
    };
    subscriberGrowth: {
      hasComparison: boolean;
      grewByAtLeastTarget: boolean;
    };
  };
  const rawPoints: RawPoint[] = [];

  for (const constituencyId of constituencyIds) {
    for (const { start, end } of periods) {
      const key = periodKey(constituencyId, start);

      const organicRows = organicByKey.get(key) ?? [];
      const organicByPlatform: PlatformBreakdown[] = organicRows.map((r) => ({
        platform: platformName[r.platform_id],
        postCount: r.has_data ? (r.post_count ?? 0) : 0,
        hasData: r.has_data,
      }));
      const organicHasData = organicByPlatform.some((p) => p.hasData);
      const organicTotal = organicByPlatform.reduce((sum, p) => sum + (p.hasData ? p.postCount : 0), 0);

      const adRows = adByKey.get(key) ?? [];
      const adByPlatform: AdPlatformBreakdown[] = adRows.map((r) => ({
        platform: platformName[r.platform_id],
        spent: r.has_data ? num(r.amount_spent) : 0,
        target: num(r.target_amount),
        hasData: r.has_data,
      }));
      const adHasData = adByPlatform.some((p) => p.hasData);
      const adSpentTotal = adByPlatform.reduce((sum, p) => sum + (p.hasData ? p.spent : 0), 0);
      const adTargetTotal = adByPlatform.reduce((sum, p) => sum + p.target, 0);

      const groupRow = groupByKey.get(key);
      const newsletterRow = newsletterByKey.get(key);
      // For a completed period, periodEnd is the real "as of" date to
      // reconstruct history against. But for the CURRENT, still-in-
      // progress period, periodEnd is this week's Sunday — a date that
      // hasn't happened yet — so using it as-is would push every
      // trailing window (7/30/60 days) forward into the future and
      // silently exclude real recent activity for any day that isn't
      // Sunday. Clamping to "now" fixes the current period without
      // touching past ones (whose periodEnd is already <= now).
      const periodEndDate = new Date(Math.min(new Date(periodEnd[start]).getTime(), Date.now()));
      const recencyStatus = adRecencyAsOf(constituencyId, periodEndDate);

      const tiktokWinnerId = bestPostWinnerFor({ start, end }, periodEndDate);
      const tiktokIsBestPostWinner = tiktokWinnerId === constituencyId;
      const tiktokRecencyPoints = tiktokPointsAsOf(constituencyId, periodEndDate);
      const tiktokPoints = tiktokRecencyPoints + (tiktokIsBestPostWinner ? 1 : 0);
      // recencyPoints' loosest tier (1 point) is exactly "posted within
      // the last 30 days as of this period", so >=1 reads that off
      // directly rather than re-deriving it separately. The tiers stack,
      // so >=3 (the 7-day and everything tighter than it) is exactly
      // "posted within the last 7 days".
      const tiktokPostedInLast30Days = tiktokRecencyPoints >= 1;
      const tiktokPostedInLast7Days = tiktokRecencyPoints >= 3;

      const channelInfo = channelActivityAsOf(constituencyId, periodEndDate);
      const newsletterActivityInfo = newsletterActivityAsOf(constituencyId, periodEndDate);
      const subscriberGrowthInfo = subscriberGrowthAsOf(constituencyId, periodEndDate);

      rawPoints.push({
        constituencyId,
        period: start,
        adSpend: {
          spent: adSpentTotal,
          target: adTargetTotal,
          hasData: adHasData,
          byPlatform: adByPlatform,
          recencyStatus,
        },
        organic: { total: organicTotal, hasData: organicHasData, byPlatform: organicByPlatform },
        group: {
          postCount: groupRow?.has_data ? (groupRow.value ?? 0) : 0,
          hasData: groupRow?.has_data ?? false,
        },
        newsletter: {
          sendCount: newsletterRow?.has_data ? (newsletterRow.value ?? 0) : 0,
          hasData: newsletterRow?.has_data ?? false,
        },
        tiktok: {
          hasAccount: tiktokAccountConstituencyIds.has(constituencyId),
          points: tiktokPoints,
          isBestPostWinner: tiktokIsBestPostWinner,
          reach: tiktokReachFor(constituencyId, periodEndDate),
          postedInLast30Days: tiktokPostedInLast30Days,
          postedInLast7Days: tiktokPostedInLast7Days,
        },
        channel: {
          hasAccount: channelAccountConstituencyIds.has(constituencyId),
          reelIn7Days: channelInfo.reelIn7Days,
          postedIn7Days: channelInfo.postedIn7Days,
        },
        newsletterActivity: {
          hasAccount: newsletterAccountConstituencyIds.has(constituencyId),
          sentInLast30Days: newsletterActivityInfo.sentInLast30Days,
          sentThisCalendarMonth: newsletterActivityInfo.sentThisCalendarMonth,
        },
        subscriberGrowth: {
          hasComparison: subscriberGrowthInfo.hasComparison,
          grewByAtLeastTarget: subscriberGrowthInfo.grewByAtLeastTarget,
        },
      });
    }
  }

  // Peer pools per period, for metrics with no fixed target.
  const peersByPeriod = new Map<
    string,
    { organic: number[]; group: number[]; newsletter: number[] }
  >();
  for (const { start } of periods) {
    peersByPeriod.set(start, {
      organic: rawPoints.filter((p) => p.period === start && p.organic.hasData).map((p) => p.organic.total),
      group: rawPoints.filter((p) => p.period === start && p.group.hasData).map((p) => p.group.postCount),
      newsletter: rawPoints
        .filter((p) => p.period === start && p.newsletter.hasData)
        .map((p) => p.newsletter.sendCount),
    });
  }

  // Second pass: score each point now that peer pools exist.
  const index = new Map<string, PeriodMetrics>();
  for (const point of rawPoints) {
    const peers = peersByPeriod.get(point.period)!;
    const metrics: MetricScore[] = [
      { key: "adSpend", ...scoreForAdRecency(point.adSpend.recencyStatus) },
      scoreMetric({
        key: "organic",
        hasData: point.organic.hasData,
        value: point.organic.total,
        peerValues: peers.organic,
      }),
      scoreMetric({
        key: "group",
        hasData: point.group.hasData,
        value: point.group.postCount,
        peerValues: peers.group,
      }),
      scoreMetric({
        key: "newsletter",
        hasData: point.newsletter.hasData,
        value: point.newsletter.sendCount,
        peerValues: peers.newsletter,
      }),
      { key: "tiktok", ...scoreForTiktok({ hasAccount: point.tiktok.hasAccount, points: point.tiktok.points }) },
      {
        key: "channel",
        ...scoreForChannel({
          hasAccount: point.channel.hasAccount,
          reelIn7Days: point.channel.reelIn7Days,
          postedIn7Days: point.channel.postedIn7Days,
        }),
      },
      {
        key: "newsletterActivity",
        ...scoreForNewsletter({
          hasAccount: point.newsletterActivity.hasAccount,
          sentThisCalendarMonth: point.newsletterActivity.sentThisCalendarMonth,
        }),
      },
      {
        key: "groupPoints",
        ...scoreForGroup({ hasAccount: point.group.hasData, postCount: point.group.postCount }),
      },
      {
        key: "subscriberGrowth",
        ...scoreForSubscriberGrowth({
          hasAccount: point.subscriberGrowth.hasComparison,
          grewByAtLeastTarget: point.subscriberGrowth.grewByAtLeastTarget,
        }),
      },
    ];

    index.set(periodKey(point.constituencyId, point.period), {
      period: point.period,
      periodEnd: periodEnd[point.period],
      overall: overallScore(metrics),
      overallMaxPoints: totalPossiblePoints(metrics),
      adSpend: point.adSpend,
      organic: point.organic,
      group: point.group,
      newsletter: point.newsletter,
      tiktok: {
        points: point.tiktok.points,
        hasData: point.tiktok.hasAccount,
        isBestPostWinner: point.tiktok.isBestPostWinner,
        reach: point.tiktok.reach,
        postedInLast30Days: point.tiktok.postedInLast30Days,
        postedInLast7Days: point.tiktok.postedInLast7Days,
      },
      channel: {
        points: (point.channel.reelIn7Days ? 1 : 0) + (point.channel.postedIn7Days ? 1 : 0),
        hasData: point.channel.hasAccount,
        reelIn7Days: point.channel.reelIn7Days,
        postedIn7Days: point.channel.postedIn7Days,
      },
      newsletterActivity: {
        points: point.newsletterActivity.sentThisCalendarMonth ? NEWSLETTER_MAX_POINTS : 0,
        hasData: point.newsletterActivity.hasAccount,
        sentInLast30Days: point.newsletterActivity.sentInLast30Days,
        sentThisCalendarMonth: point.newsletterActivity.sentThisCalendarMonth,
      },
      subscriberGrowth: {
        points: point.subscriberGrowth.grewByAtLeastTarget ? SUBSCRIBER_MAX_POINTS : 0,
        hasData: point.subscriberGrowth.hasComparison,
        grewByAtLeastTarget: point.subscriberGrowth.grewByAtLeastTarget,
      },
    });
  }

  return { index, periods, constituencyIds };
}

export type RankingRow = {
  constituency: Constituency;
  rank: number;
  score: number | null;
  scoreMaxPoints: number;
  previousScore: number | null;
  change: { delta: number | null; direction: "up" | "down" | "flat" | "unknown" };
  /** Whether an ad is running right now — the hex map's 🟢 status. */
  adLive: boolean;
  tiktok: {
    hasData: boolean;
    reach: number;
    postedInLast30Days: boolean;
    postedInLast7Days: boolean;
    /** Won the "best-performing post nationally that week" TikTok point — see weeklyBestPostWinner. */
    isBestPostWinner: boolean;
  };
  channel: { hasData: boolean; reelIn7Days: boolean; postedIn7Days: boolean };
  newsletterActivity: { hasData: boolean; sentInLast30Days: boolean; sentThisCalendarMonth: boolean };
  /** Manually-reported Facebook group posts this week — see facebook_group_activity. */
  group: { hasData: boolean; postCount: number };
  /** hasData here means "has two consecutive approved months to compare" — see subscriberGrowthAsOf. */
  subscriberGrowth: { hasData: boolean; grewByAtLeastTarget: boolean };
};

export type RankingsResult = {
  rows: RankingRow[];
  periods: Period[];
  targetPeriod: Period | null;
  previousPeriod: Period | null;
  regions: string[];
  cohorts: string[];
  lastUpdated: string | null;
};

export async function getRankings(filters: {
  region?: string;
  cohort?: string;
  period?: string;
}): Promise<RankingsResult> {
  const [{ index, periods }, constituencies, regions, cohorts, lastUpdated] = await Promise.all([
    buildMetricsIndex(),
    sql<Constituency[]>`select * from constituencies`,
    listRegions(),
    listCohorts(),
    getLastUpdated(),
  ]);

  // No activity has been tracked for anyone yet — every constituency is
  // shown, unranked/scoreless, rather than crashing on a missing period.
  if (periods.length === 0) {
    const rows: RankingRow[] = constituencies
      .filter((c) => !filters.region || c.region === filters.region)
      .filter((c) => !filters.cohort || c.cohort === filters.cohort)
      .map((c) => ({
        constituency: c,
        rank: 1,
        score: null,
        scoreMaxPoints: FALLBACK_MAX_POINTS,
        previousScore: null,
        change: { delta: null, direction: "unknown" as const },
        adLive: false,
        tiktok: {
          hasData: false,
          reach: 0,
          postedInLast30Days: false,
          postedInLast7Days: false,
          isBestPostWinner: false,
        },
        channel: { hasData: false, reelIn7Days: false, postedIn7Days: false },
        newsletterActivity: { hasData: false, sentInLast30Days: false, sentThisCalendarMonth: false },
        group: { hasData: false, postCount: 0 },
        subscriberGrowth: { hasData: false, grewByAtLeastTarget: false },
      }));
    return { rows, periods, targetPeriod: null, previousPeriod: null, regions, cohorts, lastUpdated };
  }

  const targetPeriod = periods.find((p) => p.start === filters.period) ?? periods[0];
  const targetIndex = periods.findIndex((p) => p.start === targetPeriod.start);
  const previousPeriod = periods[targetIndex + 1] ?? null;

  // Rank is always computed across every pilot constituency — filters
  // only narrow what's displayed, not the peer group used for ranking.
  const nationalRanked = rankByScore(
    constituencies.map((c) => ({
      constituency: c,
      score: index.get(periodKey(c.id, targetPeriod.start))?.overall ?? null,
    }))
  );

  const rows: RankingRow[] = nationalRanked
    .filter((r) => !filters.region || r.constituency.region === filters.region)
    .filter((r) => !filters.cohort || r.constituency.cohort === filters.cohort)
    .map((r) => {
      const previousScore = previousPeriod
        ? (index.get(periodKey(r.constituency.id, previousPeriod.start))?.overall ?? null)
        : null;
      const currentMetrics = index.get(periodKey(r.constituency.id, targetPeriod.start));
      return {
        constituency: r.constituency,
        rank: r.rank,
        score: r.score,
        scoreMaxPoints: currentMetrics?.overallMaxPoints ?? FALLBACK_MAX_POINTS,
        previousScore,
        change: scoreChange(r.score, previousScore),
        adLive: currentMetrics?.adSpend.recencyStatus === "active",
        tiktok: currentMetrics?.tiktok ?? {
          hasData: false,
          reach: 0,
          postedInLast30Days: false,
          postedInLast7Days: false,
          isBestPostWinner: false,
        },
        channel: currentMetrics?.channel ?? { hasData: false, reelIn7Days: false, postedIn7Days: false },
        newsletterActivity: currentMetrics?.newsletterActivity ?? {
          hasData: false,
          sentInLast30Days: false,
          sentThisCalendarMonth: false,
        },
        group: currentMetrics?.group ?? { hasData: false, postCount: 0 },
        subscriberGrowth: currentMetrics?.subscriberGrowth ?? { hasData: false, grewByAtLeastTarget: false },
      };
    });

  return { rows, periods, targetPeriod, previousPeriod, regions, cohorts, lastUpdated };
}

const EMPTY_METRICS: Omit<PeriodMetrics, "period" | "periodEnd"> = {
  overall: null,
  overallMaxPoints: FALLBACK_MAX_POINTS,
  adSpend: { spent: 0, target: 0, hasData: false, byPlatform: [], recencyStatus: "no_advertiser" },
  organic: { total: 0, hasData: false, byPlatform: [] },
  group: { postCount: 0, hasData: false },
  newsletter: { sendCount: 0, hasData: false },
  tiktok: {
    points: 0,
    hasData: false,
    isBestPostWinner: false,
    reach: 0,
    postedInLast30Days: false,
    postedInLast7Days: false,
  },
  channel: { points: 0, hasData: false, reelIn7Days: false, postedIn7Days: false },
  newsletterActivity: { points: 0, hasData: false, sentInLast30Days: false, sentThisCalendarMonth: false },
  subscriberGrowth: { points: 0, hasData: false, grewByAtLeastTarget: false },
};

export type ConstituencyDetail = {
  constituency: Constituency;
  targetPeriod: Period | null;
  previousPeriod: Period | null;
  nationalRank: number;
  nationalCount: number;
  regionalRank: number;
  regionalCount: number;
  score: number | null;
  scoreMaxPoints: number;
  change: { delta: number | null; direction: "up" | "down" | "flat" | "unknown" };
  current: PeriodMetrics;
  history: PeriodMetrics[]; // oldest to newest
  lastUpdated: string | null;
};

export async function getConstituencyDetail(
  constituencyId: string,
  periodStart?: string
): Promise<ConstituencyDetail | null> {
  const [{ index, periods }, constituencies] = await Promise.all([
    buildMetricsIndex(),
    sql<Constituency[]>`select * from constituencies`,
  ]);

  const constituency = constituencies.find((c) => c.id === constituencyId);
  if (!constituency) return null;

  if (periods.length === 0) {
    const nationalRanked = rankByScore(constituencies.map((c) => ({ id: c.id, score: null })));
    const national = nationalRanked.find((r) => r.id === constituencyId)!;
    const regionalRanked = rankByScore(
      constituencies.filter((c) => c.region === constituency.region).map((c) => ({ id: c.id, score: null }))
    );
    const regional = regionalRanked.find((r) => r.id === constituencyId)!;

    return {
      constituency,
      targetPeriod: null,
      previousPeriod: null,
      nationalRank: national.rank,
      nationalCount: constituencies.length,
      regionalRank: regional.rank,
      regionalCount: constituencies.filter((c) => c.region === constituency.region).length,
      score: null,
      scoreMaxPoints: FALLBACK_MAX_POINTS,
      change: { delta: null, direction: "unknown" },
      current: { period: "", periodEnd: "", ...EMPTY_METRICS },
      history: [],
      lastUpdated: null,
    };
  }

  const targetPeriod = periods.find((p) => p.start === periodStart) ?? periods[0];
  const targetIndex = periods.findIndex((p) => p.start === targetPeriod.start);
  const previousPeriod = periods[targetIndex + 1] ?? null;

  const nationalRanked = rankByScore(
    constituencies.map((c) => ({
      id: c.id,
      score: index.get(periodKey(c.id, targetPeriod.start))?.overall ?? null,
    }))
  );
  const national = nationalRanked.find((r) => r.id === constituencyId)!;

  const regionalRanked = rankByScore(
    constituencies
      .filter((c) => c.region === constituency.region)
      .map((c) => ({ id: c.id, score: index.get(periodKey(c.id, targetPeriod.start))?.overall ?? null }))
  );
  const regional = regionalRanked.find((r) => r.id === constituencyId)!;

  const previousScore = previousPeriod
    ? (index.get(periodKey(constituencyId, previousPeriod.start))?.overall ?? null)
    : null;

  const history = [...periods]
    .reverse()
    .map((p) => index.get(periodKey(constituencyId, p.start)))
    .filter((p): p is PeriodMetrics => Boolean(p));

  const current = index.get(periodKey(constituencyId, targetPeriod.start));
  if (!current) return null;

  const [lastUpdatedRow] = await sql<{ last_updated: string | null }[]>`
    select max(t) as last_updated from (
      select max(created_at) as t from organic_posts where constituency_id = ${constituencyId}
      union all select max(created_at) from ad_spend where constituency_id = ${constituencyId}
      union all select max(created_at) from facebook_group_activity where constituency_id = ${constituencyId}
      union all select max(created_at) from newsletter_sends where constituency_id = ${constituencyId}
    ) x
  `;

  return {
    constituency,
    targetPeriod,
    previousPeriod,
    nationalRank: national.rank,
    nationalCount: constituencies.length,
    regionalRank: regional.rank,
    regionalCount: constituencies.filter((c) => c.region === constituency.region).length,
    score: current.overall,
    scoreMaxPoints: current.overallMaxPoints,
    change: scoreChange(current.overall, previousScore),
    current,
    history,
    lastUpdated: lastUpdatedRow?.last_updated ?? null,
  };
}
