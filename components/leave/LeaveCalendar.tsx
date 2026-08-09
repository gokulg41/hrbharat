'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LeaveRequest } from '@/lib/types';
import { monthName } from '@/lib/mockData';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type MarkColor = 'blue' | 'green' | 'violet' | 'orange';

const MARK_STYLES: Record<MarkColor, string> = {
  blue: 'bg-brand-subtle text-[var(--brand-primary)]',
  green: 'bg-[var(--accent-green-bg)] text-[var(--accent-green)]',
  violet: 'bg-[var(--accent-violet-bg)] text-[var(--accent-violet)]',
  orange: 'bg-[var(--accent-orange-bg)] text-[var(--accent-orange)]',
};

const TYPE_TO_COLOR: Record<string, MarkColor> = {
  'Casual Leave': 'blue',
  'Sick Leave': 'green',
  'Earned Leave': 'violet',
  'Comp Off': 'orange',
};
const DEFAULT_MARK_COLOR: MarkColor = 'blue';

interface LeaveCalendarProps {
  requests: LeaveRequest[];
  initialYear: number;
  initialMonth: number; // 0-indexed
}

export default function LeaveCalendar({ requests, initialYear, initialMonth }: LeaveCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const markedDays = useMemo(() => {
    const map = new Map<number, MarkColor>();
    requests.forEach((r) => {
      const start = new Date(r.startDate + 'T00:00:00');
      const end = new Date(r.endDate + 'T00:00:00');
      if (start.getFullYear() !== year || start.getMonth() !== month) return;
      const color = TYPE_TO_COLOR[r.leaveType] ?? DEFAULT_MARK_COLOR;
      for (let d = start.getDate(); d <= end.getDate(); d++) {
        map.set(d, color);
      }
    });
    return map;
  }, [requests, year, month]);

  const { leadingBlanks, daysInMonth, prevMonthDays } = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    // JS getDay(): 0=Sun..6=Sat -> convert to Mon-first index
    const jsDay = firstOfMonth.getDay();
    const leading = (jsDay + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    return { leadingBlanks: leading, daysInMonth: days, prevMonthDays: prevDays };
  }, [year, month]);

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const cells: { label: number; muted: boolean; color?: MarkColor }[] = [];
  for (let i = leadingBlanks - 1; i >= 0; i--) {
    cells.push({ label: prevMonthDays - i, muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ label: d, muted: false, color: markedDays.get(d) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ label: cells.length - leadingBlanks - daysInMonth + 1, muted: true });
  }

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-900 font-sans">Leave Calendar</h3>
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="w-6 h-6 rounded-md border border-border-subtle flex items-center justify-center text-ink-600 hover:bg-surface-card-hover cursor-pointer transition-colors">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button onClick={goNext} className="w-6 h-6 rounded-md border border-border-subtle flex items-center justify-center text-ink-600 hover:bg-surface-card-hover cursor-pointer transition-colors">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold text-ink-900 font-sans text-center mb-3">
        {monthName(month)} {year}
      </p>

      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] font-semibold text-ink-400 font-sans">
            {w}
          </span>
        ))}
        {cells.map((c, i) => (
          <div key={i} className="flex items-center justify-center py-0.5">
            <span
              className={`w-[26px] h-[26px] flex items-center justify-center rounded-full text-xs font-sans ${
                c.muted
                  ? 'text-ink-400/60'
                  : c.color
                  ? `font-semibold ${MARK_STYLES[c.color]}`
                  : 'text-ink-900'
              }`}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}