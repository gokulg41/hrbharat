-- Fix RLS: remove permissive USING(true) policies that allowed cross-tenant
-- access, replace with company-scoped owner policies and employee
-- self-service policies where employees genuinely need direct access.

-- ============================================================
-- employees: drop policies superseded by the owner-scoped policy
-- ============================================================
DROP POLICY IF EXISTS "Admins have absolute access based on auth claims" ON public.employees;
DROP POLICY IF EXISTS "Allow authenticated inserts to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow authenticated updates to employees" ON public.employees;
-- "Owners can manage employees belonging to their active company" already
-- covers select/insert/update/delete scoped to company_id — no replacement needed.

-- ============================================================
-- attendance: drop permissive policies, add employee self-service
-- ============================================================
DROP POLICY IF EXISTS "Allow individual employee read update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Trustworthy global access attendance" ON public.attendance;

CREATE POLICY "Employees can manage their own attendance"
  ON public.attendance
  USING (employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()));
-- "Owners can manage attendance data for their company" already exists and is kept as-is.

-- ============================================================
-- leave_requests: drop permissive policies, add employee self-service
-- ============================================================
DROP POLICY IF EXISTS "Allow individual employee read write leaves" ON public.leave_requests;
DROP POLICY IF EXISTS "Trustworthy global access leave" ON public.leave_requests;

CREATE POLICY "Employees can manage their own leave requests"
  ON public.leave_requests
  USING (employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()));
-- "Owners can manage leave requests data for their company" already exists and is kept as-is.

-- ============================================================
-- companies: replace unscoped SELECT with membership-scoped SELECT
-- ============================================================
DROP POLICY IF EXISTS "Allow users to view their own company" ON public.companies;

CREATE POLICY "Members can view their own company"
  ON public.companies
  FOR SELECT
  USING (
    id = ((SELECT profiles.company_id FROM public.profiles WHERE profiles.id = auth.uid()))::uuid
    OR owner_id = auth.uid()
  );
-- "Owners can fully manage their own companies" already covers full owner access.
-- "Allow public to register a company" (INSERT, WITH CHECK true) is left as-is —
-- required for public signup to create the first company row.

-- ============================================================
-- daily_tasks: replace blanket authenticated access with scoped access
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.daily_tasks;

CREATE POLICY "Owners can manage daily tasks for their company"
  ON public.daily_tasks
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE POLICY "Employees can manage their own daily tasks"
  ON public.daily_tasks
  USING (
    company_id IN (SELECT company_id FROM public.employees WHERE auth_user_id = auth.uid())
    AND employee_code IN (SELECT employee_code FROM public.employees WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.employees WHERE auth_user_id = auth.uid())
    AND employee_code IN (SELECT employee_code FROM public.employees WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- expense_claims: replace blanket authenticated access with scoped access
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.expense_claims;

CREATE POLICY "Owners can manage expense claims for their company"
  ON public.expense_claims
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE POLICY "Employees can manage their own expense claims"
  ON public.expense_claims
  USING (
    company_id IN (SELECT company_id FROM public.employees WHERE auth_user_id = auth.uid())
    AND employee_code IN (SELECT employee_code FROM public.employees WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.employees WHERE auth_user_id = auth.uid())
    AND employee_code IN (SELECT employee_code FROM public.employees WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- attendance_regularizations: replace blanket access with scoped access
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.attendance_regularizations;

CREATE POLICY "Owners can manage regularizations for their company"
  ON public.attendance_regularizations
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE POLICY "Employees can manage their own regularizations"
  ON public.attendance_regularizations
  USING (
    company_id IN (SELECT company_id FROM public.employees WHERE auth_user_id = auth.uid())
    AND employee_code IN (SELECT employee_code FROM public.employees WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.employees WHERE auth_user_id = auth.uid())
    AND employee_code IN (SELECT employee_code FROM public.employees WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- company_settings, company_shifts, payroll_ledger, system_audit_logs:
-- owner/admin-only — no employee self-service assumed for these.
-- Flag to Gokul if any of these should also allow employee read access.
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.company_settings;
CREATE POLICY "Owners can manage settings for their company"
  ON public.company_settings
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.company_shifts;
CREATE POLICY "Owners can manage shifts for their company"
  ON public.company_shifts
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE POLICY "Employees can view their assigned shift"
  ON public.company_shifts
  FOR SELECT
  USING (id IN (SELECT assigned_shift_id FROM public.employees WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.payroll_ledger;
CREATE POLICY "Owners can manage payroll ledger for their company"
  ON public.payroll_ledger
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- ============================================================
-- system_audit_logs: add actor_id so entries can be reliably tied to the
-- real actor, rather than matching on the free-text actor_name column.
-- ============================================================
ALTER TABLE public.system_audit_logs
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Best-effort backfill for existing rows: match actor_name to a profile's
-- full_name within the same company. Ambiguous or unmatched names (more
-- than one profile with the same name in that company, or no match at all)
-- are left NULL rather than guessed at.
UPDATE public.system_audit_logs sal
SET actor_id = matched.id
FROM (
  SELECT p.id, p.full_name, p.company_id
  FROM public.profiles p
  JOIN (
    SELECT full_name, company_id
    FROM public.profiles
    GROUP BY full_name, company_id
    HAVING COUNT(*) = 1
  ) uniq ON uniq.full_name = p.full_name AND uniq.company_id IS NOT DISTINCT FROM p.company_id
) matched
WHERE sal.actor_id IS NULL
  AND sal.actor_name = matched.full_name
  AND sal.company_id::text = matched.company_id;

DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.system_audit_logs;
CREATE POLICY "Owners can manage audit logs for their company"
  ON public.system_audit_logs
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

CREATE POLICY "Employees can view their own audit log entries"
  ON public.system_audit_logs
  FOR SELECT
  USING (actor_id = auth.uid());