import React from 'react';
import { UserPlus, Hourglass, Cake, PartyPopper } from 'lucide-react';
import type { QuickFilterItem, QuickFilterKey } from '@/lib/employees/quickFilters';

const ICONS: Record<QuickFilterKey, React.ComponentType<{ className?: string }>> = {
  recent_joiners: UserPlus,
  on_probation: Hourglass,
  birthday_this_month: Cake,
  work_anniversary: PartyPopper,
};

interface QuickFiltersProps {
  items: QuickFilterItem[];
  activeKey: QuickFilterKey | null;
  onSelect: (key: QuickFilterKey) => void;
}

export default function QuickFilters({ items, activeKey, onSelect }: QuickFiltersProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5">
      <h3 className="text-sm font-semibold text-ink-900 font-sans mb-3">Quick Filters</h3>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-sans transition-colors cursor-pointer ${
                isActive ? 'bg-brand-subtle text-brand font-medium' : 'text-ink-600 hover:bg-surface-card-hover'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand' : 'text-ink-400'}`} />
                {item.label}
              </span>
              <span className={isActive ? 'text-brand font-semibold' : 'text-ink-400'}>{item.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
