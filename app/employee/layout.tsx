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
  Menu,
  X,
} from 'lucide-react';

export default function EmployeeSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [empName, setEmpName] = useState('Staff Member');
  const [empCode, setEmpCode] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const initials = empName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'EM';

  // Shared sidebar inner content — reused for desktop rail + mobile drawer
  const SidebarContent = () => (
    <>
      <div className="flex flex-col gap-6 pt-5">
        {/* Brand */}
        <div className="px-4 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold font-sans">HR</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white font-sans truncate leading-tight">HRBharat</p>
            <p className="text-[10px] text-[var(--sidebar-text-muted)] font-sans truncate">Employee Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase text-[var(--sidebar-text-muted)] tracking-widest px-2 mb-1.5 font-sans">
            Workspace
          </p>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-sans transition-colors ${
                  isActive
                    ? 'bg-[var(--sidebar-item-active-bg)] text-white font-semibold shadow-sm'
                    : 'text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--sidebar-text-muted)] group-hover:text-slate-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: user + logout */}
      <div className="px-3 pb-4 pt-3 border-t border-[var(--sidebar-border)] space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-[var(--sidebar-bg-elevated)] border border-[var(--sidebar-border)] flex items-center justify-center text-[11px] font-semibold text-white uppercase">
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-status-success border-2 border-[var(--sidebar-bg)]" />
          </div>
          <div className="truncate min-w-0">
            <p className="text-sm text-white font-medium font-sans truncate">{empName}</p>
            {empCode && <p className="text-[10px] text-[var(--sidebar-text-muted)] font-mono truncate">{empCode}</p>}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-sans text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface-canvas flex font-sans text-ink-900">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="w-56 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] hidden md:flex flex-col justify-between fixed h-screen z-30">
        <SidebarContent />
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-[var(--sidebar-bg)] border-b border-[var(--sidebar-border)] flex items-center justify-between px-4 z-30 md:hidden">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold font-sans">HR</span>
          </div>
          <span className="text-sm font-bold text-white font-sans">HRBharat</span>
        </div>
        <button
          onClick={() => setMobileNavOpen(true)}
          className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--sidebar-text)] hover:bg-white/5 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileNavOpen(false)} />
          <aside className="fixed top-0 left-0 h-screen w-72 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col justify-between z-50 md:hidden">
            <div className="flex justify-end px-3 pt-3">
              <button
                onClick={() => setMobileNavOpen(false)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--sidebar-text)] hover:bg-white/5 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-between -mt-8">
              <SidebarContent />
            </div>
          </aside>
        </>
      )}

      {/* ── CONTENT ── */}
      <main className="flex-1 md:pl-56 pt-14 md:pt-0 min-h-screen bg-surface-canvas">
        {children}
      </main>

    </div>
  );
}