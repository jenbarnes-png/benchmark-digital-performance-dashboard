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

export const sql = globalForDb.sql ?? postgres(process.env.DATABASE_URL!, { max: 5 });

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
  facebook_url: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  created_at: string;
};

export type ConstituencyInput = {
  name: string;
  mpOrCandidateName: string | null;
  region: string;
  isPilot: boolean;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
};

export async function listConstituencies(): Promise<Constituency[]> {
  return sql<Constituency[]>`select * from constituencies order by name asc`;
}

export async function getConstituency(id: string): Promise<Constituency | undefined> {
  const rows = await sql<Constituency[]>`select * from constituencies where id = ${id}`;
  return rows[0];
}

export async function createConstituency(input: ConstituencyInput): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    insert into constituencies
      (name, mp_or_candidate_name, region, is_pilot, facebook_url, tiktok_url, instagram_url, x_url)
    values
      (${input.name}, ${input.mpOrCandidateName}, ${input.region}, ${input.isPilot},
       ${input.facebookUrl}, ${input.tiktokUrl}, ${input.instagramUrl}, ${input.xUrl})
    returning id
  `;
  return rows[0].id;
}

export async function updateConstituency(id: string, input: ConstituencyInput): Promise<void> {
  await sql`
    update constituencies
    set name = ${input.name},
        mp_or_candidate_name = ${input.mpOrCandidateName},
        region = ${input.region},
        is_pilot = ${input.isPilot},
        facebook_url = ${input.facebookUrl},
        tiktok_url = ${input.tiktokUrl},
        instagram_url = ${input.instagramUrl},
        x_url = ${input.xUrl}
    where id = ${id}
  `;
}

export async function deleteConstituency(id: string): Promise<void> {
  await sql`delete from constituencies where id = ${id}`;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505" // Postgres unique_violation
  );
}
