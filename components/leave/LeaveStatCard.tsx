import React from 'react';

type Accent = 'blue' | 'orange' | 'green' | 'red' | 'violet';

const ACCENT_STYLES: Record<Accent, { bg: string; text: string }> = {
  blue: { bg: 'bg-brand-subtle', text: 'text-[var(--brand-primary)]' },
  orange: { bg: 'bg-[var(--accent-orange-bg)]', text: 'text-[var(--accent-orange)]' },
  green: { bg: 'bg-[var(--accent-green-bg)]', text: 'text-[var(--accent-green)]' },
  red: { bg: 'bg-[var(--status-danger-bg)]', text: 'text-[var(--status-danger)]' },
  violet: { bg: 'bg-[var(--accent-violet-bg)]', text: 'text-[var(--accent-violet)]' },
};

interface LeaveStatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  suffix?: string;
  subtext: string;
  accent: Accent;
}

export default function LeaveStatCard({ icon: Icon, label, value, suffix, subtext, accent }: LeaveStatCardProps) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-card flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${styles.bg}`}>
        <Icon className={`w-[18px] h-[18px] ${styles.text}`} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans mb-1">{label}</p>
        <p className="text-2xl font-bold text-ink-900 font-sans leading-tight">
          {value}
          {suffix && <span className="text-sm font-medium text-ink-600 ml-1">{suffix}</span>}
        </p>
        <p className="text-xs text-ink-600 font-sans mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}
