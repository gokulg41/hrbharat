"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePlan } from '@/lib/usePlan';
import {
  LayoutDashboard,
  UserPlus,
  Building2,
  LogOut,
  Banknote,
  ChevronRight,
  Users,
  Menu,
  X,
  Lock,
  Zap,
} from 'lucide-react';

export default function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('Administrator');
  const [companyName, setCompanyName] = useState('Your Company');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lockedNav, setLockedNav] = useState<string | null>(null);
  const { features, plan, loading: planLoading } = usePlan();

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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
    { name: 'My Portal',      href: '/admin/dashboard', icon: LayoutDashboard, locked: false },
    { name: 'Workforce Deck', href: '/admin',            icon: UserPlus,        locked: false },
    { name: 'Roster',         href: '/admin/roster',     icon: Users,           locked: false },
    { name: 'Payroll',        href: '/admin/payroll',    icon: Banknote,        locked: false },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const initials = adminName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // Shared sidebar inner content
  const SidebarContent = () => (
    <>
      <div className="p-5 space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-stone-100 font-sans tracking-tight">HR</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-stone-900 font-sans block leading-tight">HRBharat</span>
            <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-widest block font-sans">V1.2 Elite</span>
          </div>
        </div>

        {/* Workspace badge */}
        <div className="bg-[#F0EAD9] border border-[#DDD5C0] rounded-lg px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#FDF8F0] border border-[#DDD5C0] flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-stone-500" />
          </div>
          <div className="truncate">
            <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider block font-sans">Workspace Node</span>
            <span className="text-xs font-semibold text-stone-800 truncate block font-sans">{companyName}</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="space-y-0.5">
          <span className="text-[9px] font-semibold uppercase text-stone-400 tracking-widest block px-2 mb-2 font-sans">
            Management Engine
          </span>
          {navigationLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;

            if (link.locked) {
              return (
                <button
                  key={link.href}
                  onClick={() => setLockedNav(link.name)}
                  className="group w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-sans transition-colors text-stone-400 hover:bg-[#F0EAD9] hover:text-stone-500 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 text-stone-300 group-hover:text-stone-400" />
                    <span>{link.name}</span>
                  </div>
                  <Lock className="w-3 h-3 text-stone-300 group-hover:text-stone-400" />
                </button>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-sans transition-colors ${
                  isActive
                    ? 'bg-[#E8E0CC] text-stone-900 font-semibold'
                    : 'text-stone-500 hover:bg-[#F0EAD9] hover:text-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-stone-700' : 'text-stone-400 group-hover:text-stone-600'}`} />
                  <span>{link.name}</span>
                </div>
                {isActive && <ChevronRight className="w-3 h-3 text-stone-400" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom user area */}
      <div className="p-4 border-t border-[#DDD5C0] space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-[11px] font-semibold text-stone-600 font-sans shrink-0">
            {initials}
          </div>
          <div className="truncate">
            <span className="text-xs font-semibold text-stone-800 block truncate font-sans">{adminName}</span>
            <span className="text-[9px] font-medium text-stone-400 uppercase tracking-wide block font-sans">Control Deck Admin</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex antialiased">

      {/* ── Desktop sidebar ── */}
      <aside className="w-60 bg-[#FDF8F0] border-r border-[#DDD5C0] hidden md:flex flex-col justify-between fixed h-screen z-30">
        <SidebarContent />
      </aside>

      {/* ── Mobile: backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-[#FDF8F0] border-r border-[#DDD5C0] flex flex-col justify-between z-50 md:hidden
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-[#F0EAD9] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Mobile: top bar ── */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-[#FDF8F0] border-b border-[#DDD5C0] flex items-center px-4 gap-3 z-30 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-[#F0EAD9] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-stone-900 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-stone-100 font-sans">HR</span>
          </div>
          <span className="text-sm font-semibold text-stone-900 font-sans">HRBharat</span>
        </div>
      </div>

      {/* ── Page content ── */}
      <main className="flex-1 md:pl-60 min-h-screen pt-12 md:pt-0">
        {children}
      </main>

      {/* ── Locked feature upgrade modal ── */}
      {lockedNav && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setLockedNav(null)}
        >
          <div
            className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lock icon */}
            <div className="w-12 h-12 rounded-full bg-white border border-[#DDD5C0] flex items-center justify-center">
              <Lock className="w-5 h-5 text-stone-400" />
            </div>

            {/* Message */}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-stone-900 font-sans">{lockedNav}</p>
              <p className="text-xs text-stone-500 font-sans leading-relaxed">
                This feature is available on the{' '}
                <span className="font-semibold text-stone-800">Business plan</span> and above.
              </p>
            </div>

            {/* Plan badge */}
            <div className="flex items-center gap-2 bg-white border border-[#DDD5C0] rounded-lg px-4 py-2.5 text-sm font-sans">
              <Zap className="w-4 h-4 text-stone-400" />
              <span className="font-semibold text-stone-800">Business</span>
              <span className="text-stone-400">·</span>
              <span className="text-stone-500">₹3,999/mo</span>
              <span className="text-stone-400">·</span>
              <span className="text-xs text-stone-400">Up to 75 employees</span>
            </div>

            {/* Current plan */}
            <p className="text-xs text-stone-400 font-sans">
              Current plan:{' '}
              <span className="capitalize font-semibold text-stone-500">
                {plan === 'none' ? 'No active plan' : plan}
              </span>
            </p>

            {/* Actions */}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setLockedNav(null)}
                className="flex-1 text-sm font-medium font-sans px-4 py-2 rounded-lg border border-[#DDD5C0] text-stone-600 hover:bg-[#F0EAD9] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <Link
                href="/admin/settings/billing"
                className="flex-1 text-sm font-medium font-sans px-4 py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors text-center"
                onClick={() => setLockedNav(null)}
              >
                Upgrade plan
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}