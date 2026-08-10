-- Migration: notification_settings_table
-- Applied: 2026-08-10
-- New table: no notification infrastructure existed anywhere in the schema
-- (no notifications table, no email/SMS provider config, no delivery log).
-- This stores real, persisted preferences. It does NOT send anything on its
-- own — there is no connected email/SMS provider in this project to wire it
-- to yet. RLS-scoped the same way the other settings tables already are.

create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,

  notify_leave_requests boolean not null default true,
  notify_advance_requests boolean not null default true,
  notify_new_employee boolean not null default true,
  notify_payroll_processed boolean not null default true,
  notify_attendance_anomalies boolean not null default false,
  notify_low_leave_balance boolean not null default false,
  weekly_summary_email boolean not null default false,

  email_channel_enabled boolean not null default true,
  notification_email text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

create policy "Owners can manage notification settings for their company"
  on public.notification_settings
  for all
  using (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()))
  with check (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()));