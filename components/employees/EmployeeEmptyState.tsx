import React from 'react';
import { Users, Search, UserPlus } from 'lucide-react';

interface EmployeeEmptyStateProps {
  variant: 'no-employees' | 'no-results';
  onAddEmployee: () => void;
  onClearFilters?: () => void;
}

export default function EmployeeEmptyState({ variant, onAddEmployee, onClearFilters }: EmployeeEmptyStateProps) {
  if (variant === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center">
          <Search className="w-5 h-5 text-brand" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-900 font-sans">No matching employees</p>
          <p className="text-xs text-ink-400 font-sans max-w-xs">Try a different name, code, department, or clear your filters.</p>
        </div>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs font-sans font-semibold text-brand hover:text-brand-hover cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-brand-subtle flex items-center justify-center">
        <Users className="w-6 h-6 text-brand" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink-900 font-sans">No employees yet</p>
        <p className="text-xs text-ink-400 font-sans max-w-xs">Start building your workforce by adding your first employee.</p>
      </div>
      <button
        onClick={onAddEmployee}
        className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-sans font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
      >
        <UserPlus className="w-3.5 h-3.5" /> Add Employee
      </button>
    </div>
  );
}
