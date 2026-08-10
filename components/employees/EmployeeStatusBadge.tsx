import React from 'react';
import type { EmployeeStatus } from '@/lib/employees/types';

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; dot: string; text: string; bg: string }> = {
  active: { label: 'Active', dot: '#16A34A', text: 'var(--status-success)', bg: 'var(--status-success-bg)' },
  on_leave: { label: 'On Leave', dot: '#D97706', text: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
  inactive: { label: 'Inactive', dot: '#94A3B8', text: 'var(--ink-600)', bg: '#F1F5F9' },
};

export default function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-sans"
      style={{ color: config.text, backgroundColor: config.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: config.dot }} />
      {config.label}
    </span>
  );
}
