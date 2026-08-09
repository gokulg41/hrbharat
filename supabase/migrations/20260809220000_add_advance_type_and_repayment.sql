-- Migration: add advance type + repayment tracking to advance_salary_requests
-- Table already exists with 1 live row — this only ADDS columns, nothing is dropped or renamed.
-- Review before running. I don't have visibility into your RLS policies, so this migration
-- does not touch RLS — the new columns inherit whatever row-level policies you already have
-- on this table.

alter table advance_salary_requests
  add column if not exists type text not null default 'salary',
  add column if not exists repayment_monthly numeric,
  add column if not exists repayment_total_installments integer,
  add column if not exists repayment_paid_installments integer not null default 0,
  add column if not exists balance_remaining numeric,
  add column if not exists repaid_on timestamptz;

-- Loosely constrain `type` going forward. Not touching `status` — its existing default is
-- lowercase 'pending' but your one live row is 'Approved' (capitalized), so something in
-- your app already writes mixed casing. Adding a check constraint on status here could break
-- that existing insert path, so status is left exactly as-is; the frontend normalizes case
-- instead of the database enforcing it.
alter table advance_salary_requests
  add constraint advance_salary_requests_type_check
  check (type in ('salary', 'medical', 'emergency', 'festival', 'other'));

-- Backfill the existing row(s): balance_remaining defaults to the full requested amount
-- since nothing has been marked as repaid against them yet. `type` defaults to 'salary'
-- above for the same existing rows — change manually if the real 1 row was actually a
-- different type.
update advance_salary_requests
set balance_remaining = requested_amount
where balance_remaining is null;