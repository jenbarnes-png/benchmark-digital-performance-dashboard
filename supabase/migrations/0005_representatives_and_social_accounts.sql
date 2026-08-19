-- Explicit MP/candidate tenure history and a proper cross-platform
-- social account registry, replacing two things that couldn't scale:
-- constituencies.mp_or_candidate_name (a single overwritable text
-- field with no history) and the flat facebook_url/instagram_url/
-- tiktok_url/x_url columns (one URL per platform, tied to the seat
-- rather than to a specific person, so an MP change made "whose
-- account is this now?" genuinely ambiguous).

-- One row per person's tenure representing a constituency. A change of
-- MP means adding a new row with the old one's ended_at set, never
-- overwriting — same pattern already proven by advertisers.started_at
-- /ended_at. constituencies.mp_or_candidate_name stays as a
-- denormalized "current value" cache the app keeps in sync, so
-- existing reads of it are unaffected by this migration.
create table if not exists representatives (
  id uuid primary key default gen_random_uuid(),
  constituency_id uuid not null references constituencies(id),
  name text not null,
  role text not null default 'mp' check (role in ('mp', 'candidate')),
  party text,
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now()
);

-- Only one current (ended_at is null) representative per constituency.
create unique index if not exists representatives_one_current_per_constituency
  on representatives (constituency_id)
  where ended_at is null;

-- One row per platform account, linked to a representative's tenure
-- (not directly to the constituency) so an MP change doesn't silently
-- reassign their predecessor's accounts to the successor. Supports
-- more than one account per platform (e.g. personal + campaign).
-- follower_count/is_active/last_refreshed_at generalize cleanly across
-- every platform, not just TikTok, which is why tiktok_accounts folds
-- in here rather than staying a separate table.
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null references representatives(id),
  platform text not null check (platform in ('facebook', 'instagram', 'tiktok', 'x', 'youtube')),
  handle text,
  profile_url text,
  external_id text,
  is_primary boolean not null default true,
  follower_count integer,
  follower_count_updated_at timestamptz,
  is_active boolean not null default true,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  last_refreshed_at timestamptz,
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now()
);

-- Seed one representative per constituency that currently has a known
-- MP/candidate name. started_at is honestly set to when we started
-- tracking (constituencies.created_at) rather than a guessed election
-- date we haven't verified per seat.
insert into representatives (constituency_id, name, role, started_at)
select id, mp_or_candidate_name, 'mp', created_at::date
from constituencies
where mp_or_candidate_name is not null;

-- Migrate the flat URL columns into social_accounts, linked to the
-- representative row just created for that constituency.
insert into social_accounts (representative_id, platform, profile_url, started_at)
select r.id, 'facebook', c.facebook_url, r.started_at
from constituencies c
join representatives r on r.constituency_id = c.id and r.ended_at is null
where c.facebook_url is not null;

insert into social_accounts (representative_id, platform, profile_url, started_at)
select r.id, 'instagram', c.instagram_url, r.started_at
from constituencies c
join representatives r on r.constituency_id = c.id and r.ended_at is null
where c.instagram_url is not null;

insert into social_accounts (representative_id, platform, profile_url, started_at)
select r.id, 'tiktok', c.tiktok_url, r.started_at
from constituencies c
join representatives r on r.constituency_id = c.id and r.ended_at is null
where c.tiktok_url is not null;

insert into social_accounts (representative_id, platform, profile_url, started_at)
select r.id, 'x', c.x_url, r.started_at
from constituencies c
join representatives r on r.constituency_id = c.id and r.ended_at is null
where c.x_url is not null;

-- Migrate any existing tiktok_accounts rows (none exist yet in
-- practice — this table was created last session and never populated —
-- but written generically for correctness).
insert into social_accounts (
  representative_id, platform, handle, profile_url, follower_count,
  follower_count_updated_at, is_active, source, last_refreshed_at,
  started_at, ended_at, created_at
)
select r.id, 'tiktok', ta.username, ta.profile_url, ta.follower_count,
  ta.follower_count_updated_at, ta.is_active, ta.source, ta.last_refreshed_at,
  ta.started_at, ta.ended_at, ta.created_at
from tiktok_accounts ta
join representatives r on r.constituency_id = ta.constituency_id and r.ended_at is null;

-- Repoint tiktok_videos at the new social_accounts rows (matched via
-- the account's username, the only stable link available since the
-- freshly-inserted social_accounts rows don't share tiktok_accounts'
-- IDs), then drop the now-superseded table.
alter table tiktok_videos add column if not exists social_account_id uuid references social_accounts(id);

update tiktok_videos tv
set social_account_id = sa.id
from tiktok_accounts ta
join social_accounts sa on sa.handle = ta.username and sa.platform = 'tiktok'
where tv.account_id = ta.id;

alter table tiktok_videos drop column account_id;
alter table tiktok_videos rename column social_account_id to account_id;
alter table tiktok_videos alter column account_id set not null;

drop table if exists tiktok_accounts;

-- Drop the now-superseded flat URL columns.
alter table constituencies drop column if exists facebook_url;
alter table constituencies drop column if exists tiktok_url;
alter table constituencies drop column if exists instagram_url;
alter table constituencies drop column if exists x_url;

-- Widen advertisers to allow future ad platforms beyond Meta (Google/
-- YouTube ads were always the planned next integration).
alter table advertisers drop constraint if exists advertisers_platform_check;
alter table advertisers add constraint advertisers_platform_check check (platform in ('meta', 'google'));
