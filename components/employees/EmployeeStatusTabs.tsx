import React from 'react';
import type { StatusFilter } from '@/lib/employees/types';

interface EmployeeStatusTabsProps {
  active: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}

const TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All Employees' },
  { id: 'active', label: 'Active' },
  { id: 'on_leave', label: 'On Leave' },
  { id: 'inactive', label: 'Inactive' },
];

export default function EmployeeStatusTabs({ active, onChange, counts }: EmployeeStatusTabsProps) {
  return (
    <div className="flex items-center gap-1 px-5 pt-4 overflow-x-auto border-b border-border-subtle">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative whitespace-nowrap text-sm font-sans font-medium px-3.5 pb-3 transition-colors cursor-pointer ${
              isActive ? 'text-brand' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {tab.label} <span className={isActive ? 'text-brand/70' : 'text-ink-400'}>({counts[tab.id] ?? 0})</span>
            {isActive && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-brand rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}
