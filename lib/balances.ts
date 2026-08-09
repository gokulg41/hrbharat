import { EmployeeRecord, LeaveBalance, LeaveRequest } from './types';

/**
 * "Allocated" balances live on the employees row (fixed yearly quota).
 * "Used" is never stored anywhere — it's calculated here from that
 * employee's Approved requests for the current year. Comp Off isn't
 * tracked in the schema, so it's intentionally left out.
 */
export function computeEmployeeBalances(employee: EmployeeRecord, allRequests: LeaveRequest[]): LeaveBalance[] {
  const thisYear = new Date().getFullYear();

  const usedByType = (type: string) =>
    allRequests
      .filter(
        (r) =>
          r.employeeId === employee.id &&
          r.status === 'Approved' &&
          r.leaveType === type &&
          new Date(r.startDate + 'T00:00:00').getFullYear() === thisYear
      )
      .reduce((sum, r) => sum + r.durationDays, 0);

  return [
    { type: 'Casual Leave', used: usedByType('Casual Leave'), total: employee.casualAllocated },
    { type: 'Sick Leave', used: usedByType('Sick Leave'), total: employee.sickAllocated },
    { type: 'Earned Leave', used: usedByType('Earned Leave'), total: employee.paidAllocated },
  ];
}
