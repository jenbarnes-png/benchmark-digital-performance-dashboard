-- Digital Performance Dashboard: initial schema
-- One row per constituency, with four activity tables hanging off it.
-- Every activity row carries `source` (manual vs automatic) and `has_data`
-- (false = known gap, distinct from a genuine zero) so the dashboard can
-- tell "no activity" apart from "no data collected yet".

create extension if not exists pgcrypto;

-- The 650 UK constituencies (20 for the pilot). `region` holds either an
-- English region (e.g. 'London') or a nation (e.g. 'Scotland', 'Wales',
-- 'Northern Ireland'), matching how ONS/Parliament classify seats.
create table constituencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  region text not null,
  cohort text, -- e.g. 'target', 'marginal', 'safe'
  mp_or_candidate_name text,
  is_pilot boolean not null default false,
  hex_id text, -- reference code matching the public hexmap dataset
  created_at timestamptz not null default now()
);

-- People who log in: MP team members, regional directors, HQ admins.
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null check (role in ('mp_team', 'regional_director', 'hq_admin')),
  constituency_id uuid references constituencies(id), -- null for regional/HQ roles
  created_at timestamptz not null default now()
);

-- Reference list of platforms tracked (Facebook, Instagram, X, TikTok, ...).
create table platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Ad spend by platform against centrally set targets.
create table ad_spend (
  id uuid primary key default gen_random_uuid(),
  constituency_id uuid not null references constituencies(id),
  platform_id uuid not null references platforms(id),
  period_start date not null,
  period_end date not null,
  amount_spent numeric(10, 2),
  target_amount numeric(10, 2),
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  has_data boolean not null default true,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (constituency_id, platform_id, period_start)
);

-- Organic posting activity by platform.
create table organic_posts (
  id uuid primary key default gen_random_uuid(),
  constituency_id uuid not null references constituencies(id),
  platform_id uuid not null references platforms(id),
  period_start date not null,
  period_end date not null,
  post_count integer,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  has_data boolean not null default true,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (constituency_id, platform_id, period_start)
);

-- Activity in local Facebook community groups (usually no account access,
-- so this is expected to stay manually logged for the foreseeable future).
create table facebook_group_activity (
  id uuid primary key default gen_random_uuid(),
  constituency_id uuid not null references constituencies(id),
  period_start date not null,
  period_end date not null,
  group_name text,
  post_count integer,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  has_data boolean not null default true,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- Newsletter send frequency.
create table newsletter_sends (
  id uuid primary key default gen_random_uuid(),
  constituency_id uuid not null references constituencies(id),
  period_start date not null,
  period_end date not null,
  send_count integer,
  subscriber_count integer,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  has_data boolean not null default true,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (constituency_id, period_start)
);
