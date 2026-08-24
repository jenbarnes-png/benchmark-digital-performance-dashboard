-- Facebook Group manual reporting now needs sign-off from Jen/Alex
-- before it counts — see lib/facebookGroupActivity.ts. New submissions
-- land as 'pending' (has_data stays false, so nothing changes on the
-- tracker until approved); approving flips status + has_data together.
-- Existing rows default to 'approved' since they already counted under
-- the old no-approval behaviour.
alter table facebook_group_activity
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists approval_token uuid not null default gen_random_uuid(),
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

create unique index if not exists facebook_group_activity_approval_token_idx
  on facebook_group_activity (approval_token);

-- Needed for upsert-by-week (on conflict (constituency_id, period_start)) —
-- the table had no such constraint before this manual-entry form existed.
create unique index if not exists facebook_group_activity_constituency_period_idx
  on facebook_group_activity (constituency_id, period_start);
