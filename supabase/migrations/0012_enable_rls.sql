-- Supabase flags every public-schema table without Row Level Security
-- as a critical finding, because Supabase exposes each one through its
-- own separate web API (PostgREST) in addition to however the app
-- itself talks to Postgres. This app never uses that API — it connects
-- directly with a private DATABASE_URL connection string that bypasses
-- RLS entirely (the connecting role has BYPASSRLS), so none of this
-- changes how the app behaves. It only closes that separate, unused
-- door: with RLS on and no write policy, PostgREST's anon/authenticated
-- roles can no longer read or write anything unless a policy says so.
--
-- Every table here holds public campaign-tracking data (see
-- lib/tiktokSheet.ts's "same public-data posture" comment), so each
-- gets a read-only policy: anyone can read, nobody can write via
-- PostgREST. The one exception is `users` — empty, unreferenced
-- anywhere in the app, and its purpose is unclear enough (name alone
-- suggests it could end up holding auth data) that it gets RLS with no
-- policy at all, i.e. fully locked down via PostgREST until someone
-- deliberately decides what it's for.

alter table public.ad_snapshots enable row level security;
alter table public.ad_spend enable row level security;
alter table public.ads enable row level security;
alter table public.advertisers enable row level security;
alter table public.constituencies enable row level security;
alter table public.facebook_group_activity enable row level security;
alter table public.meta_leadgen_snapshot enable row level security;
alter table public.newsletter_events enable row level security;
alter table public.newsletter_sends enable row level security;
alter table public.organic_posts enable row level security;
alter table public.platforms enable row level security;
alter table public.representatives enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_activity_daily enable row level security;
alter table public.subscriber_counts enable row level security;
alter table public.tiktok_accounts enable row level security;
alter table public.tiktok_videos enable row level security;
alter table public.users enable row level security;

drop policy if exists "public read" on public.ad_snapshots;
create policy "public read" on public.ad_snapshots for select using (true);

drop policy if exists "public read" on public.ad_spend;
create policy "public read" on public.ad_spend for select using (true);

drop policy if exists "public read" on public.ads;
create policy "public read" on public.ads for select using (true);

drop policy if exists "public read" on public.advertisers;
create policy "public read" on public.advertisers for select using (true);

drop policy if exists "public read" on public.constituencies;
create policy "public read" on public.constituencies for select using (true);

drop policy if exists "public read" on public.facebook_group_activity;
create policy "public read" on public.facebook_group_activity for select using (true);

drop policy if exists "public read" on public.meta_leadgen_snapshot;
create policy "public read" on public.meta_leadgen_snapshot for select using (true);

drop policy if exists "public read" on public.newsletter_events;
create policy "public read" on public.newsletter_events for select using (true);

drop policy if exists "public read" on public.newsletter_sends;
create policy "public read" on public.newsletter_sends for select using (true);

drop policy if exists "public read" on public.organic_posts;
create policy "public read" on public.organic_posts for select using (true);

drop policy if exists "public read" on public.platforms;
create policy "public read" on public.platforms for select using (true);

drop policy if exists "public read" on public.representatives;
create policy "public read" on public.representatives for select using (true);

drop policy if exists "public read" on public.social_accounts;
create policy "public read" on public.social_accounts for select using (true);

drop policy if exists "public read" on public.social_activity_daily;
create policy "public read" on public.social_activity_daily for select using (true);

drop policy if exists "public read" on public.subscriber_counts;
create policy "public read" on public.subscriber_counts for select using (true);

drop policy if exists "public read" on public.tiktok_accounts;
create policy "public read" on public.tiktok_accounts for select using (true);

drop policy if exists "public read" on public.tiktok_videos;
create policy "public read" on public.tiktok_videos for select using (true);

-- No policy for `users` — deliberately left fully locked down via PostgREST.
