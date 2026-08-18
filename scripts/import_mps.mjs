// Replaces the fictional pilot constituencies with the real MPs the user
// wants to track (data/imports/mps_2026-08-18.json). Deliberately does
// NOT generate any sample activity data for them — fabricating ad spend
// or post counts for real, named politicians would misrepresent them.
// They start with no data, which is the honest state until real tracking
// begins.
//
// Run with: node --env-file=.env.local scripts/import_mps.mjs
import postgres from "postgres";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mps = JSON.parse(
  readFileSync(path.join(projectRoot, "data/imports/mps_2026-08-18.json"), "utf8")
);

const sql = postgres(process.env.DATABASE_URL);

console.log("Clearing existing constituencies and their activity data...");
await sql`delete from newsletter_sends`;
await sql`delete from facebook_group_activity`;
await sql`delete from organic_posts`;
await sql`delete from ad_spend`;
await sql`delete from constituencies`;

console.log(`Importing ${mps.length} MPs...`);
await sql`
  insert into constituencies ${sql(
    mps.map((mp) => ({
      name: mp.constituency,
      mp_or_candidate_name: mp.name,
      region: mp.region,
      is_pilot: true,
      facebook_url: mp.facebook_url,
      tiktok_url: mp.tiktok_url,
      instagram_url: mp.instagram_url,
      x_url: mp.x_url,
    })),
    "name",
    "mp_or_candidate_name",
    "region",
    "is_pilot",
    "facebook_url",
    "tiktok_url",
    "instagram_url",
    "x_url"
  )}
`;

console.log("Done.");
await sql.end();
