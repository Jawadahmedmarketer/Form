alter table public.agreements
  add column if not exists email_status text,
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text;
