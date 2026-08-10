-- Migration: roles_and_permissions
-- Applied live to project midfufnnwdelvnpzscep on 2026-08-09
-- Context: HRBharat Users & Access — Roles & Permissions tab.
--
-- Additive: `profiles.role` (free text: 'admin' / 'employee') stays exactly as-is and
-- remains the source of truth the rest of the app already reads. This adds a proper
-- management layer on top — named roles, a permission catalog, and role->permission
-- mappings — seeded so it matches current real behavior. Wiring actual page-level
-- enforcement to this new system is a separate follow-up (touches other pages/routes
-- this migration doesn't know about) — flagged, not silently done here.

-- 1. Static permission catalog, grouped by the modules already in the admin sidebar
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,          -- e.g. 'payroll.manage'
  label text NOT NULL,               -- e.g. 'Manage Payroll'
  category text NOT NULL,            -- e.g. 'Payroll' -- used for grouping in the UI
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Roles: company_id NULL = system default (Admin/Employee), shipped read-only.
--    company_id set = a custom role created by that company's owner.
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  slug text NOT NULL,                -- e.g. 'admin', 'hr-manager'
  name text NOT NULL,                -- e.g. 'HR Manager'
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_company_slug_unique
  ON public.roles (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

-- 3. Role <-> permission mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 4. Seed the permission catalog, matching the real admin nav sections in layout.tsx
INSERT INTO public.permissions (key, label, category, sort_order) VALUES
  ('dashboard.view',      'View Dashboard',           'Overview',      10),
  ('people.view',         'View Employees',           'People',        20),
  ('people.manage',       'Manage Employees',         'People',        21),
  ('attendance.view',     'View Attendance & Shifts',  'People',        22),
  ('attendance.manage',   'Manage Attendance & Shifts','People',        23),
  ('leave.view',          'View Leave',                'People',        24),
  ('leave.manage',        'Manage / Approve Leave',    'People',        25),
  ('advances.view',       'View Advances',             'People',        26),
  ('advances.manage',     'Manage / Approve Advances', 'People',        27),
  ('payroll.view',        'View Payroll',              'Payroll',       30),
  ('payroll.manage',      'Run / Manage Payroll',      'Payroll',       31),
  ('payslips.view',       'View Payslips',             'Payroll',       32),
  ('payslips.manage',     'Manage Payslips',           'Payroll',       33),
  ('reports.view',        'View Reports',              'Insights',      40),
  ('analytics.view',      'View Analytics',            'Insights',      41),
  ('company.view',        'View Company Settings',     'Settings',      50),
  ('company.manage',      'Manage Company Settings',   'Settings',      51),
  ('users_access.view',   'View Users & Access',       'Settings',      52),
  ('users_access.manage', 'Manage Users, Roles & Invites', 'Settings',  53),
  ('security.manage',     'Manage Security Settings',  'Settings',      54)
ON CONFLICT (key) DO NOTHING;

-- 5. Seed the two system roles that already exist in real data today
INSERT INTO public.roles (company_id, slug, name, description, is_system)
VALUES
  (NULL, 'admin', 'Admin', 'Full access to every module.', true),
  (NULL, 'employee', 'Employee', 'Minimal default access. Most companies grant more via a custom role.', true)
ON CONFLICT DO NOTHING;

-- Admin -> every permission
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.slug = 'admin' AND r.company_id IS NULL
ON CONFLICT DO NOTHING;

-- Employee -> dashboard only by default (matches current minimal real usage;
-- flagging this as an assumption since I haven't seen an employee-facing portal's code)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.slug = 'employee' AND r.company_id IS NULL AND p.key = 'dashboard.view'
ON CONFLICT DO NOTHING;

-- 6. RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Permission catalog is reference data — any authenticated user can read it
CREATE POLICY "Authenticated users can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

-- Roles: visible if it's a system role, or belongs to the caller's own company
CREATE POLICY "Users can view system roles and their own company's roles"
  ON public.roles FOR SELECT
  USING (
    is_system = true
    OR company_id::text = public.current_company_id()
  );

-- Only the company owner can create/update/delete roles for their own company,
-- and system roles can never be touched via the app
CREATE POLICY "Owners can manage custom roles for their company"
  ON public.roles FOR ALL
  USING (
    is_system = false
    AND company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    is_system = false
    AND company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  );

-- role_permissions follow the same visibility/ownership as their parent role
CREATE POLICY "Users can view permissions for roles they can see"
  ON public.role_permissions FOR SELECT
  USING (
    role_id IN (
      SELECT id FROM public.roles
      WHERE is_system = true OR company_id::text = public.current_company_id()
    )
  );

CREATE POLICY "Owners can manage permissions for their own custom roles"
  ON public.role_permissions FOR ALL
  USING (
    role_id IN (
      SELECT id FROM public.roles
      WHERE is_system = false
      AND company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
    )
  )
  WITH CHECK (
    role_id IN (
      SELECT id FROM public.roles
      WHERE is_system = false
      AND company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
    )
  );