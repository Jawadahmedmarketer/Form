alter table public.agreements
  add column if not exists ghl_sync_note text,
  add column if not exists ghl_document_destination text;

alter table public.agreements drop constraint if exists agreements_ghl_sync_status_check;
alter table public.agreements
  add constraint agreements_ghl_sync_status_check
  check (
    ghl_sync_status is null
    or ghl_sync_status in ('pending', 'synced', 'failed', 'skipped', 'partial')
  );
