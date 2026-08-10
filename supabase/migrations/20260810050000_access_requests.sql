-- Migration: access_requests
-- Applied live to project midfufnnwdelvnpzscep on 2026-08-09
-- Context: HRBharat Users & Access — Access Requests tab.
--
-- Scope assumption (flagging, not silently deciding): this covers an EXISTING company
-- member requesting a role/access change, not an external person requesting to join a
-- company they're not part of yet — that's a different flow (closer to the invite
-- system in reverse) and would need its own entry point outside this admin panel.

CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requested_role text NOT NULL DEFAULT 'employee',
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS access_requests_company_id_idx ON public.access_requests (company_id);
CREATE INDEX IF NOT EXISTS access_requests_requester_id_idx ON public.access_requests (requester_id);

-- Only one live pending request per requester (avoid spam/duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS access_requests_unique_pending_requester
  ON public.access_requests (requester_id)
  WHERE status = 'pending';

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Requesters can see their own requests; company owners can see all requests for their company
CREATE POLICY "Requesters and owners can view access requests"
  ON public.access_requests FOR SELECT
  USING (
    requester_id = auth.uid()
    OR company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  );

-- Any member of a company can request access/role changes for themselves, scoped to their own company
CREATE POLICY "Members can request access for their own company"
  ON public.access_requests FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
    AND company_id::text = public.current_company_id()
  );

-- Only the company owner can approve/reject (update status)
CREATE POLICY "Owners can review access requests for their company"
  ON public.access_requests FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));

-- Owners can also delete/clean up requests for their company
CREATE POLICY "Owners can delete access requests for their company"
  ON public.access_requests FOR DELETE
  USING (company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()));