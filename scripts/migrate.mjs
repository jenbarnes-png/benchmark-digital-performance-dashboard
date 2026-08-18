// Applies every .sql file in supabase/migrations, in order, inside a
// transaction. Run with: node --env-file=.env.local scripts/migrate.mjs
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const contents = readFileSync(path.join(migrationsDir, file), "utf8");
  console.log(`Applying ${file}...`);
  await sql.unsafe(contents);
}

console.log("Done.");
await sql.end();
