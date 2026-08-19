-- The automated TikTok sync needs to upsert (re-run safely without
-- duplicating rows), which requires something to conflict on.
-- representative_id + platform + handle is the natural key — one
-- person can have more than one account per platform (personal +
-- campaign), but not two rows for the *same* handle. Existing
-- manually-entered rows with a null handle are unaffected: Postgres
-- treats NULLs as distinct in unique constraints, so they never
-- collide with each other or with this.
alter table social_accounts
  add constraint social_accounts_representative_platform_handle_unique
  unique (representative_id, platform, handle);
