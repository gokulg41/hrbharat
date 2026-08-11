-- ============================================================
-- company_holidays: company-wide holiday calendar, used by the
-- employee "My Calendar" page (app/employee/calendar) to render
-- holiday markers alongside attendance and leave.
--
-- No holiday table existed anywhere in the schema before this, so this
-- introduces one rather than reusing/duplicating an existing table.
-- Follows the same owner-manage + employee-self-read RLS shape used by
-- company_shifts (see 20260809210000_fix_rls_policies.sql).
-- ============================================================

CREATE TABLE public.company_holidays (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (company_id, date)
);

CREATE INDEX company_holidays_company_id_date_idx
  ON public.company_holidays (company_id, date);

ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- Owners/admins manage their own company's holiday calendar.
CREATE POLICY "Owners can manage holidays for their company"
  ON public.company_holidays
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- Employees can read (not modify) the holidays for their own company.
CREATE POLICY "Employees can view their company holidays"
  ON public.company_holidays
  FOR SELECT
  USING (
    company_id IN (
      SELECT e.company_id FROM public.employees e WHERE e.auth_user_id = auth.uid()
    )
  );