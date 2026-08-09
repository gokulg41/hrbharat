"-- leave_balances had RLS enabled with zero policies (same class of bug found
-- and fixed on payslips earlier) — unreadable/unwritable by anyone. Needed
-- for the Reports page's Leave Report. Mirrors the existing owner pattern.
create policy \"Owners can manage leave balances for their company\"
  on public.leave_balances
  for all
  using (company_id in (select id from public.companies where owner_id = auth.uid()));

-- No report/report-history table existed anywhere in the schema. Rather than
-- inventing a parallel data model for HR/payroll/attendance facts (Reports
-- reuses employees/attendance/leave_requests/leave_balances/payroll_ledger/
-- payslips directly), this adds the one thing genuinely missing: a real log
-- of when a report was generated or downloaded, so KPIs like \"Reports This
-- Month\" and \"Last Generated\" are real counts instead of fabricated numbers.
create table public.report_activity (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  report_key text not null,
  report_name text not null,
  action text not null check (action in ('generated', 'downloaded')),
  format text,
  created_at timestamptz not null default now()
);

alter table public.report_activity enable row level security;

create policy \"Owners can manage report activity for their company\"
  on public.report_activity
  for all
  using (company_id in (select id from public.companies where owner_id = auth.uid()));

-- Stores a schedule's *intent* (report type, frequency, format). No cron/
-- edge function exists in this codebase to actually execute it yet — the
-- Reports page is upfront about that gap rather than faking automated runs.
create table public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  report_key text not null,
  report_name text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  format text not null default 'CSV',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.report_schedules enable row level security;

create policy \"Owners can manage report schedules for their company\"
  on public.report_schedules
  for all
  using (company_id in (select id from public.companies where owner_id = auth.uid()));"
}