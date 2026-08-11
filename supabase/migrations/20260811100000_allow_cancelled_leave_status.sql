-- Allow employees to cancel their own pending leave requests from the new
-- "My Requests" page. The existing check constraint only allowed
-- Pending / Approved / Rejected — this adds 'Cancelled' without touching
-- any existing rows or the default value.
ALTER TABLE public.leave_requests
  DROP CONSTRAINT leave_requests_status_check;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_status_check
  CHECK (status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text, 'Cancelled'::text]));
