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
    <div className="min-h-screen bg-white flex font-sans text-[#37352f]">

      {/* ── SIDEBAR ── */}
      <aside className="w-60 bg-[#f7f6f3] border-r border-[#e9e9e7] hidden md:flex flex-col justify-between fixed h-screen z-30">

        <div className="flex flex-col gap-6 pt-4">

          {/* Workspace header */}
          <div className="px-3">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#ebebea] transition-colors cursor-default">
              <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
                <span className="text-white text-[8px] font-bold">HB</span>
              </div>
              <span className="text-sm font-semibold text-[#37352f] truncate">HRBharat</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-3 space-y-0.5">
            <p className="text-[10px] font-semibold text-[#9b9a97] uppercase tracking-widest px-2 mb-1">Workspace</p>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-[#ebebea] text-[#37352f] font-medium'
                      : 'text-[#787774] hover:bg-[#ebebea] hover:text-[#37352f]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#37352f]' : 'text-[#9b9a97] group-hover:text-[#787774]'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: user + logout */}
        <div className="px-3 pb-4 space-y-1 border-t border-[#e9e9e7] pt-3">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <div className="w-6 h-6 rounded-full bg-[#e9e9e7] flex items-center justify-center text-[10px] font-semibold text-[#787774] shrink-0 uppercase">
              {empName.slice(0, 2)}
            </div>
            <div className="truncate min-w-0">
              <p className="text-sm text-[#37352f] font-medium truncate">{empName}</p>
              {empCode && <p className="text-[10px] text-[#9b9a97] font-mono truncate">{empCode}</p>}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-[#787774] hover:bg-[#ebebea] hover:text-[#37352f] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>

      </aside>

      {/* ── CONTENT ── */}
      <main className="flex-1 md:pl-60 min-h-screen bg-white">
        {children}
      </main>

    </div>
  );
}