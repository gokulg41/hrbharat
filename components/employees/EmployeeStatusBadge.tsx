import React from 'react';
import type { EmployeeStatus } from '@/lib/employees/types';

const MAP: Record<EmployeeStatus, string> = {
  active: 'bg-status-success-bg text-status-success',
  on_leave: 'bg-status-warning-bg text-status-warning',
  inactive: 'bg-surface-card-hover text-ink-400',
};

const LABEL: Record<EmployeeStatus, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  inactive: 'Inactive',
};

export default function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-sans ${MAP[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {LABEL[status]}
    </span>
  );
}
