-- Migration: company_documents_table
-- Applied: 2026-08-09
-- New table: no equivalent existed anywhere in the schema.
-- Mirrors the RLS pattern already used on payslips / report_activity
-- (company_id scoped to the authenticated owner's company).

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_type text not null check (doc_type = any (array[
    'gst_certificate', 'pan_card', 'pf_registration',
    'esi_registration', 'incorporation_certificate', 'other'
  ])),
  file_name text not null,
  storage_path text not null,
  file_size_bytes integer,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.company_documents enable row level security;

create policy "Owners can manage documents for their company"
  on public.company_documents
  for all
  using (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()))
  with check (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()));