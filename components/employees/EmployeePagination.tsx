import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EmployeePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function EmployeePagination({ page, pageSize, total, onPageChange, onPageSizeChange }: EmployeePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pageNumbers = getPageWindow(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border-subtle">
      <div className="flex items-center gap-3">
        <span className="text-xs text-ink-400 font-sans">
          Showing {start} to {end} of {total} employees
        </span>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2.5 py-1.5 rounded-lg border border-border-subtle text-xs font-sans text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border-subtle text-ink-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {pageNumbers.map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-ink-400 font-sans">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-sans font-medium transition-colors cursor-pointer ${
                  p === page ? 'bg-brand text-white' : 'text-ink-600 hover:bg-surface-card-hover border border-border-subtle'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border-subtle text-ink-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getPageWindow(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
