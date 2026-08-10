import React from 'react';

interface EmployeeOverviewDonutProps {
  active: number;
  onLeave: number;
  inactive: number;
}

const SEGMENT_COLORS = {
  active: '#16A34A',
  onLeave: '#D97706',
  inactive: '#CBD5E1',
};

export default function EmployeeOverviewDonut({ active, onLeave, inactive }: EmployeeOverviewDonutProps) {
  const total = active + onLeave + inactive;
  const radius = 60;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  const segments =
    total === 0
      ? [{ key: 'inactive', value: 1, color: '#E2E8F0' }]
      : [
          { key: 'active', value: active, color: SEGMENT_COLORS.active },
          { key: 'onLeave', value: onLeave, color: SEGMENT_COLORS.onLeave },
          { key: 'inactive', value: inactive, color: SEGMENT_COLORS.inactive },
        ];

  let offsetAccumulator = 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-[152px] h-[152px]">
        <svg viewBox="0 0 152 152" className="w-full h-full -rotate-90">
          {segments.map((seg) => {
            const fraction = total === 0 ? 1 : seg.value / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const strokeDashoffset = -offsetAccumulator;
            offsetAccumulator += dash;
            return (
              <circle
                key={seg.key}
                cx="76"
                cy="76"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap={fraction > 0 && fraction < 1 ? 'butt' : 'butt'}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-ink-900 font-sans leading-none">{total}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-400 font-sans mt-1">Total</span>
        </div>
      </div>

      <div className="w-full space-y-2">
        <LegendRow color={SEGMENT_COLORS.active} label="Active" value={active} total={total} />
        <LegendRow color={SEGMENT_COLORS.onLeave} label="On Leave" value={onLeave} total={total} />
        <LegendRow color={SEGMENT_COLORS.inactive} label="Inactive" value={inactive} total={total} />
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
  return (
    <div className="flex items-center justify-between text-sm font-sans">
      <div className="flex items-center gap-2 text-ink-600">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        {label}
      </div>
      <span className="text-ink-900 font-medium">
        {value} <span className="text-ink-400 font-normal">({pct}%)</span>
      </span>
    </div>
  );
}
