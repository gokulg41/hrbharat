import React from 'react';
import { UserPlus, CalendarClock } from 'lucide-react';
import type { QuickFilterItem, QuickFilterKey } from '@/lib/employees/quickFilters';

interface QuickFiltersProps {
  items: QuickFilterItem[];
  activeKey: QuickFilterKey | null;
  onSelect: (key: QuickFilterKey) => void;
}

const ICON: Record<QuickFilterKey, React.ComponentType<{ className?: string }>> = {
  recent: UserPlus,
  anniversary: CalendarClock,
};

export default function QuickFilters({ items, activeKey, onSelect }: QuickFiltersProps) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5">
      <h3 className="text-sm font-semibold text-ink-900 font-sans mb-3">Quick Filters</h3>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = ICON[item.key];
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-sans transition-colors cursor-pointer ${
                isActive ? 'bg-brand-subtle text-brand font-semibold' : 'text-ink-600 hover:bg-surface-card-hover'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className="w-4 h-4" /> {item.label}
              </span>
              <span className="font-semibold">{item.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
