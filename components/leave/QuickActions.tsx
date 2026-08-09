import { CheckCircle2, CalendarRange, FileText, BarChart3, ChevronRight } from 'lucide-react';

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: 'Approve Leave', icon: CheckCircle2 },
  { label: 'Request Calendar', icon: CalendarRange },
  { label: 'Leave Policy', icon: FileText },
  { label: 'Leave Report', icon: BarChart3 },
];

export default function QuickActions({ actions = DEFAULT_ACTIONS }: { actions?: QuickAction[] }) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl shadow-card p-5">
      <h3 className="text-sm font-semibold text-ink-900 font-sans mb-3">Quick Actions</h3>
      <div className="space-y-0.5 -mx-1.5">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              className="w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg hover:bg-surface-card-hover transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-surface-card-hover flex items-center justify-center group-hover:bg-brand-subtle transition-colors">
                  <Icon className="w-3.5 h-3.5 text-ink-600 group-hover:text-[var(--brand-primary)]" />
                </div>
                <span className="text-sm font-medium text-ink-900 font-sans">{a.label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-ink-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
