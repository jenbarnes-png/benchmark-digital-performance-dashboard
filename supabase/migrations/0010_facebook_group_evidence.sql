-- Link to the post + a screenshot, so Jen/Alex can actually see what
-- they're approving instead of trusting a bare number. Screenshot is
-- stored directly in Postgres (bytea) rather than an object store —
-- there's no Supabase Storage configured for this project, and volume
-- here is low (one small image per constituency per week).
alter table facebook_group_activity
  add column if not exists post_url text,
  add column if not exists screenshot_data bytea,
  add column if not exists screenshot_content_type text;
