import { EmployeeRecord, LeaveRequest } from './types';

/**
 * Fallback/sample data — used ONLY when the real backend query
 * (see app/admin/leave/page.tsx -> fetchLeaveRequests) returns no rows,
 * e.g. in a fresh dev environment with an empty `leave_requests` table.
 * Do not import this into production data paths.
 */
export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: '1',
    employeeCode: 'EMP001',
    employeeId: 'mock-emp001',
    employeeName: 'Arjun Singh',
    department: 'Marketing',
    avatarInitials: 'AS',
    leaveType: 'Casual Leave',
    startDate: '2026-08-14',
    endDate: '2026-08-15',
    durationDays: 2,
    status: 'Pending',
    appliedOn: '2026-08-08',
  },
  {
    id: '2',
    employeeCode: 'EMP002',
    employeeId: 'mock-emp002',
    employeeName: 'Neha Sharma',
    department: 'Design',
    avatarInitials: 'NS',
    leaveType: 'Sick Leave',
    startDate: '2026-08-12',
    endDate: '2026-08-12',
    durationDays: 1,
    status: 'Approved',
    appliedOn: '2026-08-07',
  },
  {
    id: '3',
    employeeCode: 'EMP003',
    employeeId: 'mock-emp003',
    employeeName: 'Rahul Patel',
    department: 'Engineering',
    avatarInitials: 'RP',
    leaveType: 'Casual Leave',
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    durationDays: 3,
    status: 'Approved',
    appliedOn: '2026-08-05',
  },
  {
    id: '4',
    employeeCode: 'EMP004',
    employeeId: 'mock-emp004',
    employeeName: 'Divya Kapoor',
    department: 'HR',
    avatarInitials: 'DK',
    leaveType: 'Earned Leave',
    startDate: '2026-08-18',
    endDate: '2026-08-22',
    durationDays: 5,
    status: 'Pending',
    appliedOn: '2026-08-08',
  },
  {
    id: '5',
    employeeCode: 'EMP005',
    employeeId: 'mock-emp005',
    employeeName: 'Manish Kumar',
    department: 'Finance',
    avatarInitials: 'MK',
    leaveType: 'Sick Leave',
    startDate: '2026-08-09',
    endDate: '2026-08-10',
    durationDays: 2,
    status: 'Rejected',
    appliedOn: '2026-08-06',
  },
  {
    id: '6',
    employeeCode: 'EMP006',
    employeeId: 'mock-emp006',
    employeeName: 'Sneha Reddy',
    department: 'Operations',
    avatarInitials: 'SR',
    leaveType: 'Earned Leave',
    startDate: '2026-08-25',
    endDate: '2026-08-28',
    durationDays: 4,
    status: 'Approved',
    appliedOn: '2026-08-07',
  },
  {
    id: '7',
    employeeCode: 'EMP007',
    employeeId: 'mock-emp007',
    employeeName: 'Vikram Joshi',
    department: 'Support',
    avatarInitials: 'VJ',
    leaveType: 'Casual Leave',
    startDate: '2026-08-16',
    endDate: '2026-08-16',
    durationDays: 1,
    status: 'Pending',
    appliedOn: '2026-08-08',
  },
];

// Fallback allocations, mirroring the real employees.*_leave_balance columns.
// Used balances are always computed live from MOCK_LEAVE_REQUESTS, never
// hardcoded here — same rule as the real data path.
export const MOCK_EMPLOYEES: Record<string, EmployeeRecord> = Object.fromEntries(
  MOCK_LEAVE_REQUESTS.map((r) => [
    r.employeeId,
    {
      id: r.employeeId,
      code: r.employeeCode,
      name: r.employeeName,
      department: r.department,
      casualAllocated: 12,
      sickAllocated: 12,
      paidAllocated: 18,
    } satisfies EmployeeRecord,
  ])
);

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function formatWeekday(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return WEEKDAY[d.getDay()];
}

export function monthName(monthIndex: number): string {
  return MONTH[monthIndex];
}
