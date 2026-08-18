-- Social media profile links for each constituency's MP/candidate.
-- Nullable: not every MP is on every platform.
alter table constituencies add column if not exists facebook_url text;
alter table constituencies add column if not exists tiktok_url text;
alter table constituencies add column if not exists instagram_url text;
alter table constituencies add column if not exists x_url text;
