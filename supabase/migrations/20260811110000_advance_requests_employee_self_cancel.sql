-- Employees currently have no UPDATE policy on advance_salary_requests at all
-- (only admins do), so they can't cancel their own pending advance request
-- from the new "My Requests" page. This adds a narrow self-service policy:
-- an employee may only update their OWN row, and only while it is still
-- pending (status compared case-insensitively since live data has mixed
-- casing). It does not grant any ability to touch approved/rejected rows
-- or rows belonging to another employee.
CREATE POLICY "Employees can cancel their own pending advance requests"
  ON public.advance_salary_requests
  FOR UPDATE
  USING (
    employee_id = (SELECT employees.id FROM public.employees WHERE employees.email = auth.email())
    AND lower(status) = 'pending'
  )
  WITH CHECK (
    employee_id = (SELECT employees.id FROM public.employees WHERE employees.email = auth.email())
  );
