-- Migration: security_summary_functions
-- Applied live to project midfufnnwdelvnpzscep on 2026-08-09
-- Context: HRBharat Users & Access — Security tab.
--
-- `auth.*` tables are never exposed to the client directly — these are narrow,
-- SECURITY DEFINER functions that return only safe aggregates/fields, and each
-- one verifies the caller is actually the owner of the company they're asking
-- about before returning anything (not just relying on the input parameter).

-- 1. Per-user last-active timestamp, sourced from auth.sessions (real login activity,
--    not app-tracked). Closes the "Last Active" gap flagged in the Users tab.
--    Owner-only: this surfaces other people's activity, which regular members shouldn't see.
CREATE OR REPLACE FUNCTION public.get_last_active_for_company(p_company_id uuid)
RETURNS TABLE (user_id uuid, last_active timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.companies WHERE id = p_company_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized for this company';
  END IF;

  RETURN QUERY
  SELECT s.user_id, MAX(s.refreshed_at)::timestamptz AS last_active
  FROM auth.sessions s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE p.company_id = p_company_id::text
  GROUP BY s.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_last_active_for_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_last_active_for_company(uuid) TO authenticated;

-- 2. Security summary aggregate: active sessions + MFA-enabled users for a company.
--    Counts only, no per-user detail, but still owner-gated for consistency.
CREATE OR REPLACE FUNCTION public.get_security_summary(p_company_id uuid)
RETURNS TABLE (active_sessions bigint, mfa_enabled_users bigint, total_users bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.companies WHERE id = p_company_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized for this company';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(DISTINCT s.user_id)
     FROM auth.sessions s
     JOIN public.profiles p ON p.id = s.user_id
     WHERE p.company_id = p_company_id::text AND s.not_after > now()) AS active_sessions,
    (SELECT count(DISTINCT mf.user_id)
     FROM auth.mfa_factors mf
     JOIN public.profiles p ON p.id = mf.user_id
     WHERE p.company_id = p_company_id::text AND mf.status = 'verified') AS mfa_enabled_users,
    (SELECT count(*) FROM public.profiles WHERE company_id = p_company_id::text) AS total_users;
END;
$$;

REVOKE ALL ON FUNCTION public.get_security_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_security_summary(uuid) TO authenticated;