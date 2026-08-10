import React from 'react';
import type { LucideIcon } from 'lucide-react';

type Tone = 'positive' | 'warning' | 'neutral';

interface EmployeeMetricCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: number;
  supportingText?: string;
  supportingTone?: Tone;
  loading?: boolean;
}

const TONE_CLASS: Record<Tone, string> = {
  positive: 'text-status-success',
  warning: 'text-status-warning',
  neutral: 'text-ink-400',
};

export default function EmployeeMetricCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  supportingText,
  supportingTone = 'neutral',
  loading = false,
}: EmployeeMetricCardProps) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl px-5 py-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mb-3"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-400 block mb-1">
        {label}
      </span>
      {loading ? (
        <div className="h-7 w-14 bg-surface-card-hover rounded animate-pulse" />
      ) : (
        <span className="text-2xl font-bold text-ink-900 font-sans tabular-nums leading-none block">{value}</span>
      )}
      {supportingText && !loading && (
        <span className={`text-xs font-sans block mt-1.5 ${TONE_CLASS[supportingTone]}`}>{supportingText}</span>
      )}
    </div>
  );
}
