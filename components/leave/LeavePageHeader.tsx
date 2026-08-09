'use client';

import { useEffect, useState } from 'react';
import { Search, Bell, HelpCircle, ChevronDown } from 'lucide-react';

interface LeavePageHeaderProps {
  adminName: string;
  initials: string;
  notificationCount?: number;
  onSearch?: (query: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function LeavePageHeader({ adminName, initials, notificationCount = 0, onSearch }: LeavePageHeaderProps) {
  const [greeting, setGreeting] = useState('Good afternoon');
  const firstName = adminName.split(' ')[0];

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 font-sans flex items-center gap-2">
          {greeting}, {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="text-xs text-ink-600 font-sans mt-0.5">
          <span className="text-ink-400">Leave</span>
          <span className="mx-1.5 text-ink-400">›</span>
          <span className="text-ink-600 font-medium">Leave Management</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employees by name, department…"
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-72 lg:w-80 pl-10 pr-14 py-2.5 rounded-full border border-border-subtle bg-surface-card text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-sans font-medium text-ink-400 border border-border-subtle rounded px-1.5 py-0.5 bg-surface-card-hover">
            ⌘ K
          </kbd>
        </div>

        {/* Notifications */}
        <button
          className="relative w-9 h-9 rounded-full border border-border-subtle bg-surface-card flex items-center justify-center hover:bg-surface-card-hover transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-ink-600" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-[18px] h-[18px] min-w-[18px] rounded-full bg-[var(--status-danger)] text-white text-[9px] font-bold font-sans flex items-center justify-center px-1">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Help */}
        <button
          className="w-9 h-9 rounded-full border border-border-subtle bg-surface-card flex items-center justify-center hover:bg-surface-card-hover transition-colors cursor-pointer"
          aria-label="Help"
        >
          <HelpCircle className="w-4 h-4 text-ink-600" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-1.5 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-xs font-semibold font-sans">
            {initials}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-ink-400" />
        </button>
      </div>
    </div>
  );
}
