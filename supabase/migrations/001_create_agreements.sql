-- Unified Tax Group Service Agreement schema
-- Apply in the Supabase SQL editor or via the CLI.

create extension if not exists pgcrypto;

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  public_token text unique not null,
  ghl_contact_id text,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'signed', 'cancelled', 'expired')),

  first_name text,
  last_name text,
  business_name text,
  email text,
  phone text,
  business_address text,
  tax_period text,
  agreement_date date,
  businesses_covered text,

  selected_services jsonb default '[]'::jsonb,
  other_service text,
  service_description text,
  service_start_date date,
  service_end_date text,

  setup_fee text,
  monthly_fee text,
  payment_schedule text,
  payment_method text,

  client_printed_name text,
  client_title text,
  client_signed_date date,
  client_signature_path text,

  representative_name text,
  representative_title text,
  representative_date date,
  representative_signature_path text,

  pdf_path text,
  pdf_filename text,

  signed_at timestamptz,
  signer_ip text,
  signer_user_agent text,
  document_fingerprint text,

  ghl_sync_status text default 'pending'
    check (ghl_sync_status in ('pending', 'synced', 'failed', 'skipped')),
  ghl_synced_at timestamptz,
  ghl_sync_error text,
  ghl_webhook_status text,

  field_locks jsonb not null default '{}'::jsonb,
  payment_url text,
  expires_at timestamptz,
  revoked_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  email_status text,
  email_sent_at timestamptz,
  email_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agreements_status_idx on public.agreements (status);
create index if not exists agreements_email_idx on public.agreements (email);
create index if not exists agreements_ghl_contact_id_idx on public.agreements (ghl_contact_id);
create index if not exists agreements_created_at_idx on public.agreements (created_at desc);

create or replace function public.set_agreements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agreements_set_updated_at on public.agreements;
create trigger agreements_set_updated_at
before update on public.agreements
for each row execute procedure public.set_agreements_updated_at();

alter table public.agreements enable row level security;
alter table public.agreements force row level security;

-- No anon/authenticated policies. All reads and writes go through Next.js
-- server routes using the service role, which bypasses RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'agreement-signatures',
    'agreement-signatures',
    false,
    5242880,
    array['image/png', 'image/jpeg']::text[]
  ),
  (
    'signed-agreements',
    'signed-agreements',
    false,
    20971520,
    array['application/pdf']::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage remains private. Do not add public SELECT policies.

grant select, insert, update, delete on table public.agreements to service_role;
