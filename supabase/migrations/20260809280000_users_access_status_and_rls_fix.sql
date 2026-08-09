-- Migration: users_access_status_and_rls_fix
-- Applied live to project midfufnnwdelvnpzscep on 2026-08-09
-- Context: HRBharat Users & Access page

-- 1. Add a real status column so Active/Pending/Disabled can be tracked
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'invited', 'disabled'));

-- 2. Security-definer helper to read the caller's own company_id without recursive RLS evaluation
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. FIX: profiles were readable by ANY authenticated user across ALL companies.
--    Scope visibility to the caller's own company (or their own row).
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Company members can view profiles in their company"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR company_id = public.current_company_id()
  );

-- 4. New: company owners can manage (update) profiles that belong to their company
--    (needed for the "change role" / "disable user" actions in Users & Access)
DROP POLICY IF EXISTS "Company owners can manage profiles in their company" ON public.profiles;

CREATE POLICY "Company owners can manage profiles in their company"
  ON public.profiles
  FOR UPDATE
  USING (
    company_id::uuid IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    company_id::uuid IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  );

-- 5. FIX: the pre-existing "Users can manage their own profile metadata" (ALL, auth.uid() = id)
--    policy technically allowed a user to change their OWN role. Block that server-side,
--    regardless of which policy path the update comes through.
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() = OLD.id THEN
    RAISE EXCEPTION 'You cannot change your own role.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_change ON public.profiles;

CREATE TRIGGER trg_prevent_self_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_change();