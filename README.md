# Benchmark: Digital Campaign Manager

A campaign hub for Labour MPs and candidates to see all of their digital
campaign activity in one place: ad spend, organic posting, Facebook group
activity, and newsletter sends, compared across constituencies.

## Status

Live pages, backed by Supabase:

- `/` — National Dashboard (hex map, shaded by live Meta ad activity)
- `/rankings` — National leaderboard, sortable, filterable by region/cohort
- `/constituency/[id]` — Constituency Detail (score, rank, platform breakdown, ads)
- `/scoring` — How the ranking model works
- `/admin` — Constituency admin (see and edit MPs, regions, social links)

## Running it locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS) — pages and app logic
- **Supabase** (Postgres) — database
- **Meta Ad Library API** — live political ad tracking
