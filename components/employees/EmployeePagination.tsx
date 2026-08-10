import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EmployeePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function EmployeePagination({ page, pageSize, total, onPageChange, onPageSizeChange }: EmployeePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (pageSafe - 1) * pageSize + 1;
  const end = Math.min(pageSafe * pageSize, total);

  // Compact page-number list: first, last, current +/-1, with ellipses.
  const pageNumbers: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - pageSafe) <= 1) {
      pageNumbers.push(p);
    } else if (pageNumbers[pageNumbers.length - 1] !== '…') {
      pageNumbers.push('…');
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-border-subtle">
      <span className="text-xs text-ink-400 font-sans">
        Showing {start} to {end} of {total} employees
      </span>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-xs font-sans text-ink-900 bg-surface-card border border-border-subtle rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>
        <button
          onClick={() => onPageChange(Math.max(1, pageSafe - 1))}
          disabled={pageSafe === 1}
          className="p-1.5 rounded-lg border border-border-subtle text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pageNumbers.map((p, idx) =>
          p === '…' ? (
            <span key={`e-${idx}`} className="text-xs text-ink-400 font-sans px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[28px] h-7 rounded-lg text-xs font-sans font-medium cursor-pointer transition-colors ${
                p === pageSafe ? 'bg-brand text-white' : 'text-ink-600 hover:bg-surface-card-hover'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, pageSafe + 1))}
          disabled={pageSafe === totalPages}
          className="p-1.5 rounded-lg border border-border-subtle text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
