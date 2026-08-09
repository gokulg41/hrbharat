import { Circle } from 'lucide-react';
import { LeaveType } from '@/lib/types';

const STYLES: Record<string, { text: string; dot: string }> = {
  'Casual Leave': { text: 'text-[var(--brand-primary)]', dot: 'fill-[var(--brand-primary)]' },
  'Sick Leave': { text: 'text-[var(--accent-green)]', dot: 'fill-[var(--accent-green)]' },
  'Earned Leave': { text: 'text-[var(--accent-violet)]', dot: 'fill-[var(--accent-violet)]' },
  'Comp Off': { text: 'text-[var(--accent-orange)]', dot: 'fill-[var(--accent-orange)]' },
};

const FALLBACK = { text: 'text-ink-600', dot: 'fill-ink-400' };

export default function LeaveTypeBadge({ type }: { type: LeaveType }) {
  const s = STYLES[type] ?? FALLBACK;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium font-sans ${s.text}`}>
      <Circle className={`w-2 h-2 ${s.dot} stroke-none`} />
      {type}
    </span>
  );
}
