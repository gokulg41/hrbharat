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
  Banknote,
  ChevronRight,
  ChevronDown,
  Users,
  CalendarClock,
  Menu,
  X,
  Lock,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Nav structure — grouped like the reference design.
   IMPORTANT: only real, existing routes are linked.
   Items without a confirmed route in this codebase are
   rendered as disabled "Soon" entries instead of being
   invented — swap `href` in for the real route and flip
   `soon: false` as those pages ship.
───────────────────────────────────────────── */
type NavItem = {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

export default function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('Administrator');
  const [companyName, setCompanyName] = useState('Your Company');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lockedNav, setLockedNav] = useState<string | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  // Close drawer / dropdowns on route change
  useEffect(() => {
    setMobileOpen(false);
    setWorkspaceMenuOpen(false);
  }, [pathname]);

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

  // Existing routes only — grouped the way the reference design groups them.
  const navSections: NavSection[] = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'People',
      items: [
        { name: 'Employees', href: '/admin', icon: UserPlus },
        { name: 'Attendance & Shifts', href: '/admin/roster', icon: CalendarClock },
        { name: 'Leave', href: '/admin/leave', icon: Users },
        { name: 'Advances', href: '/admin/advances', icon: Banknote },
      ],
    },
    {
      label: 'Payroll',
      items: [
        { name: 'Payroll', href: '/admin/payroll', icon: Banknote },
        { name: 'Payslips', href: '/admin/payslips', icon: Banknote },
      ],
    },
    {
      label: 'Insights',
      items: [
        { name: 'Reports', href: '/admin/reports', icon: Users },
        { name: 'Analytics', icon: Users, soon: true },
      ],
    },
    {
      label: 'Settings',
      items: [
        { name: 'Company', href: '/admin/company', icon: Building2 },
        { name: 'Users & Access', icon: Lock, soon: true },
      ],
    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const initials = adminName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // Shared sidebar inner content
  const SidebarContent = () => (
    <>
      <div className="p-5 space-y-5">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white font-sans tracking-tight">HR</span>
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-white font-sans block leading-tight truncate">HRBharat</span>
            <span className="text-[10px] text-[var(--sidebar-text-muted)] block font-sans truncate">HR &amp; Payroll Software</span>
          </div>
        </div>

        {/* Workspace selector */}
        <div className="relative">
          <button
            onClick={() => setWorkspaceMenuOpen((v) => !v)}
            className="w-full bg-[var(--sidebar-bg-elevated)] border border-[var(--sidebar-border)] rounded-lg px-3 py-2.5 flex items-center gap-2.5 hover:border-white/20 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-md bg-white/10 border border-[var(--sidebar-border)] flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="truncate text-left flex-1">
              <span className="text-xs font-semibold text-white truncate block font-sans leading-tight">{companyName}</span>
              <span className="text-[10px] text-[var(--sidebar-text-muted)] block font-sans">Admin Workspace</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--sidebar-text-muted)] shrink-0 transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <span className="text-[10px] font-semibold uppercase text-[var(--sidebar-text-muted)] tracking-widest block px-2 mb-1.5 font-sans">
                {section.label}
              </span>
              <div className="space-y-0.5">
                {section.items.map((link) => {
                  const isActive = !!link.href && pathname === link.href;
                  const Icon = link.icon;

                  if (link.soon || !link.href) {
                    return (
                      <button
                        key={link.name}
                        onClick={() => setLockedNav(link.name)}
                        className="group w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-sans transition-colors text-[var(--sidebar-text-muted)] hover:bg-white/5 hover:text-slate-300 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{link.name}</span>
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--sidebar-text-muted)]">Soon</span>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-sans transition-colors ${
                        isActive
                          ? 'bg-[var(--sidebar-item-active-bg)] text-white font-semibold shadow-sm'
                          : 'text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--sidebar-text-muted)] group-hover:text-slate-300'}`} />
                        <span>{link.name}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3 h-3 text-white" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom user area */}
      <div className="p-4 border-t border-[var(--sidebar-border)] space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white font-sans shrink-0">
            {initials}
          </div>
          <div className="truncate">
            <span className="text-xs font-semibold text-white block truncate font-sans">{adminName}</span>
            <span className="text-[10px] text-[var(--sidebar-text-muted)] block font-sans">Administrator</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans text-rose-300 hover:bg-white/5 hover:text-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] flex antialiased">

      {/* ── Desktop sidebar ── */}
      <aside className="w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] hidden md:flex flex-col justify-between fixed h-screen z-30">
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
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
        className={`fixed top-0 left-0 h-screen w-72 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col justify-between z-50 md:hidden
          transition-transform duration-300 ease-in-out overflow-y-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Mobile: top bar ── */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-[var(--sidebar-bg)] border-b border-[var(--sidebar-border)] flex items-center px-4 gap-3 z-30 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-white font-sans">HR</span>
          </div>
          <span className="text-sm font-semibold text-white font-sans">HRBharat</span>
        </div>
      </div>

      {/* ── Page content ── */}
      <main className="flex-1 md:pl-64 min-h-screen pt-12 md:pt-0">
        {children}
      </main>

      {/* ── "Soon" nav item modal ── */}
      {lockedNav && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setLockedNav(null)}
        >
          <div
            className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-white border border-[var(--border-subtle)] flex items-center justify-center">
              <Zap className="w-5 h-5 text-ink-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink-900 font-sans">{lockedNav}</p>
              <p className="text-xs text-ink-600 font-sans leading-relaxed">
                This section isn&apos;t live yet — it&apos;s on the roadmap and will link here once it ships.
              </p>
            </div>
            <button
              onClick={() => setLockedNav(null)}
              className="w-full text-sm font-medium font-sans px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
}