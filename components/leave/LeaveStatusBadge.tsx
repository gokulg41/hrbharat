import { Circle } from 'lucide-react';
import { LeaveStatus } from '../lib/types';

const STYLES: Record<string, { text: string; bg: string; dot: string }> = {
  Pending: { text: 'text-[var(--status-warning)]', bg: 'bg-[var(--status-warning-bg)]', dot: 'fill-[var(--status-warning)]' },
  Approved: { text: 'text-[var(--status-success)]', bg: 'bg-[var(--status-success-bg)]', dot: 'fill-[var(--status-success)]' },
  Rejected: { text: 'text-[var(--status-danger)]', bg: 'bg-[var(--status-danger-bg)]', dot: 'fill-[var(--status-danger)]' },
  Cancelled: { text: 'text-ink-400', bg: 'bg-slate-100', dot: 'fill-ink-400' },
};

const FALLBACK = { text: 'text-ink-600', bg: 'bg-surface-card-hover', dot: 'fill-ink-400' };

export default function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const s = STYLES[status] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-sans ${s.text} ${s.bg}`}
    >
      <Circle className={`w-1.5 h-1.5 ${s.dot} stroke-none`} />
      {status}
    </span>
  );
}
