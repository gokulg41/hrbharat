// leave_type / status are free-text columns in Supabase, not a fixed enum —
// typed as string so unexpected values don't break the build. Badge
// components fall back to a neutral style for anything not in their map.
export type LeaveType = string;
export type LeaveStatus = string;

export interface LeaveRequest {
  id: string;
  employeeId: string; // employees.id (uuid) — used to group/select an employee
  employeeCode: string; // employees.employee_code — display code (e.g. HB-165215)
  employeeName: string;
  department: string;
  avatarInitials: string;
  leaveType: LeaveType;
  startDate: string; // ISO date
  endDate: string; // ISO date
  durationDays: number;
  status: LeaveStatus;
  appliedOn: string; // ISO date
}

export interface LeaveBalance {
  type: LeaveType;
  used: number;
  total: number;
}

// One row per employee, sourced from employees.casual_leave_balance /
// sick_leave_balance / paid_leave_balance — these are fixed yearly
// allocations, not "remaining" balances. "Used" is calculated from
// approved leave_requests, not stored anywhere.
export interface EmployeeRecord {
  id: string;
  code: string;
  name: string;
  department: string;
  casualAllocated: number;
  sickAllocated: number;
  paidAllocated: number; // shown as "Earned Leave" — no separate earned_leave column exists
}

export interface LeaveStats {
  totalRequests: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  leaveTakenDays: number;
}
