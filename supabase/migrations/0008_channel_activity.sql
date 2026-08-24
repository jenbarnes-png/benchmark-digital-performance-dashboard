-- Facebook/Instagram organic activity, newsletter sends, and lead-gen
-- ad status, sourced from Hani's "MP Packages | Data Warehouse" sheet
-- (same public-data posture as the TikTok warehouse — an internal
-- Brandwatch-backed pipeline, not something we scrape ourselves).

-- One row per representative per platform per day — mirrors the
-- sheet's daily grain directly rather than pre-aggregating, so weekly
-- (or any other window) rollups can be computed later without losing
-- information. video_count is Facebook-only in the source (a "Videos"
-- column distinct from "Reels"); left null for Instagram rows.
create table if not exists social_activity_daily (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null references representatives(id),
  platform text not null check (platform in ('facebook', 'instagram')),
  date date not null,
  post_count integer not null default 0,
  reel_count integer not null default 0,
  video_count integer,
  reach integer,
  top_post_url text,
  top_post_text text,
  top_post_reach integer,
  top_post_engagement integer,
  source text not null default 'automatic' check (source in ('manual', 'automatic')),
  created_at timestamptz not null default now(),
  unique (representative_id, platform, date)
);

-- One row per newsletter email detected (via Gmail inbox monitoring
-- on Hani's end) — external_message_id is the natural dedupe key.
create table if not exists newsletter_events (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null references representatives(id),
  received_at timestamptz not null,
  subject text,
  sender text,
  external_message_id text not null unique,
  source text not null default 'automatic' check (source in ('manual', 'automatic')),
  created_at timestamptz not null default now()
);

-- Current lead-generation ad status per representative — a snapshot
-- (upserted in place), not a time series, matching what the source
-- sheet itself provides. Separate from the ads/ad_spend tables, which
-- track the broader Meta Ad Library political-ad activity already
-- synced from our own token; this is specifically the "one Lead
-- Generation ad" signal from the Dream Week benchmark, which the
-- public Ad Library can't distinguish by campaign objective.
create table if not exists meta_leadgen_snapshot (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null references representatives(id) unique,
  leads_active boolean not null default false,
  reach_active boolean not null default false,
  spend_mtd numeric(10, 2),
  reach integer,
  leads integer,
  campaigns integer,
  top_campaign text,
  top_campaign_reach integer,
  last_updated_at timestamptz,
  source text not null default 'automatic' check (source in ('manual', 'automatic')),
  created_at timestamptz not null default now()
);
