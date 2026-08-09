-- Migration: fix_payslips_payroll_fk_and_rls
-- Applied directly to the live Supabase project (midfufnnwdelvnpzscep) on 2026-08-09.
-- Save this in your repo's migrations folder (e.g. supabase/migrations/) to keep
-- version control in sync with what's actually live in the database.

-- ─────────────────────────────────────────────────────────────────
-- 1. Repoint payslips.payroll_id at the real payroll table.
--    It previously referenced the orphaned `payroll` table (1 row,
--    nothing in the app writes to it). The live Payroll page reads/
--    writes `payroll_ledger` exclusively, so that's what a payslip
--    needs to link back to.
-- ─────────────────────────────────────────────────────────────────
alter table public.payslips drop constraint payslips_payroll_id_fkey;

alter table public.payslips
  add constraint payslips_payroll_id_fkey
  foreign key (payroll_id) references public.payroll_ledger(id);

-- ─────────────────────────────────────────────────────────────────
-- 2. Add the missing RLS policy on payslips.
--    payslips had row-level security ENABLED but zero policies,
--    meaning it was unreadable and unwritable by anyone — including
--    the company owner — via the anon/authenticated client. Mirrors
--    the existing policy already in place on payroll_ledger.
-- ─────────────────────────────────────────────────────────────────
create policy "Owners can manage payslips for their company"
  on public.payslips
  for all
  using (
    company_id in (
      select companies.id
      from companies
      where companies.owner_id = auth.uid()
    )
  );