import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmployeeMetricCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  supportingText?: string;
  supportingTone?: 'positive' | 'neutral' | 'warning';
  loading?: boolean;
}

export default function EmployeeMetricCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  supportingText,
  supportingTone = 'neutral',
  loading,
}: EmployeeMetricCardProps) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl px-5 py-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans truncate">
          {label}
        </p>
        {loading ? (
          <div className="h-7 w-14 mt-1.5 rounded bg-surface-card-hover animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-ink-900 font-sans leading-tight mt-0.5">{value}</p>
        )}
        {supportingText && !loading && (
          <p
            className={`text-xs font-sans mt-1 truncate ${
              supportingTone === 'positive'
                ? 'text-status-success'
                : supportingTone === 'warning'
                ? 'text-status-warning'
                : 'text-ink-400'
            }`}
          >
            {supportingText}
          </p>
        )}
      </div>
    </div>
  );
}
