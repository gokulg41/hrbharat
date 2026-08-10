'use client';

import React, { useState } from 'react';
import type { DepartmentBreakdown } from '@/lib/employees/types';

interface DepartmentSummaryProps {
  departments: DepartmentBreakdown[];
}

const VISIBLE_LIMIT = 6;

export default function DepartmentSummary({ departments }: DepartmentSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const maxCount = departments.length > 0 ? departments[0].count : 1;
  const visible = expanded ? departments : departments.slice(0, VISIBLE_LIMIT);

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-900 font-sans">Department Wise</h3>
        {departments.length > VISIBLE_LIMIT && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-sans font-semibold text-brand hover:text-brand-hover cursor-pointer"
          >
            {expanded ? 'Show less' : 'View all'}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {visible.map((d) => (
          <div key={d.department}>
            <div className="flex items-center justify-between text-xs font-sans mb-1.5">
              <span className="text-ink-600 truncate">{d.department}</span>
              <span className="text-ink-900 font-semibold tabular-nums">{d.count}</span>
            </div>
            <div className="w-full h-1.5 bg-surface-canvas rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full"
                style={{ width: `${Math.max(6, (d.count / maxCount) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
