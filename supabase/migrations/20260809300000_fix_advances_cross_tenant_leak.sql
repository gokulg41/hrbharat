-- Migration: fix_advances_cross_tenant_leak
-- Applied live to project midfufnnwdelvnpzscep on 2026-08-09
-- Context: found while auditing RLS after building Users & Access page.
-- "advances" had a blanket policy (qual = true) letting ANY authenticated user
-- read/write/delete ANY company's salary advance records. Replaced with the same
-- owner + employee-self-service pattern used consistently elsewhere in this schema.

DROP POLICY IF EXISTS "Allow authenticated users access" ON public.advances;

-- Company owners can fully manage advances for employees in their own company
CREATE POLICY "Owners can manage advances for their company"
  ON public.advances
  FOR ALL
  USING (
    employee_id IN (
      SELECT e.id FROM public.employees e
      JOIN public.companies c ON c.id = e.company_id
      WHERE c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT e.id FROM public.employees e
      JOIN public.companies c ON c.id = e.company_id
      WHERE c.owner_id = auth.uid()
    )
  );

-- Employees can view and create their own advance requests
CREATE POLICY "Employees can manage their own advances"
  ON public.advances
  FOR ALL
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  );