'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell, HelpCircle, Search, ChevronDown, LogOut } from 'lucide-react';

interface EmployeesPageHeaderProps {
  adminName: string;
  initials: string;
  notificationCount?: number;
  onSignOut: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

function useGreeting(name: string) {
  const [greeting, setGreeting] = useState('Hello');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);
  const firstName = name?.split(' ')[0] || 'there';
  return `${greeting}, ${firstName}`;
}

export default function EmployeesPageHeader({
  adminName,
  initials,
  notificationCount = 0,
  onSignOut,
  searchValue,
  onSearchChange,
}: EmployeesPageHeaderProps) {
  const greeting = useGreeting(adminName);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-surface-card border-b border-border-subtle">
      <div className="flex items-center justify-between gap-4 px-4 md:px-8 h-[76px]">
        {/* Greeting + breadcrumb */}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-ink-900 font-sans truncate">{greeting} <span aria-hidden>👋</span></h1>
          <p className="text-xs text-ink-400 font-sans mt-0.5">
            Employees <span className="mx-1 text-ink-400">›</span> <span className="text-ink-600">All Employees</span>
          </p>
        </div>

        {/* Global search + actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search employees, payroll, reports…"
              className="w-[280px] lg:w-[340px] pl-9 pr-12 py-2.5 text-sm font-sans text-ink-900 bg-surface-canvas border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-ink-400"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-sans font-medium text-ink-400 bg-surface-card border border-border-subtle rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </div>

          <button
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-status-danger text-white text-[9px] font-bold font-sans flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>

          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
            aria-label="Help"
          >
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 cursor-pointer"
              aria-label="Account menu"
            >
              <span className="w-9 h-9 rounded-full bg-brand text-white text-xs font-semibold font-sans flex items-center justify-center shrink-0">
                {initials}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-ink-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-card border border-border-subtle rounded-lg shadow-card overflow-hidden">
                <div className="px-3.5 py-3 border-b border-border-subtle">
                  <p className="text-xs font-semibold text-ink-900 font-sans truncate">{adminName}</p>
                  <p className="text-[11px] text-ink-400 font-sans">Administrator</p>
                </div>
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-sans text-status-danger hover:bg-surface-card-hover transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
