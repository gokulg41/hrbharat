'use client';

import { useState } from 'react';
import { Eye, MoreVertical } from 'lucide-react';
import { LeaveRequest } from '@/lib/types';
import { formatDateLong, formatWeekday } from '@/lib/mockData';
import LeaveStatusBadge from './LeaveStatusBadge';
import LeaveTypeBadge from './LeaveTypeBadge';

const AVATAR_COLORS = [
  'bg-brand-subtle text-[var(--brand-primary)]',
  'bg-[var(--accent-green-bg)] text-[var(--accent-green)]',
  'bg-[var(--accent-violet-bg)] text-[var(--accent-violet)]',
  'bg-[var(--accent-orange-bg)] text-[var(--accent-orange)]',
  'bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
];

function avatarColor(seed: string) {
  const idx = seed.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

interface LeaveRequestTableProps {
  requests: LeaveRequest[];
  selectedEmployeeId?: string | null;
  onView?: (request: LeaveRequest) => void;
  onApprove?: (request: LeaveRequest) => void;
  onReject?: (request: LeaveRequest) => void;
  onRowSelect?: (request: LeaveRequest) => void;
}

export default function LeaveRequestTable({
  requests,
  selectedEmployeeId,
  onView,
  onApprove,
  onReject,
  onRowSelect,
}: LeaveRequestTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-sm font-semibold text-ink-900 font-sans">No leave requests match your filters</p>
        <p className="text-xs text-ink-600 font-sans mt-1">Try adjusting the search, department, or date range.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[880px]">
        <thead>
          <tr className="border-b border-border-subtle">
            {['Employee', 'Leave Type', 'Duration', 'Dates', 'Status', 'Applied On', 'Actions'].map((h) => (
              <th
                key={h}
                className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400 font-sans ${
                  h === 'Actions' ? 'text-right' : ''
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const isSelected = !!selectedEmployeeId && r.employeeId === selectedEmployeeId;
            return (
            <tr
              key={r.id}
              onClick={() => onRowSelect?.(r)}
              className={`border-b border-border-subtle last:border-b-0 transition-colors cursor-pointer ${
                isSelected ? 'bg-brand-subtle/60' : 'hover:bg-surface-card-hover/60'
              }`}
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold font-sans shrink-0 ${avatarColor(r.employeeName)}`}>
                    {r.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 font-sans truncate">{r.employeeName}</p>
                    <p className="text-xs text-ink-600 font-sans truncate">
                      {r.employeeCode} • {r.department}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5">
                <LeaveTypeBadge type={r.leaveType} />
              </td>
              <td className="px-5 py-3.5 text-sm text-ink-900 font-sans whitespace-nowrap">
                {r.durationDays} {r.durationDays === 1 ? 'Day' : 'Days'}
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                <p className="text-sm text-ink-900 font-sans">
                  {formatDateLong(r.startDate)}
                  {r.startDate !== r.endDate && ` - ${formatDateLong(r.endDate)}`}
                </p>
                <p className="text-xs text-ink-600 font-sans">
                  {formatWeekday(r.startDate)}
                  {r.startDate !== r.endDate && ` - ${formatWeekday(r.endDate)}`}
                </p>
              </td>
              <td className="px-5 py-3.5">
                <LeaveStatusBadge status={r.status} />
              </td>
              <td className="px-5 py-3.5 text-sm text-ink-600 font-sans whitespace-nowrap">{formatDateLong(r.appliedOn)}</td>
              <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1 relative">
                  <button
                    onClick={() => onView?.(r)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-ink-400 hover:text-ink-900 hover:bg-surface-card-hover transition-colors cursor-pointer"
                    aria-label={`View ${r.employeeName}'s request`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-ink-400 hover:text-ink-900 hover:bg-surface-card-hover transition-colors cursor-pointer"
                    aria-label="More actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenuId === r.id && (
                    <div
                      className="absolute right-0 top-8 z-10 w-40 bg-surface-card border border-border-subtle rounded-lg shadow-xl py-1"
                      onMouseLeave={() => setOpenMenuId(null)}
                    >
                      <button
                        onClick={() => { onApprove?.(r); setOpenMenuId(null); }}
                        className="w-full text-left px-3 py-2 text-xs font-sans text-ink-900 hover:bg-surface-card-hover cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { onReject?.(r); setOpenMenuId(null); }}
                        className="w-full text-left px-3 py-2 text-xs font-sans text-[var(--status-danger)] hover:bg-surface-card-hover cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}