'use client';

import { Search, ChevronDown, Calendar, SlidersHorizontal } from 'lucide-react';

export interface LeaveFilterState {
  search: string;
  department: string;
  leaveType: string;
  status: string;
  dateRange: string;
}

interface LeaveFiltersProps {
  filters: LeaveFilterState;
  departments: string[];
  leaveTypes: string[];
  statuses: string[];
  onChange: (filters: LeaveFilterState) => void;
  onOpenAdvanced?: () => void;
}

const selectClass =
  'appearance-none pl-3.5 pr-8 py-2.5 rounded-lg border border-border-subtle bg-surface-card text-sm font-sans text-ink-900 hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors cursor-pointer';

export default function LeaveFilters({ filters, departments, leaveTypes, statuses, onChange, onOpenAdvanced }: LeaveFiltersProps) {
  const update = (patch: Partial<LeaveFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-5 py-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Search by employee name…"
          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border-subtle bg-surface-card text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
        />
      </div>

      {/* Department */}
      <div className="relative">
        <select
          value={filters.department}
          onChange={(e) => update({ department: e.target.value })}
          className={selectClass}
        >
          <option>All Departments</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-ink-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Leave type */}
      <div className="relative">
        <select
          value={filters.leaveType}
          onChange={(e) => update({ leaveType: e.target.value })}
          className={selectClass}
        >
          <option>All Leave Types</option>
          {leaveTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-ink-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Status */}
      <div className="relative">
        <select value={filters.status} onChange={(e) => update({ status: e.target.value })} className={selectClass}>
          <option>All Status</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-ink-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Date range */}
      <button className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-border-subtle bg-surface-card text-sm font-sans text-ink-900 hover:border-border-hover transition-colors cursor-pointer">
        <Calendar className="w-3.5 h-3.5 text-ink-400" />
        {filters.dateRange}
      </button>

      {/* Filters */}
      <button
        onClick={onOpenAdvanced}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-border-subtle bg-surface-card text-sm font-sans font-medium text-ink-900 hover:border-border-hover transition-colors cursor-pointer"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-ink-600" />
        Filters
      </button>
    </div>
  );
}
