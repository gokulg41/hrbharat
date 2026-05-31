"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, CalendarCheck, Wallet, 
  Settings, LogOut, FileText, UserCheck, Receipt 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState< 'owner' | 'employee' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setRole(profile.role as 'owner' | 'employee');
      }
      setLoading(false);
    }
    getUserRole();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="w-64 bg-white border-r h-screen animate-pulse" />;

  // Navigation configurations filtered by role state permissions
  const ownerLinks = [
    { name: 'Control Deck', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Staff Management', href: '/dashboard/employees', icon: Users },
    { name: 'Attendance Matrix', href: '/dashboard/attendance', icon: UserCheck },
    { name: 'Payroll Engine', href: '/dashboard/payroll', icon: Wallet },
    { name: 'Leave Approvals', href: '/dashboard/leave', icon: CalendarCheck },
    { name: 'System Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const employeeLinks = [
    { name: 'My Portal', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Mark Attendance', href: '/dashboard/attendance/check-in', icon: UserCheck },
    { name: 'Apply Leave', href: '/dashboard/leave', icon: CalendarCheck },
    { name: 'My Payslips', href: '/dashboard/payroll', icon: FileText },
    { name: 'Claim Reimbursements', href: '/dashboard/reimbursements', icon: Receipt },
  ];

  const activeLinks = role === 'owner' ? ownerLinks : employeeLinks;

  return (
    <div className="flex flex-col h-full bg-white px-4 py-6">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-black text-slate-950 tracking-tight">HRBharat</h1>
        <p className="text-[10px] uppercase font-bold tracking-widest text-teal-700 mt-0.5">
          {role === 'owner' ? 'Enterprise Admin Node' : 'Employee Terminal'}
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {activeLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200",
                isActive 
                  ? "bg-teal-50 text-teal-700 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <link.icon className={cn("w-5 h-5", isActive ? "text-teal-700" : "text-slate-400")} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          <span>Disconnect Session</span>
        </button>
      </div>
    </div>
  );
}