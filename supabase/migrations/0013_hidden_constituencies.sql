-- Lets a constituency be taken off every public view (rankings, hex map,
-- detail pages, national tops) without deleting anything. Syncs keep
-- running for hidden seats so un-hiding later shows current data.
alter table public.constituencies add column if not exists is_hidden boolean not null default false;
