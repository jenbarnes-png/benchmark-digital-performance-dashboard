import { sql } from "./db";

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

function mondayOnOrBefore(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1) - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Re-rolls the current week and the previous `weeks - 1` weeks, so a backfill is picked up. */
export async function rollupRecentWeeks(weeks = 4): Promise<void> {
  for (let i = 0; i < weeks; i++) {
    const start = mondayOnOrBefore(new Date());
    start.setUTCDate(start.getUTCDate() - 7 * i);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    await aggregateWeeklyChannelActivity(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
  }
}
