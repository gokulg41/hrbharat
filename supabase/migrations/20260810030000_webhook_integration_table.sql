-- Migration: webhook_integration_table
-- Applied: 2026-08-10
-- New table: no integration infrastructure existed anywhere in the schema
-- (no OAuth tokens table, no webhook config, no API key store).
-- This is the one integration genuinely buildable without a third-party
-- OAuth app or provider credentials: a generic outbound webhook the
-- company can point at their own systems.
-- Like notification_settings, this stores real config but does not fire
-- anything on its own — no backend trigger code exists in this project yet.

create table if not exists public.webhook_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,

  enabled boolean not null default false,
  endpoint_url text,
  signing_secret text not null default encode(gen_random_bytes(24), 'hex'),

  send_on_leave_request boolean not null default true,
  send_on_advance_request boolean not null default true,
  send_on_new_employee boolean not null default true,
  send_on_payroll_processed boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.webhook_integrations enable row level security;

create policy "Owners can manage webhook integration for their company"
  on public.webhook_integrations
  for all
  using (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()))
  with check (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()));