-- Migration: leave_settings_tables
-- Applied: 2026-08-10
-- New tables: no company-level leave *policy* configuration existed anywhere
-- (leave_balances only tracks per-employee running totals, not policy).
-- RLS-scoped the same way company_documents / payroll_settings already are.

-- General, company-wide leave rules (one row per company).
create table if not exists public.leave_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,

  leave_year_start_month integer not null default 1 check (leave_year_start_month between 1 and 12),
  min_notice_days integer not null default 1 check (min_notice_days >= 0),
  max_consecutive_days integer check (max_consecutive_days is null or max_consecutive_days >= 1),
  allow_negative_balance boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leave_settings enable row level security;

create policy "Owners can manage leave settings for their company"
  on public.leave_settings
  for all
  using (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()))
  with check (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()));

-- Per leave-type policy. leave_type values are kept identical to the
-- existing leave_requests_leave_type_check constraint so a policy always
-- maps to a real, requestable leave type.
create table if not exists public.leave_type_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_type text not null check (leave_type = any (array['Casual Leave', 'Sick Leave', 'Unpaid Leave'])),

  annual_allocation numeric check (annual_allocation is null or annual_allocation >= 0),
  carry_forward_enabled boolean not null default false,
  carry_forward_max numeric not null default 0 check (carry_forward_max >= 0),
  accrual_method text not null default 'annual' check (accrual_method in ('annual', 'monthly')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, leave_type)
);

alter table public.leave_type_policies enable row level security;

create policy "Owners can manage leave type policies for their company"
  on public.leave_type_policies
  for all
  using (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()))
  with check (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()));