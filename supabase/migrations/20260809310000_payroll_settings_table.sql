-- Migration: payroll_settings_table
-- Applied: 2026-08-10
-- New table: no company-level payroll configuration existed anywhere.
-- One row per company, RLS-scoped the same way company_documents already is.

create table if not exists public.payroll_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,

  pay_cycle text not null default 'Monthly' check (pay_cycle in ('Monthly', 'Weekly', 'Bi-Weekly')),
  pay_day integer not null default 1 check (pay_day between 1 and 28),

  pf_enabled boolean not null default true,
  pf_employee_rate numeric not null default 12 check (pf_employee_rate between 0 and 100),
  pf_employer_rate numeric not null default 12 check (pf_employer_rate between 0 and 100),
  pf_wage_ceiling numeric not null default 15000 check (pf_wage_ceiling >= 0),

  esi_enabled boolean not null default true,
  esi_employee_rate numeric not null default 0.75 check (esi_employee_rate between 0 and 100),
  esi_employer_rate numeric not null default 3.25 check (esi_employer_rate between 0 and 100),
  esi_wage_ceiling numeric not null default 21000 check (esi_wage_ceiling >= 0),

  professional_tax_enabled boolean not null default true,
  professional_tax_amount numeric not null default 200 check (professional_tax_amount >= 0),

  overtime_enabled boolean not null default false,
  overtime_rate_multiplier numeric not null default 1.5 check (overtime_rate_multiplier >= 1),

  rounding_rule text not null default 'nearest_rupee' check (rounding_rule in ('nearest_rupee', 'nearest_ten', 'no_rounding')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payroll_settings enable row level security;

create policy "Owners can manage payroll settings for their company"
  on public.payroll_settings
  for all
  using (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()))
  with check (company_id in (select companies.id from public.companies where companies.owner_id = auth.uid()));