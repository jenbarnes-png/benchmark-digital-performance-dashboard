import { sql } from "./db";

// Manual entry for organic posting — there's no API access to pull real
// post counts for other people's Pages/accounts, so MP teams self-report
// these the same way they would for ad spend or newsletter sends. Feeds
// straight into the existing "Platform breakdown" cards on the
// constituency page (lib/rankings.ts already reads organic_posts
// generically by platform name).
const TRACKED_PLATFORMS = ["Facebook", "Instagram"] as const;
export type TrackedPlatform = (typeof TRACKED_PLATFORMS)[number];

export type OrganicPostEntry = {
  constituencyId: string;
  constituencyName: string;
  periodStart: string;
  periodEnd: string;
  counts: Record<TrackedPlatform, { postCount: number | null; hasData: boolean }>;
};

export type OrganicPostInput = {
  constituencyId: string;
  periodStart: string;
  periodEnd: string;
  facebookPostCount: number | null;
  instagramPostCount: number | null;
};

function emptyCounts(): OrganicPostEntry["counts"] {
  return {
    Facebook: { postCount: null, hasData: false },
    Instagram: { postCount: null, hasData: false },
  };
}

export async function listOrganicPostEntries(): Promise<OrganicPostEntry[]> {
  const rows = await sql<
    {
      constituency_id: string;
      constituency_name: string;
      period_start: string;
      period_end: string;
      platform_name: string;
      post_count: number | null;
      has_data: boolean;
    }[]
  >`
    select
      op.constituency_id, c.name as constituency_name,
      op.period_start::text, op.period_end::text,
      p.name as platform_name, op.post_count, op.has_data
    from organic_posts op
    join constituencies c on c.id = op.constituency_id
    join platforms p on p.id = op.platform_id
    where p.name in ${sql(TRACKED_PLATFORMS)}
    order by op.period_start desc, c.name asc
  `;

  const byKey = new Map<string, OrganicPostEntry>();
  for (const r of rows) {
    const key = `${r.constituency_id}|${r.period_start}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        constituencyId: r.constituency_id,
        constituencyName: r.constituency_name,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        counts: emptyCounts(),
      });
    }
    byKey.get(key)!.counts[r.platform_name as TrackedPlatform] = {
      postCount: r.post_count,
      hasData: r.has_data,
    };
  }
  return Array.from(byKey.values());
}

export async function getOrganicPostEntry(
  constituencyId: string,
  periodStart: string
): Promise<OrganicPostEntry | undefined> {
  const rows = await sql<
    {
      constituency_name: string;
      period_end: string;
      platform_name: string;
      post_count: number | null;
      has_data: boolean;
    }[]
  >`
    select c.name as constituency_name, op.period_end::text, p.name as platform_name,
      op.post_count, op.has_data
    from organic_posts op
    join constituencies c on c.id = op.constituency_id
    join platforms p on p.id = op.platform_id
    where op.constituency_id = ${constituencyId}
      and op.period_start = ${periodStart}
      and p.name in ${sql(TRACKED_PLATFORMS)}
  `;
  if (rows.length === 0) return undefined;

  const entry: OrganicPostEntry = {
    constituencyId,
    constituencyName: rows[0].constituency_name,
    periodStart,
    periodEnd: rows[0].period_end,
    counts: emptyCounts(),
  };
  for (const r of rows) {
    entry.counts[r.platform_name as TrackedPlatform] = { postCount: r.post_count, hasData: r.has_data };
  }
  return entry;
}

export async function upsertOrganicPostEntry(input: OrganicPostInput): Promise<void> {
  const platforms = await sql<{ id: string; name: string }[]>`
    select id, name from platforms where name in ${sql(TRACKED_PLATFORMS)}
  `;
  const platformId = (name: TrackedPlatform): string => {
    const row = platforms.find((p) => p.name === name);
    if (!row) throw new Error(`Missing "${name}" row in platforms table`);
    return row.id;
  };

  const counts: [TrackedPlatform, number | null][] = [
    ["Facebook", input.facebookPostCount],
    ["Instagram", input.instagramPostCount],
  ];

  await sql.begin(async (sql) => {
    for (const [platform, postCount] of counts) {
      await sql`
        insert into organic_posts (
          constituency_id, platform_id, period_start, period_end, post_count, source, has_data
        ) values (
          ${input.constituencyId}, ${platformId(platform)}, ${input.periodStart}, ${input.periodEnd},
          ${postCount}, 'manual', ${postCount !== null}
        )
        on conflict (constituency_id, platform_id, period_start) do update set
          period_end = excluded.period_end,
          post_count = excluded.post_count,
          has_data = excluded.has_data
      `;
    }
  });
}

export async function deleteOrganicPostEntry(constituencyId: string, periodStart: string): Promise<void> {
  await sql`
    delete from organic_posts
    where constituency_id = ${constituencyId}
      and period_start = ${periodStart}
      and platform_id in (select id from platforms where name in ${sql(TRACKED_PLATFORMS)})
  `;
}
