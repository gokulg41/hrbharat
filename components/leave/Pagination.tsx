'use client';

import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-border-subtle">
      <p className="text-xs text-ink-600 font-sans">
        Showing {rangeStart} to {rangeEnd} of {totalItems} requests
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-600 font-sans">Rows per page</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg border border-border-subtle bg-surface-card text-xs font-sans cursor-pointer"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-ink-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="w-7 h-7 rounded-md border border-border-subtle flex items-center justify-center text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer ${
                p === page
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-ink-600 border border-border-subtle hover:bg-surface-card-hover'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="w-7 h-7 rounded-md border border-border-subtle flex items-center justify-center text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
