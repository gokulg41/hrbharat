/**
 * ── Employees data model ─────────────────────────────────────────
 * This matches a typical `employees` table. Column names are the
 * ONE thing you must reconcile with your real Supabase schema —
 * see README_EMPLOYEES_PAGE.md for the exact SQL + mapping notes.
 *
 * Required columns (the page breaks without these):
 *   id, employee_code, full_name, email, department, designation,
 *   status, join_date, salary, company_id
 *
 * Optional columns (features degrade gracefully if absent):
 *   phone, date_of_birth, probation_end_date
 * ------------------------------------------------------------------ */

export type EmployeeStatus = 'active' | 'on_leave' | 'inactive';

export interface Employee {
  id: string;
  employee_code: string; // e.g. "EMP001" — rename to your actual column if different
  full_name: string;
  email: string;
  phone?: string | null;
  department: string;
  designation: string;
  status: EmployeeStatus;
  join_date: string; // ISO date string, e.g. "2024-08-08"
  salary: number;
  company_id: string;

  // Optional — only used if present on the row. Quick Filters and the
  // Employment Type filter hide themselves for a field that comes back
  // undefined/null on every row.
  date_of_birth?: string | null;
  probation_end_date?: string | null;
  employment_type?: string | null; // e.g. "Full-time", "Contract", "Intern"
}

export interface DepartmentCount {
  department: string;
  count: number;
}

export interface EmployeeMetrics {
  total: number;
  active: number;
  onLeave: number;
  inactive: number;
  departmentCount: number;
  newHiresThisMonth: number;
  newHiresLastMonth: number;
  departmentBreakdown: DepartmentCount[];
}

export type StatusFilter = 'all' | EmployeeStatus;
