export type UserRole = 'Admin' | 'Employee';

export interface EmployeeProfile {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  role: UserRole;
  department: string;
  base_salary: number;
  branch_name?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  created_at: string;
}