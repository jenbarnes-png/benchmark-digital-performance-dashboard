-- The lead-gen ad snapshot was fed only by the previous data supplier's sheet,
-- which has been retired. Nothing reads or writes it any more.
drop table if exists public.meta_leadgen_snapshot;
