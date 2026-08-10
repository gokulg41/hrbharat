'use client';

import React, { useState } from 'react';
import { Search, Bell, HelpCircle, ChevronDown, LogOut } from 'lucide-react';

interface EmployeesPageHeaderProps {
  adminName: string;
  initials: string;
  notificationCount?: number;
  onSearch?: (value: string) => void;
  onSignOut: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function EmployeesPageHeader({
  adminName,
  initials,
  notificationCount = 0,
  onSearch,
  onSignOut,
}: EmployeesPageHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const firstName = adminName.split(' ')[0];

  return (
    <header className="hidden md:flex items-center justify-between gap-6 px-8 py-5">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-ink-900 font-sans">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-xs text-ink-400 font-sans mt-0.5">
          Employees <span className="mx-1">›</span> All Employees
        </p>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Search employees, payroll, reports..."
            className="w-full pl-10 pr-12 py-2.5 rounded-lg border border-border-subtle bg-surface-card text-sm font-sans text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          />
          <kbd className="hidden lg:flex items-center px-1.5 py-0.5 rounded border border-border-subtle text-[10px] text-ink-400 font-sans absolute right-3 top-1/2 -translate-y-1/2">
            ⌘K
          </kbd>
        </div>

        <button className="relative p-2 rounded-lg text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer">
          <Bell className="w-[18px] h-[18px]" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-status-danger text-white text-[9px] font-semibold font-sans flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        <button className="p-2 rounded-lg text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer">
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-semibold font-sans">
              {initials}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-ink-400" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-20 w-44 bg-surface-card border border-border-subtle rounded-lg shadow-card py-1">
                <div className="px-3 py-2 border-b border-border-subtle">
                  <p className="text-xs font-semibold text-ink-900 font-sans truncate">{adminName}</p>
                  <p className="text-[10px] text-ink-400 font-sans">Administrator</p>
                </div>
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-sans text-status-danger hover:bg-surface-card-hover transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
