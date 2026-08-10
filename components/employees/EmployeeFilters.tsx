import React from 'react';
import { Search, Download, SlidersHorizontal, Filter } from 'lucide-react';
import type { StatusFilter } from '@/lib/employees/types';

interface EmployeeFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  departments: string[];
  department: string;
  onDepartmentChange: (value: string) => void;
  employmentTypes: string[];
  employmentType: string;
  onEmploymentTypeChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  onExport: () => void;
  onMoreFilters: () => void;
  onFilters: () => void;
}

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'On Leave', value: 'on_leave' },
  { label: 'Inactive', value: 'inactive' },
];

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
    <div className="bg-surface-card border border-border-subtle rounded-xl p-4 space-y-3">
      {/* Primary search */}
      <div className="relative">
        <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, ID or phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-subtle text-sm font-sans text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
        />
      </div>

      {/* Dropdown row */}
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Department"
          value={department}
          onChange={onDepartmentChange}
          options={['All Departments', ...departments]}
        />
        {employmentTypes.length > 0 && (
          <FilterSelect
            label="Employment Type"
            value={employmentType}
            onChange={onEmploymentTypeChange}
            options={['All Types', ...employmentTypes]}
          />
        )}
        <FilterSelect
          label="Status"
          value={STATUS_OPTIONS.find((s) => s.value === status)?.label ?? 'All Status'}
          onChange={(label) => {
            const match = STATUS_OPTIONS.find((s) => s.label === label);
            onStatusChange(match ? match.value : 'all');
          }}
          options={STATUS_OPTIONS.map((s) => s.label)}
        />

        <button
          onClick={onMoreFilters}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-border-subtle text-sm font-medium font-sans text-ink-600 hover:bg-surface-card-hover hover:border-border-hover transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          More Filters
        </button>
      </div>

      {/* Right-aligned action row */}
      <div className="flex items-center justify-end gap-2.5">
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-subtle text-sm font-medium font-sans text-ink-600 hover:bg-surface-card-hover hover:border-border-hover transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
        <button
          onClick={onFilters}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-subtle text-sm font-medium font-sans text-ink-600 hover:bg-surface-card-hover hover:border-border-hover transition-colors cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
        </button>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      <span className="text-xs font-medium font-sans text-ink-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2.5 rounded-lg border border-border-subtle text-sm font-sans text-ink-900 bg-surface-card focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
