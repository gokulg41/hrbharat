import React from 'react';
import type { DepartmentCount } from '@/lib/employees/types';

interface DepartmentSummaryProps {
  departments: DepartmentCount[];
  onViewAll?: () => void;
  maxVisible?: number;
}

export default function DepartmentSummary({ departments, onViewAll, maxVisible = 6 }: DepartmentSummaryProps) {
  if (departments.length === 0) return null;

  const visible = departments.slice(0, maxVisible);
  const maxCount = Math.max(...departments.map((d) => d.count));

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-900 font-sans">Department Wise</h3>
        {departments.length > maxVisible && onViewAll && (
          <button onClick={onViewAll} className="text-xs font-medium font-sans text-brand hover:underline cursor-pointer">
            View all
          </button>
        )}
      </div>
      <div className="space-y-3">
        {visible.map((dept) => (
          <div key={dept.department} className="flex items-center gap-3">
            <span className="text-xs font-medium font-sans text-ink-600 w-24 shrink-0 truncate">{dept.department}</span>
            <div className="flex-1 h-1.5 rounded-full bg-surface-card-hover overflow-hidden">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${maxCount === 0 ? 0 : (dept.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold font-sans text-ink-900 w-6 text-right shrink-0">{dept.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
