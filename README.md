# Digital Performance Dashboard

A campaign hub for Labour MPs and candidates to see all of their digital
campaign activity in one place: ad spend, organic posting, Facebook group
activity, and newsletter sends, compared across constituencies.

## Status

This is an early scaffold. The four main pages exist as placeholders with
no live data yet:

- `/` — National Dashboard (hexmap)
- `/rankings` — Rankings (sortable table / league tables)
- `/constituency/[slug]` — Constituency Detail
- `/admin` — Admin / Data Entry

The database schema is defined in `supabase/migrations/0001_init.sql` but
is not yet connected to a running database — that's the next step.

## Running it locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS) — pages and app logic
- **Supabase** (Postgres) — database, once connected
- **Vercel** — hosting, once deployed
