// Seeds sample data for the pilot: 8 constituencies, 4 platforms, and 8
// weeks of activity across all four activity tables, with some
// deliberate gaps (has_data = false) to demonstrate the missing-vs-zero
// distinction. Deterministic (seeded RNG) so re-running from a clean
// database gives the same result.
//
// Run with: node --env-file=.env.local scripts/seed.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

function mondayOnOrBefore(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

const currentWeekMonday = mondayOnOrBefore(new Date());
const lastCompletedWeekMonday = addDays(currentWeekMonday, -7);
// 8 periods, most recent (index 0) first.
const periods = Array.from({ length: 8 }, (_, i) => {
  const start = addDays(lastCompletedWeekMonday, -7 * i);
  return { weeksAgo: i, start, end: addDays(start, 6) };
});

console.log("Clearing existing sample data...");
await sql`delete from newsletter_sends`;
await sql`delete from facebook_group_activity`;
await sql`delete from organic_posts`;
await sql`delete from ad_spend`;
await sql`delete from constituencies`;
await sql`delete from platforms`;

console.log("Seeding platforms...");
const platformRows = await sql`
  insert into platforms ${sql(
    [{ name: "Facebook" }, { name: "Instagram" }, { name: "TikTok" }, { name: "YouTube" }],
    "name"
  )}
  returning id, name
`;
const platformId = Object.fromEntries(platformRows.map((p) => [p.name, p.id]));
// TikTok restricts political advertising, so it's excluded from ad spend tracking.
const adPlatforms = ["Facebook", "Instagram", "YouTube"];
const organicPlatforms = ["Facebook", "Instagram", "TikTok", "YouTube"];

console.log("Seeding constituencies...");
const constituencySeed = [
  { name: "Holborn and St Pancras", mp_or_candidate_name: "Sample MP", region: "London", cohort: "Safe", is_pilot: true },
  { name: "Islington North", mp_or_candidate_name: "Sample MP", region: "London", cohort: "Safe", is_pilot: true },
  { name: "Leeds South", mp_or_candidate_name: "Sample MP", region: "Yorkshire and The Humber", cohort: "Marginal", is_pilot: true },
  { name: "Manchester Central", mp_or_candidate_name: "Sample MP", region: "North West", cohort: "Safe", is_pilot: true },
  { name: "Cardiff South and Penarth", mp_or_candidate_name: "Sample MP", region: "Wales", cohort: "Marginal", is_pilot: true },
  { name: "Edinburgh South", mp_or_candidate_name: "Sample MP", region: "Scotland", cohort: "Marginal", is_pilot: true },
  { name: "Belfast West", mp_or_candidate_name: "Sample candidate", region: "Northern Ireland", cohort: "Safe", is_pilot: true },
  { name: "Bristol Central", mp_or_candidate_name: "Sample MP", region: "South West", cohort: "Target", is_pilot: true },
];
const constituencyRows = await sql`
  insert into constituencies ${sql(
    constituencySeed,
    "name",
    "mp_or_candidate_name",
    "region",
    "cohort",
    "is_pilot"
  )}
  returning id, name, cohort
`;

const cohortTargetMultiplier = { Target: 1.4, Marginal: 1.0, Safe: 0.7 };

// Each constituency gets a performance "profile": a baseline activity
// level and a trend (rising or falling over the 8 weeks), so the
// rankings and charts have something real to show.
const profiles = Object.fromEntries(
  constituencyRows.map((c) => [
    c.id,
    {
      baseline: 0.5 + rand() * 0.6, // 0.5 - 1.1
      trend: (rand() - 0.4) * 0.05, // roughly -0.02 to +0.03 per week
      adMultiplier: cohortTargetMultiplier[c.cohort] ?? 1,
    },
  ])
);

function trendMultiplier(profile, weeksAgo) {
  return 1 + profile.trend * (7 - weeksAgo);
}

function noisy(base) {
  return Math.max(0, Math.round(base * (0.8 + rand() * 0.4)));
}

// ~8% of rows are missing data, simulating gaps in what teams have
// reported so far.
function hasData(weeksAgo, forceGapFor) {
  if (forceGapFor) return false;
  if (weeksAgo === 7) return rand() > 0.05; // oldest week: mostly complete
  return rand() > 0.08;
}

const organicRows = [];
const adSpendRows = [];
const groupRows = [];
const newsletterRows = [];

const baselinePostsPerWeek = { Facebook: 8, Instagram: 6, TikTok: 3, YouTube: 1 };
const baselineAdSpendPerWeek = { Facebook: 300, Instagram: 150, YouTube: 100 };

constituencyRows.forEach((c, cIndex) => {
  const profile = profiles[c.id];

  periods.forEach(({ weeksAgo, start, end }) => {
    const mult = trendMultiplier(profile, weeksAgo);

    // Deliberate, guaranteed gaps on the two most recent periods for the
    // first two constituencies, so the "missing vs zero" distinction is
    // always visible in the demo, not left to chance.
    const forceNewsletterGap = cIndex === 0 && weeksAgo <= 1;
    const forceGroupGap = cIndex === 1 && weeksAgo <= 1;

    organicPlatforms.forEach((platform) => {
      const gap = hasData(weeksAgo);
      organicRows.push({
        constituency_id: c.id,
        platform_id: platformId[platform],
        period_start: isoDate(start),
        period_end: isoDate(end),
        post_count: gap ? noisy(baselinePostsPerWeek[platform] * profile.baseline * mult) : null,
        source: "automatic",
        has_data: gap,
      });
    });

    adPlatforms.forEach((platform) => {
      const gap = hasData(weeksAgo);
      const target = Math.round(baselineAdSpendPerWeek[platform] * profile.adMultiplier);
      adSpendRows.push({
        constituency_id: c.id,
        platform_id: platformId[platform],
        period_start: isoDate(start),
        period_end: isoDate(end),
        amount_spent: gap ? noisy(target * profile.baseline * mult * (0.6 + rand() * 0.5)) : null,
        target_amount: target,
        source: "automatic",
        has_data: gap,
      });
    });

    const groupOk = hasData(weeksAgo, forceGroupGap);
    groupRows.push({
      constituency_id: c.id,
      period_start: isoDate(start),
      period_end: isoDate(end),
      group_name: `${c.name} Labour Supporters`,
      post_count: groupOk ? noisy(5 * profile.baseline * mult) : null,
      source: "manual",
      has_data: groupOk,
    });

    const newsletterOk = hasData(weeksAgo, forceNewsletterGap);
    const sendCount = newsletterOk ? (weeksAgo % 2 === 0 || rand() < 0.3 ? 1 : 0) : null;
    newsletterRows.push({
      constituency_id: c.id,
      period_start: isoDate(start),
      period_end: isoDate(end),
      send_count: sendCount,
      subscriber_count: newsletterOk
        ? Math.round((1500 + cIndex * 200) * profile.baseline * (1 + (7 - weeksAgo) * 0.01))
        : null,
      source: "manual",
      has_data: newsletterOk,
    });
  });
});

console.log(`Seeding ${organicRows.length} organic post rows...`);
await sql`insert into organic_posts ${sql(
  organicRows,
  "constituency_id",
  "platform_id",
  "period_start",
  "period_end",
  "post_count",
  "source",
  "has_data"
)}`;

console.log(`Seeding ${adSpendRows.length} ad spend rows...`);
await sql`insert into ad_spend ${sql(
  adSpendRows,
  "constituency_id",
  "platform_id",
  "period_start",
  "period_end",
  "amount_spent",
  "target_amount",
  "source",
  "has_data"
)}`;

console.log(`Seeding ${groupRows.length} Facebook group activity rows...`);
await sql`insert into facebook_group_activity ${sql(
  groupRows,
  "constituency_id",
  "period_start",
  "period_end",
  "group_name",
  "post_count",
  "source",
  "has_data"
)}`;

console.log(`Seeding ${newsletterRows.length} newsletter rows...`);
await sql`insert into newsletter_sends ${sql(
  newsletterRows,
  "constituency_id",
  "period_start",
  "period_end",
  "send_count",
  "subscriber_count",
  "source",
  "has_data"
)}`;

console.log("Done.");
await sql.end();
