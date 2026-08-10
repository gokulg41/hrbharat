export type EmployeeStatus = 'active' | 'on_leave' | 'inactive';
export type StatusFilter = 'all' | EmployeeStatus;

/**
 * Shape returned by the `employees` Supabase table (select('*, company_shifts(*)')).
 * Kept loose/optional on purpose — this mirrors the defensive reads already used
 * elsewhere in the codebase (tabs-view.tsx) so nothing here assumes a column
 * exists that hasn't been referenced before.
 */
export interface Employee {
  id: string;
  company_id: string;
  full_name: string;
  email: string | null;
  employee_code: string;
  phone_number?: string | null; // the real, populated column on `employees`
  phone?: string | null; // legacy/alt column — present on the table but currently unused (always null in prod data)
  department?: string | null;
  designation?: string | null;
  status?: string | null; // raw db value, e.g. "Active" — normalize with getEmployeeStatus()
  employment_type?: string | null;
  joining_date?: string | null;
  monthly_salary?: number | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;
  company_shifts?: { shift_name: string } | null;
}

export interface DepartmentBreakdown {
  department: string;
  count: number;
}

export interface EmployeeMetrics {
  total: number;
  active: number;
  onLeave: number;
  inactive: number;
  departmentCount: number;
  departmentBreakdown: DepartmentBreakdown[];
  newHiresThisMonth: number;
  newHiresLastMonth: number;
}
