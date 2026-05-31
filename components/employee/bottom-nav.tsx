'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, CalendarDays, Receipt, User } from 'lucide-react';

export default function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', path: '/employee/dashboard', icon: Home },
    { label: 'Clock', path: '/employee/attendance', icon: Clock },
    { label: 'Leave', path: '/employee/leave', icon: CalendarDays },
    { label: 'Salary', path: '/employee/payslips', icon: Receipt },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 h-16 flex items-center justify-around px-2 z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        return (
          <Link key={item.path} href={item.path} className="flex flex-col items-center justify-center flex-1 h-full space-y-0.5 transition-colors duration-150">
            <Icon className={`w-5 h-5 ${isActive ? 'text-slate-900 stroke-[2.5px]' : 'text-slate-400 stroke-[1.8px]'}`} />
            <span className={`text-[10px] font-bold ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}