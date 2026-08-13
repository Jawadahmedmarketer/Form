alter table public.agreements
  add column if not exists ghl_draft_document_id text,
  add column if not exists ghl_signed_document_id text;
