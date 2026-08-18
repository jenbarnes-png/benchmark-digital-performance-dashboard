// One-time (per new MP) discovery of each constituency's Facebook Page
// ID, stored permanently in the advertisers table. After this runs,
// future syncs search by that ID and never need to search by name again.
//
// The Graph API's direct username-to-ID lookup needs a gated permission
// we don't have (Page Public Content Access), so instead we search the
// Ad Library once by the MP's name and read the Page ID off any ad we
// find. IMPORTANT: search_terms matches against ad text/content, not
// just the advertiser's page name, so it readily returns unrelated
// pages (a search for "Chris Vince" surfaced an ad from someone
// entirely unrelated called "Dale Vince", just sharing a surname).
// We only auto-accept a match when the returned page's name contains
// every word of the MP's name — anything else is reported for manual
// confirmation rather than silently trusted.
//
// Run with: npx tsx --env-file=.env.local scripts/resolve_advertisers.mts
import { sql } from "../lib/db";
import { searchAdsByName, type ArchivedAd } from "../lib/meta";

const accessToken = process.env.META_ACCESS_TOKEN;
if (!accessToken) {
  console.error("META_ACCESS_TOKEN is not set in .env.local");
  process.exit(1);
}

function normalizedWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function isConfidentMatch(pageName: string, mpName: string): boolean {
  const pageWords = new Set(normalizedWords(pageName));
  const mpWords = normalizedWords(mpName);
  return mpWords.every((w) => pageWords.has(w));
}

type Candidate = { pageId: string; pageName: string; adCount: number };

function bestCandidate(ads: ArchivedAd[], mpName: string): Candidate | null {
  const byPage = new Map<string, { pageName: string; count: number }>();
  for (const ad of ads) {
    if (!ad.page_id || ad.page_id === "0") continue;
    const entry = byPage.get(ad.page_id) ?? { pageName: ad.page_name, count: 0 };
    entry.count++;
    byPage.set(ad.page_id, entry);
  }

  const candidates = Array.from(byPage.entries())
    .map(([pageId, v]) => ({ pageId, pageName: v.pageName, adCount: v.count }))
    .sort((a, b) => b.adCount - a.adCount);

  const confident = candidates.filter((c) => isConfidentMatch(c.pageName, mpName));
  if (confident.length > 0) return confident[0];
  return null;
}

type ConstituencyRow = { id: string; name: string; mp_or_candidate_name: string | null };

const constituencies = await sql<ConstituencyRow[]>`
  select id, name, mp_or_candidate_name from constituencies where mp_or_candidate_name is not null
`;

const existing = await sql<{ constituency_id: string }[]>`
  select constituency_id from advertisers where platform = 'meta'
`;
const alreadyResolved = new Set(existing.map((e) => e.constituency_id));

console.log(`${constituencies.length} constituencies have an MP name, ${alreadyResolved.size} already resolved.`);

let resolved = 0;
const needsReview: { constituency: string; mp: string; candidates: Candidate[] }[] = [];

for (const c of constituencies) {
  if (alreadyResolved.has(c.id)) continue;

  try {
    const ads = await searchAdsByName(c.mp_or_candidate_name!, accessToken);
    const match = bestCandidate(ads, c.mp_or_candidate_name!);

    if (!match) {
      const byPage = new Map<string, Candidate>();
      for (const ad of ads) {
        if (!ad.page_id || ad.page_id === "0") continue;
        const existing = byPage.get(ad.page_id);
        if (existing) existing.adCount++;
        else byPage.set(ad.page_id, { pageId: ad.page_id, pageName: ad.page_name, adCount: 1 });
      }
      needsReview.push({
        constituency: c.name,
        mp: c.mp_or_candidate_name!,
        candidates: Array.from(byPage.values()),
      });
      continue;
    }

    await sql`
      insert into advertisers (constituency_id, platform, external_page_id, page_name)
      values (${c.id}, 'meta', ${match.pageId}, ${match.pageName})
      on conflict (platform, external_page_id) do nothing
    `;
    console.log(`Resolved ${c.name} -> Page ID ${match.pageId} (${match.pageName})`);
    resolved++;
  } catch (error) {
    console.error(`Failed to resolve ${c.name} (${c.mp_or_candidate_name}):`, error);
  }
}

console.log(`\nDone. Confidently resolved ${resolved}.`);
if (needsReview.length > 0) {
  console.log(`\n${needsReview.length} need manual review (no confident name match):`);
  for (const item of needsReview) {
    console.log(`\n${item.constituency} — ${item.mp}`);
    if (item.candidates.length === 0) {
      console.log("  No ads found in the archive yet.");
    } else {
      for (const cand of item.candidates.slice(0, 5)) {
        console.log(`  candidate: "${cand.pageName}" (Page ID ${cand.pageId}, ${cand.adCount} ad(s))`);
      }
    }
  }
}

await sql.end();
