import { sql, type Constituency } from "./db";
import { scoreMetric, overallScore, scoreChange, rankByScore, type MetricScore } from "./scoring";

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

export async function listPeriods(): Promise<Period[]> {
  const rows = await sql<{ period_start: string; period_end: string }[]>`
    select distinct period_start::text, period_end::text from (
      select period_start, period_end from organic_posts
      union
      select period_start, period_end from ad_spend
      union select period_start, period_end from facebook_group_activity
      union select period_start, period_end from newsletter_sends
    ) p
    order by period_start desc
  `;
  return rows.map((r) => ({ start: r.period_start, end: r.period_end }));
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
  adSpend: { spent: number; target: number; hasData: boolean; byPlatform: AdPlatformBreakdown[] };
  organic: { total: number; hasData: boolean; byPlatform: PlatformBreakdown[] };
  group: { postCount: number; hasData: boolean };
  newsletter: { sendCount: number; hasData: boolean };
};

/**
 * Loads every activity row and folds it into one metrics-by-constituency-
 * by-period index. This is the single place that turns raw tables into
 * the shape both pages need — scoring rules live here, once.
 */
async function buildMetricsIndex() {
  const [organic, adSpend, groupRaw, newsletterRaw, platforms, periods] = await Promise.all([
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
  ]);

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
    new Set([...organic, ...adSpend, ...group, ...newsletter].map((r) => r.constituency_id))
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
  };
  const rawPoints: RawPoint[] = [];

  for (const constituencyId of constituencyIds) {
    for (const { start } of periods) {
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

      rawPoints.push({
        constituencyId,
        period: start,
        adSpend: { spent: adSpentTotal, target: adTargetTotal, hasData: adHasData, byPlatform: adByPlatform },
        organic: { total: organicTotal, hasData: organicHasData, byPlatform: organicByPlatform },
        group: {
          postCount: groupRow?.has_data ? (groupRow.value ?? 0) : 0,
          hasData: groupRow?.has_data ?? false,
        },
        newsletter: {
          sendCount: newsletterRow?.has_data ? (newsletterRow.value ?? 0) : 0,
          hasData: newsletterRow?.has_data ?? false,
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
      scoreMetric({
        key: "adSpend",
        hasData: point.adSpend.hasData,
        value: point.adSpend.spent,
        target: point.adSpend.target,
      }),
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
    ];

    index.set(periodKey(point.constituencyId, point.period), {
      period: point.period,
      periodEnd: periodEnd[point.period],
      overall: overallScore(metrics),
      adSpend: point.adSpend,
      organic: point.organic,
      group: point.group,
      newsletter: point.newsletter,
    });
  }

  return { index, periods, constituencyIds };
}

export type RankingRow = {
  constituency: Constituency;
  rank: number;
  score: number | null;
  previousScore: number | null;
  change: { delta: number | null; direction: "up" | "down" | "flat" | "unknown" };
  organicByPlatform: PlatformBreakdown[];
};

export type RankingsResult = {
  rows: RankingRow[];
  periods: Period[];
  targetPeriod: Period;
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
      return {
        constituency: r.constituency,
        rank: r.rank,
        score: r.score,
        previousScore,
        change: scoreChange(r.score, previousScore),
        organicByPlatform: index.get(periodKey(r.constituency.id, targetPeriod.start))?.organic.byPlatform ?? [],
      };
    });

  return { rows, periods, targetPeriod, previousPeriod, regions, cohorts, lastUpdated };
}

export type ConstituencyDetail = {
  constituency: Constituency;
  targetPeriod: Period;
  previousPeriod: Period | null;
  nationalRank: number;
  nationalCount: number;
  regionalRank: number;
  regionalCount: number;
  score: number | null;
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
    change: scoreChange(current.overall, previousScore),
    current,
    history,
    lastUpdated: lastUpdatedRow?.last_updated ?? null,
  };
}
