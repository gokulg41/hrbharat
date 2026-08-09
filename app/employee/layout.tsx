"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  MapPin,
  CreditCard,
  Settings,
  LogOut,
  Home,
} from 'lucide-react';

export default function EmployeeSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [empName, setEmpName] = useState('Staff Member');
  const [empCode, setEmpCode] = useState('');

  useEffect(() => {
    async function getEmployeeIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase
        .from('employees')
        .select('full_name, employee_code')
        .eq('email', user.email?.toLowerCase().trim())
        .single();
      if (emp) {
        setEmpName(emp.full_name);
        setEmpCode(emp.employee_code);
      }
    }
    getEmployeeIdentity();
  }, []);

  const menuItems = [
    { name: 'Overview', href: '/employee', icon: Home },
    { name: 'Attendance', href: '/employee/attendance', icon: MapPin },
    { name: 'Payroll', href: '/employee/payroll', icon: CreditCard },
    { name: 'Settings', href: '/employee/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-surface-canvas flex font-sans text-ink-900">

      {/* ── SIDEBAR ── */}
      <aside className="w-60 bg-surface-card-hover border-r border-border-subtle hidden md:flex flex-col justify-between fixed h-screen z-30">

        <div className="flex flex-col gap-6 pt-4">

          {/* Workspace header */}
          <div className="px-3">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-border-subtle transition-colors cursor-default">
              <div className="w-5 h-5 rounded bg-brand flex items-center justify-center shrink-0">
                <span className="text-white text-[8px] font-bold">HB</span>
              </div>
              <span className="text-sm font-semibold text-ink-900 truncate">HRBharat</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-3 space-y-0.5">
            <p className="text-[10px] font-semibold text-ink-600 uppercase tracking-widest px-2 mb-1">Workspace</p>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-border-subtle text-ink-900 font-medium'
                      : 'text-ink-600 hover:bg-border-subtle hover:text-ink-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-ink-900' : 'text-ink-400 group-hover:text-ink-600'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: user + logout */}
        <div className="px-3 pb-4 space-y-1 border-t border-border-subtle pt-3">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <div className="w-6 h-6 rounded-full bg-border-subtle flex items-center justify-center text-[10px] font-semibold text-ink-600 shrink-0 uppercase">
              {empName.slice(0, 2)}
            </div>
            <div className="truncate min-w-0">
              <p className="text-sm text-ink-900 font-medium truncate">{empName}</p>
              {empCode && <p className="text-[10px] text-ink-600 font-mono truncate">{empCode}</p>}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-600 hover:bg-border-subtle hover:text-ink-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>

      </aside>

      {/* ── CONTENT ── */}
      <main className="flex-1 md:pl-60 min-h-screen bg-surface-canvas">
        {children}
      </main>

    </div>
  );
}