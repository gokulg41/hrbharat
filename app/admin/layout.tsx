"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  UserPlus, 
  Building2, 
  LogOut, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('Administrator');
  const [companyName, setCompanyName] = useState('Corporate Node');

  useEffect(() => {
    async function getWorkspaceIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase.from('profiles').select('full_name, company_id').eq('id', user.id).single();
      if (profile?.full_name) setAdminName(profile.full_name);
      
      if (profile?.company_id) {
        const { data: comp } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
        if (comp?.name) setCompanyName(comp.name);
      }
    }
    getWorkspaceIdentity();
  }, []);

  const navigationLinks = [
    { name: 'My Portal', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Workforce Deck', href: '/admin', icon: UserPlus },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex antialiased selection:bg-teal-50">
      
      {/* SIDEBAR NAVIGATION GRID CONTAINER */}
      <aside className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col justify-between fixed h-screen z-30 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        
        <div className="p-6 space-y-8">
          {/* PREMIUM PREstige BRAND BANNER */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-600/10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-slate-900 block font-sans">HRBharat</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block -mt-0.5">V1.2 Elite</span>
            </div>
          </div>

          {/* ACTIVE WORKSPACE IDENTIFIER UNIT */}
          <div className="bg-slate-50/60 border border-slate-100 p-3 rounded-2xl flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/60 flex items-center justify-center shadow-2xs text-slate-600">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Workspace Node</span>
              <span className="text-xs font-bold text-slate-800 truncate block">{companyName}</span>
            </div>
          </div>

          {/* NAVIGATION LINKS CONTAINER */}
          <nav className="space-y-1.5">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block px-2 mb-3">Management Engine</span>
            {navigationLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isActive 
                      ? 'bg-teal-50/60 text-teal-800 shadow-3xs border border-teal-100/40 font-black' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span>{link.name}</span>
                  </div>
                  <ChevronRight className={`w-3 h-3 transition-transform opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM USER UTILITIES DRAWER */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/30">
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white shadow-xs flex items-center justify-center text-[11px] font-black text-slate-600 uppercase">
              {adminName.slice(0, 2)}
            </div>
            <div className="truncate">
              <span className="text-xs font-black text-slate-800 block truncate">{adminName}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase block -mt-0.5">Control Deck Admin</span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100/40 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Terminate Session</span>
          </button>
        </div>

      </aside>

      {/* RENDER BODY SECTOR OVERPASS */}
      <main className="flex-1 md:pl-64 min-h-screen">
        {children}
      </main>

    </div>
  );
}