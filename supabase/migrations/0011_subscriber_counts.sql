-- Monthly subscriber-count manual reporting, same approval-gated
-- pattern as facebook_group_activity — see lib/subscriberCounts.ts.
-- Monthly rather than weekly, since "grew the list by 20+" is judged
-- month over month.
create table if not exists subscriber_counts (
  id uuid primary key default gen_random_uuid(),
  constituency_id uuid not null references constituencies(id),
  month_start date not null,
  month_end date not null,
  subscriber_count integer,
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  has_data boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approval_token uuid not null default gen_random_uuid(),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists subscriber_counts_constituency_month_idx
  on subscriber_counts (constituency_id, month_start);

create unique index if not exists subscriber_counts_approval_token_idx
  on subscriber_counts (approval_token);
