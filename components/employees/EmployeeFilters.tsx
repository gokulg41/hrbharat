import React from 'react';
import { Search, SlidersHorizontal, Download, Filter as FilterIcon } from 'lucide-react';
import type { StatusFilter } from '@/lib/employees/types';

interface EmployeeFiltersProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  departments: string[];
  department: string;
  onDepartmentChange: (v: string) => void;
  employmentTypes: string[];
  employmentType: string;
  onEmploymentTypeChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  onExport: () => void;
  onMoreFilters: () => void;
  onFilters: () => void;
}

const selectClass =
  'w-full text-sm font-sans text-ink-900 bg-surface-card border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand cursor-pointer';

const labelClass = 'text-[11px] font-sans font-medium text-ink-600 block mb-1.5';

export default function EmployeeFilters({
  searchValue,
  onSearchChange,
  departments,
  department,
  onDepartmentChange,
  employmentTypes,
  employmentType,
  onEmploymentTypeChange,
  status,
  onStatusChange,
  onExport,
  onMoreFilters,
  onFilters,
}: EmployeeFiltersProps) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5 space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, ID or phone…"
          className="w-full pl-10 pr-4 py-2.5 text-sm font-sans text-ink-900 bg-surface-canvas border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-ink-400"
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[170px]">
            <span className={labelClass}>Department</span>
            <select value={department} onChange={(e) => onDepartmentChange(e.target.value)} className={selectClass}>
              <option>All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[170px]">
            <span className={labelClass}>Employment Type</span>
            <select value={employmentType} onChange={(e) => onEmploymentTypeChange(e.target.value)} className={selectClass}>
              <option>All Types</option>
              {employmentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[150px]">
            <span className={labelClass}>Status</span>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
              className={selectClass}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            onClick={onMoreFilters}
            className="flex items-center gap-1.5 text-sm font-sans font-medium text-ink-600 bg-surface-card border border-border-subtle rounded-lg px-3.5 py-2 hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" /> More Filters
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 text-sm font-sans font-medium text-ink-600 bg-surface-card border border-border-subtle rounded-lg px-3.5 py-2 hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={onFilters}
            className="flex items-center gap-1.5 text-sm font-sans font-medium text-ink-600 bg-surface-card border border-border-subtle rounded-lg px-3.5 py-2 hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            <FilterIcon className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>
    </div>
  );
}
