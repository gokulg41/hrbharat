import React from 'react';

interface EmployeeOverviewDonutProps {
  active: number;
  onLeave: number;
  inactive: number;
}

export default function EmployeeOverviewDonut({ active, onLeave, inactive }: EmployeeOverviewDonutProps) {
  const total = active + onLeave + inactive;
  const activeDeg = total > 0 ? (active / total) * 360 : 0;
  const onLeaveDeg = total > 0 ? (onLeave / total) * 360 : 0;

  const segments = [
    { label: 'Active', count: active, color: 'var(--status-success)' },
    { label: 'On Leave', count: onLeave, color: 'var(--status-warning)' },
    { label: 'Inactive', count: inactive, color: 'var(--border-hover)' },
  ];

  return (
    <div>
      <div
        className="relative w-[160px] h-[160px] mx-auto rounded-full mb-5"
        style={{
          background: `conic-gradient(var(--status-success) 0deg ${activeDeg}deg, var(--status-warning) ${activeDeg}deg ${
            activeDeg + onLeaveDeg
          }deg, var(--border-subtle) ${activeDeg + onLeaveDeg}deg 360deg)`,
        }}
      >
        <div className="absolute inset-[16px] rounded-full bg-surface-card flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-ink-900 font-sans">{total}</span>
          <span className="text-[10px] text-ink-400 font-sans">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-xs font-sans">
            <span className="flex items-center gap-2 text-ink-600">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="text-ink-900 font-semibold tabular-nums">
              {s.count} <span className="text-ink-400 font-normal">({total > 0 ? Math.round((s.count / total) * 100) : 0}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
