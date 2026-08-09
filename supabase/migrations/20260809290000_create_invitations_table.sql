-- Migration: create_invitations_table
-- Applied live to project midfufnnwdelvnpzscep on 2026-08-09
-- Context: HRBharat Users & Access page

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'employee',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '7 days'),
  accepted_at timestamptz
);

-- Only one live pending invite per email per company (handles the "duplicate invitation" rule)
CREATE UNIQUE INDEX IF NOT EXISTS invitations_unique_pending_email
  ON public.invitations (company_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS invitations_company_id_idx ON public.invitations (company_id);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_idx ON public.invitations (token);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Same convention already used on system_audit_logs: company owners manage their own company's rows
CREATE POLICY "Company owners can manage invitations for their company"
  ON public.invitations
  FOR ALL
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));