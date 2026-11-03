// Read-only: is a particular MP in the Crete store yet, and what do we hold for them?
//   npm run check:mp -- Vince
// Pass part of the MP's surname. It searches the Facebook, Instagram and TikTok accounts in Crete
// for that text, and also for the account names we already hold for that MP (e.g. "LabourSatvir"),
// because an account address doesn't always contain the surname. Then it shows what the dashboard
// has stored for the MP. Changes nothing.
import { sql } from "../lib/db";
import { requireEnv } from "../lib/env";
import { log } from "../lib/log";

const term = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!term) {
  console.error('Tell me who to look for, e.g. npm run check:mp -- Vince');
  process.exit(1);
}

try {
  // WARNING: the key is a secret. Never print it.
  const url = requireEnv("ES_URL", "the web address of the Crete data store", "Ask Sapio for it.").replace(/\/$/, "");
  const key = requireEnv("ES_API_KEY", "the password for reading Crete", "Ask Sapio for a read-only key.");

  // The account names we already hold for this MP, e.g. "laboursatvir", so the search isn't surname-only.
  const held = await sql<{ profile_url: string | null; handle: string | null }[]>`
    select sa.profile_url, sa.handle from social_accounts sa join representatives r on r.id = sa.representative_id
    where r.name ilike ${"%" + term + "%"} and r.ended_at is null and sa.ended_at is null and sa.platform in ('facebook', 'instagram', 'tiktok')`;
  const slug = (u: string | null) => u?.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop()?.replace(/^@/, "").toLowerCase();
  const searchTerms = Array.from(new Set([term.toLowerCase(), ...held.flatMap((h) => [slug(h.profile_url), h.handle?.toLowerCase()]).filter((t): t is string => !!t && t.length >= 4)]));

  let found = 0;
  for (const index of ["crete-fb-pages", "crete-ig-posts", "crete-tt-posts"]) {
    const res = await fetch(`${url}/${index}/_search`, {
      method: "POST",
      headers: { Authorization: `ApiKey ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        size: 0,
        query: { bool: { should: searchTerms.map((t) => ({ wildcard: { "user.url.keyword": { value: `*${t}*`, case_insensitive: true } } })), minimum_should_match: 1 } },
        aggs: { u: { terms: { field: "user.url.keyword", size: 10 }, aggs: { last: { max: { field: "timestamp" } } } } },
      }),
    });
    if (!res.ok) throw new Error(`Crete answered HTTP ${res.status}. If 401/403, the key was changed or lacks read access: ask Sapio.`);
    const json = (await res.json()) as { aggregations?: { u: { buckets: { key: string; doc_count: number; last: { value_as_string: string } }[] } } };
    const buckets = json.aggregations?.u.buckets ?? [];
    found += buckets.length;
    if (buckets.length === 0) log.info("check-mp", `${index}: nothing yet for "${term}".`);
    for (const b of buckets) log.info("check-mp", `${index}: FOUND ${b.key} (${b.doc_count} posts, latest ${b.last.value_as_string.slice(0, 10)}).`);
  }

  const rows = await sql<{ name: string; platform: string; days: number; posts: number; last_post: string | null }[]>`
    select r.name, s.platform, count(*)::int as days, coalesce(sum(s.post_count), 0)::int as posts, max(s.date) filter (where s.post_count > 0)::text as last_post
    from social_activity_daily s join representatives r on r.id = s.representative_id
    where r.name ilike ${"%" + term + "%"} and r.ended_at is null group by r.name, s.platform`;
  if (rows.length === 0) log.info("check-mp", `The dashboard has no Facebook/Instagram activity stored for anyone matching "${term}".`);
  for (const r of rows) log.info("check-mp", `Dashboard: ${r.name} on ${r.platform}: ${r.posts} posts over ${r.days} days, last post ${r.last_post ?? "none"}.`);

  log.info("check-mp", found > 0 ? `RESULT: "${term}" is now in Crete.` : `RESULT: "${term}" is not in Crete yet.`);
} catch (error) {
  log.error("check-mp", `FAILED. ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
