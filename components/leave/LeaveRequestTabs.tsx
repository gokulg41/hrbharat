'use client';

export type LeaveTabKey = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

interface LeaveRequestTabsProps {
  active: LeaveTabKey;
  onChange: (tab: LeaveTabKey) => void;
  counts: Record<LeaveTabKey, number>;
}

const TABS: { key: LeaveTabKey; label: string }[] = [
  { key: 'all', label: 'All Requests' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function LeaveRequestTabs({ active, onChange, counts }: LeaveRequestTabsProps) {
  return (
    <div className="flex items-center gap-6 border-b border-border-subtle px-5 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const count = counts[tab.key];
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative py-3.5 text-sm font-sans whitespace-nowrap transition-colors cursor-pointer ${
              isActive ? 'text-[var(--brand-primary)] font-semibold' : 'text-ink-600 hover:text-ink-900 font-medium'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && <span className="ml-1">({count})</span>}
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-px h-[2.5px] bg-[var(--brand-primary)] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
