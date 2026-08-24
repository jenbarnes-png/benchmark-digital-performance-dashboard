import postgres from "postgres";

// Shared Postgres connection (Supabase). Exported so other query modules
// (e.g. lib/rankings.ts) can run their own queries against the same tables
// defined in supabase/migrations/0001_init.sql.
//
// Cached on `globalThis` so Next's dev-mode hot reload reuses the same
// connection pool instead of opening a new one on every file edit —
// Supabase's session pooler caps concurrent clients, and without this a
// few edits are enough to exhaust it.
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

// Vercel runs several concurrent serverless instances, each holding
// its own little pool against Supabase's session-mode pooler (15
// connections total) — a couple of people loading the site at once was
// enough to exhaust it at max: 5 per instance ("max clients reached in
// session mode"). max: 1 on Vercel keeps each instance's footprint
// small so more instances fit under the cap; locally there's just the
// one dev process, so a bigger pool is fine there.
//
// Tried switching to Supabase's transaction pooler (port 6543) to fix
// this properly instead of just shrinking the footprint, but it threw
// CONNECTION_CLOSED errors under the same concurrent load — likely
// postgres.js's own reconnect handling not getting on with a warm
// serverless instance's connection going stale between invocations.
// Reverted; worth revisiting later, but session mode + max:1 is the
// known-working state for now.
//
// prepare: false avoids relying on prepared statements surviving
// across reconnects — a no-op cost in session mode, so safe either way.
export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    max: process.env.VERCEL ? 1 : 5,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}

export type Constituency = {
  id: string;
  name: string;
  mp_or_candidate_name: string | null;
  region: string;
  cohort: string | null;
  is_pilot: boolean;
  hex_id: string | null;
  created_at: string;
};

export type ConstituencyInput = {
  name: string;
  mpOrCandidateName: string | null;
  region: string;
  isPilot: boolean;
};

export async function listConstituencies(): Promise<Constituency[]> {
  return sql<Constituency[]>`select * from constituencies order by name asc`;
}

export async function getConstituency(id: string): Promise<Constituency | undefined> {
  const rows = await sql<Constituency[]>`select * from constituencies where id = ${id}`;
  return rows[0];
}

/**
 * Creates the constituency and, if an MP/candidate name is given, an
 * opening representatives row for them — see updateConstituency for
 * why this stays in sync with mp_or_candidate_name automatically
 * rather than requiring a separate step.
 */
export async function createConstituency(input: ConstituencyInput): Promise<string> {
  return sql.begin(async (sql) => {
    const rows = await sql<{ id: string }[]>`
      insert into constituencies (name, mp_or_candidate_name, region, is_pilot)
      values (${input.name}, ${input.mpOrCandidateName}, ${input.region}, ${input.isPilot})
      returning id
    `;
    const id = rows[0].id;
    if (input.mpOrCandidateName) {
      await sql`insert into representatives (constituency_id, name) values (${id}, ${input.mpOrCandidateName})`;
    }
    return id;
  });
}

/**
 * mp_or_candidate_name is a denormalized "current value" cache —
 * representatives is the source of truth for tenure history. When the
 * name actually changes, this ends the current representative's tenure
 * and opens a new one in the same transaction, so the two can never
 * drift apart. A same-name save (editing region, say) doesn't touch
 * representatives at all.
 */
export async function updateConstituency(id: string, input: ConstituencyInput): Promise<void> {
  await sql.begin(async (sql) => {
    const [current] = await sql<{ mp_or_candidate_name: string | null }[]>`
      select mp_or_candidate_name from constituencies where id = ${id}
    `;

    await sql`
      update constituencies
      set name = ${input.name},
          mp_or_candidate_name = ${input.mpOrCandidateName},
          region = ${input.region},
          is_pilot = ${input.isPilot}
      where id = ${id}
    `;

    if (input.mpOrCandidateName !== current?.mp_or_candidate_name) {
      await sql`
        update representatives set ended_at = current_date
        where constituency_id = ${id} and ended_at is null
      `;
      if (input.mpOrCandidateName) {
        await sql`insert into representatives (constituency_id, name) values (${id}, ${input.mpOrCandidateName})`;
      }
    }
  });
}

export async function deleteConstituency(id: string): Promise<void> {
  await sql`delete from constituencies where id = ${id}`;
}

export type SocialAccount = {
  platform: string;
  handle: string | null;
  profile_url: string | null;
  external_id: string | null;
  follower_count: number | null;
  is_active: boolean;
};

/** The current representative's active social accounts, one row per platform account. */
export async function getCurrentSocialAccounts(constituencyId: string): Promise<SocialAccount[]> {
  return sql<SocialAccount[]>`
    select sa.platform, sa.handle, sa.profile_url, sa.external_id, sa.follower_count, sa.is_active
    from social_accounts sa
    join representatives r on r.id = sa.representative_id
    where r.constituency_id = ${constituencyId} and r.ended_at is null and sa.ended_at is null
    order by sa.platform
  `;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505" // Postgres unique_violation
  );
}
