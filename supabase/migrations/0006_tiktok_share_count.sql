-- share_count wasn't in the original hand-entry schema (0004) since a
-- person reading a public profile rarely bothers counting shares. The
-- automated TikTok data warehouse feed reports it directly, so it's
-- worth capturing now that a source provides it.
alter table tiktok_videos add column if not exists share_count integer;
