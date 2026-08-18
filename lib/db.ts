import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

// Local prototype database. This stands in for the real Supabase/Postgres
// database (see supabase/migrations/0001_init.sql) until we're ready to
// deploy and need multi-user login. Same shape, different engine.
// Resolved relative to this file (not process.cwd()) so it works no matter
// what directory the dev server was launched from.
const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(projectRoot, "data", "dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  create table if not exists constituencies (
    id text primary key,
    name text not null unique,
    mp_or_candidate_name text,
    region text not null,
    cohort text,
    is_pilot integer not null default 0,
    hex_id text,
    created_at text not null default (datetime('now'))
  );
`);

seedIfEmpty();

function seedIfEmpty() {
  const { count } = db
    .prepare("select count(*) as count from constituencies")
    .get() as { count: number };
  if (count > 0) return;

  const sample: Array<Omit<Constituency, "id" | "cohort" | "hex_id" | "created_at">> = [
    { name: "Holborn and St Pancras", mp_or_candidate_name: "Sample MP", region: "London", is_pilot: 1 },
    { name: "Islington North", mp_or_candidate_name: "Sample MP", region: "London", is_pilot: 1 },
    { name: "Leeds South", mp_or_candidate_name: "Sample MP", region: "Yorkshire and The Humber", is_pilot: 1 },
    { name: "Manchester Central", mp_or_candidate_name: "Sample MP", region: "North West", is_pilot: 1 },
    { name: "Cardiff South and Penarth", mp_or_candidate_name: "Sample MP", region: "Wales", is_pilot: 1 },
    { name: "Edinburgh South", mp_or_candidate_name: "Sample MP", region: "Scotland", is_pilot: 1 },
    { name: "Belfast West", mp_or_candidate_name: "Sample candidate", region: "Northern Ireland", is_pilot: 1 },
    { name: "Bristol Central", mp_or_candidate_name: "Sample MP", region: "South West", is_pilot: 1 },
  ];

  const insert = db.prepare(`
    insert into constituencies (id, name, mp_or_candidate_name, region, is_pilot)
    values (@id, @name, @mp_or_candidate_name, @region, @is_pilot)
  `);
  const insertAll = db.transaction((rows: typeof sample) => {
    for (const row of rows) insert.run({ id: randomUUID(), ...row });
  });
  insertAll(sample);
}

export type Constituency = {
  id: string;
  name: string;
  mp_or_candidate_name: string | null;
  region: string;
  cohort: string | null;
  is_pilot: number;
  hex_id: string | null;
  created_at: string;
};

export type ConstituencyInput = {
  name: string;
  mpOrCandidateName: string | null;
  region: string;
  isPilot: boolean;
};

export function listConstituencies(): Constituency[] {
  return db
    .prepare("select * from constituencies order by name asc")
    .all() as Constituency[];
}

export function getConstituency(id: string): Constituency | undefined {
  return db
    .prepare("select * from constituencies where id = ?")
    .get(id) as Constituency | undefined;
}

export function createConstituency(input: ConstituencyInput): string {
  const id = randomUUID();
  db.prepare(
    `insert into constituencies (id, name, mp_or_candidate_name, region, is_pilot)
     values (?, ?, ?, ?, ?)`
  ).run(id, input.name, input.mpOrCandidateName, input.region, input.isPilot ? 1 : 0);
  return id;
}

export function updateConstituency(id: string, input: ConstituencyInput): void {
  db.prepare(
    `update constituencies
     set name = ?, mp_or_candidate_name = ?, region = ?, is_pilot = ?
     where id = ?`
  ).run(input.name, input.mpOrCandidateName, input.region, input.isPilot ? 1 : 0, id);
}

export function deleteConstituency(id: string): void {
  db.prepare("delete from constituencies where id = ?").run(id);
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Database.SqliteError &&
    error.code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}
