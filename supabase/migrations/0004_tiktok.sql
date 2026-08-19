-- TikTok public account tracking. Deliberately different from the Meta
-- tables in one respect: no compliant automated data path currently
-- exists for this (TikTok's own APIs require the tracked account's own
-- login or are restricted to non-profit academic researchers; every
-- third-party vendor investigated either has that same self-auth
-- requirement or operates via unauthorized scraping). `source` defaults
-- to 'manual' — a person reading a public profile and typing numbers in
-- isn't covered by TikTok's automated-extraction restrictions. Kept the
-- same shape as the Meta tables regardless, so an automated source
-- could slot in later without restructuring if that ever changes.

-- One row per known TikTok account, resolved once per constituency.
create table if not exists tiktok_accounts (
  id uuid primary key default gen_random_uuid(),
  constituency_id uuid not null references constituencies(id),
  username text not null,
  profile_url text,
  is_active boolean not null default true,
  follower_count integer,
  follower_count_updated_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  last_refreshed_at timestamptz,
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  unique (username)
);

-- One row per video. video_url is the natural thing a person enters by
-- hand, so it's the dedupe key; external_video_id is an optional
-- convenience field when it's cleanly extractable from the URL.
create table if not exists tiktok_videos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references tiktok_accounts(id),
  video_url text not null unique,
  external_video_id text,
  posted_at timestamptz not null,
  view_count integer,
  like_count integer,
  comment_count integer,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  first_seen_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
