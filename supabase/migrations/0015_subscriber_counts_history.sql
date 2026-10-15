-- Subscriber counts are now logged as they change, so there can be several
-- counts for the same constituency and month. The first one is the baseline
-- and later ones show growth. Each is its own approved/pending record.
drop index if exists public.subscriber_counts_constituency_month_idx;
create index if not exists subscriber_counts_constituency_month_idx
  on public.subscriber_counts (constituency_id, month_start, created_at);
