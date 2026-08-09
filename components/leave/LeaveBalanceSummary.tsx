import { CalendarDays, HeartPulse, Sparkles, Clock3 } from 'lucide-react';
import { LeaveBalance, LeaveType } from '@/lib/types';

const META: Record<LeaveType, { icon: React.ComponentType<{ className?: string }>; bar: string; iconBg: string; iconText: string }> = {
  'Casual Leave': { icon: CalendarDays, bar: 'bg-[var(--brand-primary)]', iconBg: 'bg-brand-subtle', iconText: 'text-[var(--brand-primary)]' },
  'Sick Leave': { icon: HeartPulse, bar: 'bg-[var(--accent-green)]', iconBg: 'bg-[var(--accent-green-bg)]', iconText: 'text-[var(--accent-green)]' },
  'Earned Leave': { icon: Sparkles, bar: 'bg-[var(--accent-violet)]', iconBg: 'bg-[var(--accent-violet-bg)]', iconText: 'text-[var(--accent-violet)]' },
  'Comp Off': { icon: Clock3, bar: 'bg-[var(--accent-orange)]', iconBg: 'bg-[var(--accent-orange-bg)]', iconText: 'text-[var(--accent-orange)]' },
};

interface LeaveBalanceSummaryProps {
  balances: LeaveBalance[];
  employeeName?: string;
  onViewAll?: () => void;
}

export default function LeaveBalanceSummary({ balances, employeeName, onViewAll }: LeaveBalanceSummaryProps) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl shadow-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-ink-900 font-sans">Leave Balance Summary</h3>
        <button onClick={onViewAll} className="text-xs font-medium text-[var(--brand-primary)] font-sans hover:underline cursor-pointer">
          View all
        </button>
      </div>
      {employeeName && <p className="text-xs text-ink-600 font-sans mb-4">{employeeName}</p>}
      {!employeeName && <div className="mb-4" />}

      <div className="space-y-4">
        {balances.map((b) => {
          const meta = META[b.type];
          const Icon = meta.icon;
          const pct = Math.min(100, Math.round((b.used / b.total) * 100));
          return (
            <div key={b.type}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${meta.iconBg}`}>
                    <Icon className={`w-3 h-3 ${meta.iconText}`} />
                  </div>
                  <span className="text-xs font-medium text-ink-900 font-sans">{b.type}</span>
                </div>
                <span className="text-xs text-ink-600 font-sans">
                  <span className="font-semibold text-ink-900">{b.used}</span> / {b.total} Days
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-card-hover overflow-hidden">
                <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
