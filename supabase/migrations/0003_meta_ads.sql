-- Meta Ad Library integration: tracks which Facebook Pages belong to
-- which constituency, the individual political ads we've found for
-- them, and periodic spend/impressions snapshots (Meta reports an ad's
-- running total, not a per-week figure, so we derive "spend this week"
-- ourselves by diffing consecutive snapshots).

-- A Page ID permanently linked to a constituency. Resolved once (from
-- constituencies.facebook_url) and reused on every future sync, rather
-- than searching by name each time. A constituency can have more than
-- one advertiser (e.g. an MP's page and a local party page); an MP
-- change is handled by ending one row and starting a new one, not by
-- overwriting history.
create table if not exists advertisers (
  id uuid primary key default gen_random_uuid(),
  constituency_id uuid not null references constituencies(id),
  platform text not null default 'meta' check (platform in ('meta')),
  external_page_id text not null,
  page_name text,
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  unique (platform, external_page_id)
);

-- One row per political ad we've found via the Ad Library API.
-- external_ad_id is Meta's own permanent Ad Library ID — re-fetching
-- the same ad on a later sync updates this row rather than duplicating
-- it. Holds only the latest known values; see ad_snapshots for history.
create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references advertisers(id),
  external_ad_id text not null unique,
  ad_creative_body text,
  ad_creative_link_title text,
  ad_snapshot_url text,
  page_name text,
  currency text,
  spend_min numeric,
  spend_max numeric,
  impressions_min numeric,
  impressions_max numeric,
  publisher_platforms text[],
  ad_delivery_start_time timestamptz,
  ad_delivery_stop_time timestamptz,
  is_active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  raw_json jsonb,
  created_at timestamptz not null default now()
);

-- A timestamped snapshot of each ad's cumulative spend/impressions at
-- the moment of a sync. Comparing consecutive snapshots is how we work
-- out how much was actually spent in a given week.
create table if not exists ad_snapshots (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references ads(id),
  snapshot_date date not null default current_date,
  spend_min numeric,
  spend_max numeric,
  impressions_min numeric,
  impressions_max numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (ad_id, snapshot_date)
);
