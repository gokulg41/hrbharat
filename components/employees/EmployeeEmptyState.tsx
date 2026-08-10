import React from 'react';
import { Users, Plus, Upload } from 'lucide-react';

interface EmployeeEmptyStateProps {
  variant: 'no-employees' | 'no-results';
  onAddEmployee: () => void;
  onImport?: () => void;
  onClearFilters?: () => void;
}

export default function EmployeeEmptyState({ variant, onAddEmployee, onImport, onClearFilters }: EmployeeEmptyStateProps) {
  const isNoEmployees = variant === 'no-employees';

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-full bg-brand-subtle flex items-center justify-center mb-4">
        <Users className="w-6 h-6 text-brand" />
      </div>
      <p className="text-sm font-semibold text-ink-900 font-sans mb-1">
        {isNoEmployees ? 'No employees yet' : 'No employees match your search'}
      </p>
      <p className="text-sm text-ink-400 font-sans max-w-xs mb-5">
        {isNoEmployees
          ? "Start building your workforce by adding your first employee."
          : 'Try adjusting your search or filters to find who you\u2019re looking for.'}
      </p>
      {isNoEmployees ? (
        <div className="flex items-center gap-3">
          <button
            onClick={onAddEmployee}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-medium font-sans hover:bg-brand-hover transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
          {onImport && (
            <button
              onClick={onImport}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border-subtle text-ink-600 text-sm font-medium font-sans hover:bg-surface-card-hover transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import Employees
            </button>
          )}
        </div>
      ) : (
        onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2.5 rounded-lg border border-border-subtle text-ink-600 text-sm font-medium font-sans hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        )
      )}
    </div>
  );
}
