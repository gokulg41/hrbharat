"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  MapPin, 
  CreditCard, 
  Settings, 
  LogOut, 
  ChevronRight,
  Sparkles,
  Home
} from 'lucide-react';

export default function EmployeeSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [empName, setEmpName] = useState('Staff Member');
  const [empCode, setEmpCode] = useState('HRB-NODE');

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
    { name: 'Overview Deck', href: '/employee', icon: Home },
    { name: 'Live Attendance', href: '/employee/attendance', icon: MapPin },
    { name: 'Payroll Ledger', href: '/employee/payroll', icon: CreditCard },
    { name: 'Account Settings', href: '/employee/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex antialiased">
      
      {/* PERSISTENT ULTRA-CLEAN SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col justify-between fixed h-screen z-30 shadow-[4px_0_24px_rgba(0,0,0,0.005)]">
        
        <div className="p-6 space-y-8">
          {/* BRAND IDENTIFIER */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-slate-900 block">HRBharat</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block -mt-0.5">Staff Node</span>
            </div>
          </div>

          {/* ACTIVE NAVIGATION ENGAGEMENT */}
          <nav className="space-y-1.5">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block px-2 mb-3">Workspace Controls</span>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive 
                      ? 'bg-slate-900 text-white font-black shadow-xs' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className={`w-3 h-3 transition-transform opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* PROFILE BASE MODULE */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/40">
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/50 flex items-center justify-center text-xs font-black text-slate-700 uppercase">
              {empName.slice(0, 2)}
            </div>
            <div className="truncate">
              <span className="text-xs font-black text-slate-800 block truncate">{empName}</span>
              <span className="text-[9px] font-mono font-bold text-slate-400 block -mt-0.5">{empCode}</span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100/40 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Close Session</span>
          </button>
        </div>

      </aside>

      {/* PRIMARY APPLICATION PORTAL VIEWPORT */}
      <main className="flex-1 md:pl-64 min-h-screen">
        {children}
      </main>

    </div>
  );
}