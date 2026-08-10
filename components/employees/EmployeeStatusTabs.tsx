import React from 'react';
import type { StatusFilter } from '@/lib/employees/types';

interface Tab {
  key: StatusFilter;
  label: string;
  count: number;
}

interface EmployeeStatusTabsProps {
  active: StatusFilter;
  onChange: (status: StatusFilter) => void;
  counts: { all: number; active: number; on_leave: number; inactive: number };
}

export default function EmployeeStatusTabs({ active, onChange, counts }: EmployeeStatusTabsProps) {
  const tabs: Tab[] = [
    { key: 'all', label: 'All Employees', count: counts.all },
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'on_leave', label: 'On Leave', count: counts.on_leave },
    { key: 'inactive', label: 'Inactive', count: counts.inactive },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border-subtle px-2">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative px-3 py-3 text-sm font-sans transition-colors cursor-pointer ${
              isActive ? 'text-brand font-semibold' : 'text-ink-600 hover:text-ink-900 font-medium'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 ${isActive ? 'text-brand' : 'text-ink-400'}`}>({tab.count})</span>
            {isActive && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}
