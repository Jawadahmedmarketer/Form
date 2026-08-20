alter table public.agreements
  add column if not exists setup_fee_label text,
  add column if not exists monthly_fee_label text;
