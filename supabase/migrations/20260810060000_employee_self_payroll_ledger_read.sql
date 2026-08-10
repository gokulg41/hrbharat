-- ============================================================
-- payroll_ledger: add employee self-service read access.
--
-- Previously (20260809210000_fix_rls_policies.sql) payroll_ledger only had
-- "Owners can manage payroll ledger for their company" — meaning a logged-in
-- employee querying their own payroll history from the client (anon key,
-- RLS-enforced) got zero rows back, even though app/employee/page.tsx and
-- app/employee/payroll/page.tsx both query payroll_ledger scoped by
-- employee_code + company_id. This adds the missing self-read policy,
-- following the same auth_user_id -> employees join pattern already used
-- for "Employees can view their assigned shift" / "Employees can see their
-- own base contract profile".
-- ============================================================

CREATE POLICY "Employees can view their own payroll ledger rows"
  ON public.payroll_ledger
  FOR SELECT
  USING (
    employee_code IN (
      SELECT e.employee_code
      FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
    )
  );