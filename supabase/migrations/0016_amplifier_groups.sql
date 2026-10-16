-- Amplifier groups: a small group chat of supporters who amplify an MP's posts.
-- Reported by hand each week with a screenshot, approved before it counts
-- (same pattern as facebook_group_activity). See lib/amplifierGroups.ts.
create table if not exists amplifier_group_reports (
  id uuid primary key default gen_random_uuid(),
  constituency_id uuid not null references constituencies(id),
  period_start date not null,
  period_end date not null,
  member_count integer,
  post_count integer,
  notes text,
  screenshot_data bytea,
  screenshot_content_type text,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  has_data boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approval_token uuid not null default gen_random_uuid(),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists amplifier_group_reports_constituency_period_idx
  on amplifier_group_reports (constituency_id, period_start);
create unique index if not exists amplifier_group_reports_approval_token_idx
  on amplifier_group_reports (approval_token);

-- Screenshots of private group chats must not be readable through Supabase's own
-- public API. Row Level Security on with no policy = locked. The app itself connects
-- directly and is unaffected.
alter table public.amplifier_group_reports enable row level security;

-- Same reasoning for the Facebook Group screenshots: migration 0012 made that table
-- publicly readable, which exposed the uploaded screenshots too. Lock it down as well.
drop policy if exists "public read" on public.facebook_group_activity;
