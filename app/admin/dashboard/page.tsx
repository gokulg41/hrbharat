"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePlan } from '@/lib/usePlan';
import PlanGate from '@/components/PlanGate';
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  LogOut,
  Users,
  IndianRupee,
  CalendarClock,
  Activity,
  PieChart,
  CheckCircle2,
  XCircle,
  ClipboardList,
  UserPlus,
  Wallet,
  CheckSquare,
  BarChart3,
  MapPin,
  ShieldAlert,
  Building,
  Circle,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

/* ============================================================
   DESIGN TOKENS
   Local accent palette matching the dashboard spec. These sit
   on top of the shared CSS variables already defined for the
   app (surface / ink / brand / border / status) — only the
   dashboard route needs these extra tints, so they're kept here
   rather than added globally.
============================================================ */
const ACCENTS = {
  indigo: { bg: 'bg-[#EEF1FE]', text: 'text-[#3157D5]', ring: 'ring-[#3157D5]/15', bar: 'bg-[#3157D5]' },
  green: { bg: 'bg-[#ECFDF5]', text: 'text-[#10B981]', ring: 'ring-[#10B981]/15', bar: 'bg-[#10B981]' },
  amber: { bg: 'bg-[#FFFBEB]', text: 'text-[#F59E0B]', ring: 'ring-[#F59E0B]/15', bar: 'bg-[#F59E0B]' },
  purple: { bg: 'bg-[#F2F1FE]', text: 'text-[#6D5DFB]', ring: 'ring-[#6D5DFB]/15', bar: 'bg-[#6D5DFB]' },
  cyan: { bg: 'bg-[#ECFEFF]', text: 'text-[#06B6D4]', ring: 'ring-[#06B6D4]/15', bar: 'bg-[#06B6D4]' },
  rose: { bg: 'bg-[#FFF1F2]', text: 'text-[#F43F5E]', ring: 'ring-[#F43F5E]/15', bar: 'bg-[#F43F5E]' },
} as const;
type AccentKey = keyof typeof ACCENTS;
const DISTRIBUTION_CYCLE: AccentKey[] = ['indigo', 'green', 'amber', 'purple', 'cyan', 'rose'];

/* ============================================================
   Small formatting helpers — all derived from real data, never
   fabricated figures.
============================================================ */
function formatINR(n: number) {
  if (!n) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function firstName(full?: string) {
  if (!full) return 'there';
  return full.trim().split(' ')[0];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  const sLabel = s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const eLabel = e.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${sLabel} – ${eLabel} (${days} day${days === 1 ? '' : 's'})`;
}

/* ============================================================
   Tiny reusable pieces
============================================================ */
function Avatar({ name }: { name: string }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hues = [222, 160, 340, 30, 262, 195];
  const hue = hues[(name || '?').charCodeAt(0) % hues.length];
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-semibold shrink-0 font-sans"
      style={{ background: `hsl(${hue} 65% 94%)`, color: `hsl(${hue} 45% 38%)` }}
    >
      {initials}
    </span>
  );
}

function StatusPill({ children, tone = 'amber' as AccentKey }: { children: React.ReactNode; tone?: AccentKey }) {
  const c = ACCENTS[tone];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-sans ${c.bg} ${c.text}`}>
      {children}
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium font-sans bg-[var(--surface-card-hover)] text-ink-600">
      {children}
    </span>
  );
}

function CardHeader({
  icon,
  title,
  count,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-ink-400 shrink-0">{icon}</span>
        <h3 className="text-sm font-semibold text-ink-900 font-sans truncate">{title}</h3>
        {count !== undefined && <span className="text-xs font-medium text-ink-400 tabular-nums font-sans">({count})</span>}
      </div>
      {right}
    </div>
  );
}

function ViewAllLink({ href, label = 'View all' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-0.5 text-xs font-medium text-ink-400 hover:text-[#3157D5] transition-colors shrink-0 font-sans"
    >
      {label} <ChevronRight className="w-3 h-3" />
    </Link>
  );
}

function DashboardCard({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={`bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl shadow-card flex flex-col overflow-hidden scroll-mt-24 ${className || ''}`}
    >
      {children}
    </div>
  );
}

function EmptyState({
  icon,
  heading,
  description,
  compact = false,
}: {
  icon: React.ReactNode;
  heading: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center gap-2.5 px-6 ${compact ? 'py-8' : 'py-12'}`}>
      <div className="w-10 h-10 rounded-xl bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-ink-400">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink-900 font-sans">{heading}</p>
        <p className="text-xs text-ink-400 font-sans leading-relaxed max-w-[240px]">{description}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  accent,
  urgent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: AccentKey;
  urgent?: boolean;
}) {
  const c = ACCENTS[accent];
  return (
    <div className="group relative bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-card overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <div className={`w-9 h-9 rounded-xl ${c.bg} ${c.text} ring-1 ${c.ring} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400 font-sans mb-1.5">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[27px] leading-none font-bold text-ink-900 font-sans tabular-nums">{value}</span>
        {urgent && (
          <span className="text-[10px] font-semibold text-[#F59E0B] bg-[#FFFBEB] px-1.5 py-0.5 rounded-md font-sans">
            Action needed
          </span>
        )}
      </div>
      <p className="text-xs text-ink-400 font-sans mt-1.5">{sub}</p>
      <div className={`absolute inset-x-0 bottom-0 h-[3px] ${c.bar} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
    </div>
  );
}

function QuickAction({
  icon,
  label,
  href,
  badge,
  soon,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  badge?: number;
  soon?: boolean;
}) {
  const content = (
    <>
      <span className="w-8 h-8 rounded-lg bg-[var(--surface-card-hover)] flex items-center justify-center text-ink-600 group-hover:bg-[#EEF1FE] group-hover:text-[#3157D5] transition-colors duration-150 shrink-0">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium text-ink-900 font-sans text-left">{label}</span>
      {!!badge && badge > 0 && (
        <span className="text-[10px] font-semibold text-white bg-[#3157D5] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-sans">
          {badge}
        </span>
      )}
      {soon ? (
        <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-400 font-sans">Soon</span>
      ) : (
        <ChevronRight className="w-3.5 h-3.5 text-ink-400 group-hover:text-ink-900 transition-colors duration-150 shrink-0" />
      )}
    </>
  );
  const cls =
    'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent transition-colors duration-150 ' +
    (soon || !href
      ? 'opacity-60 cursor-not-allowed'
      : 'hover:bg-[var(--surface-card-hover)] hover:border-[var(--border-subtle)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]/30');

  if (soon || !href) {
    return (
      <div className={cls} aria-disabled="true">
        {content}
      </div>
    );
  }
  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

function BarRow({ label, count, pct, accent }: { label: string; count: number; pct: number; accent: AccentKey }) {
  const c = ACCENTS[accent];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-sans">
        <span className="text-ink-900 font-medium truncate">{label}</span>
        <span className="text-ink-400 tabular-nums shrink-0 ml-2">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--surface-card-hover)] overflow-hidden">
        <div
          className={`h-full rounded-full ${c.bar} transition-all duration-500`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
    </div>
  );
}

const ACTIVITY_ICON: Record<string, { icon: React.ReactNode; accent: AccentKey }> = {
  employee: { icon: <UserPlus className="w-3.5 h-3.5" />, accent: 'indigo' },
  leave: { icon: <CalendarClock className="w-3.5 h-3.5" />, accent: 'amber' },
  advance: { icon: <Wallet className="w-3.5 h-3.5" />, accent: 'rose' },
  log: { icon: <ClipboardList className="w-3.5 h-3.5" />, accent: 'cyan' },
};

/* ============================================================
   Main Component
============================================================ */
export default function AdminClientDashboard() {
  const router = useRouter();
  const { features } = usePlan();

  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [workforce, setWorkforce] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingAdvances, setPendingAdvances] = useState<any[]>([]);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [disconnectNode, setDisconnectNode] = useState(false);

  const [distributionView, setDistributionView] = useState<'department' | 'designation'>('department');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDashboardData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id,company_id, full_name, role')
        .eq('id', user.id)
        .single();

      if (!prof || prof.role !== 'admin') {
        router.push('/login');
        return;
      }
      setProfile(prof);

      if (!prof.company_id) {
        setDisconnectNode(true);
        setLoading(false);
        return;
      }

      // Check if owner or sub-admin
      const { data: empCheck } = await supabase
        .from('employees')
        .select('id, manager_id')
        .eq('auth_user_id', user.id)
        .single();
      const isOwner = !empCheck;

      const employeesQuery = supabase.from('employees').select('*').eq('company_id', prof.company_id);

      if (!isOwner) {
        employeesQuery.eq('manager_id', prof.id);
      }

      const [companyRes, employeesRes, leavesRes, advancesRes, logsRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', prof.company_id).single(),
        employeesQuery,
        supabase.from('leave_requests').select('*').eq('company_id', prof.company_id).eq('status', 'Pending'),
        supabase.from('advance_salary_requests').select('*').eq('company_id', prof.company_id).eq('status', 'Pending'),
        supabase.from('daily_tasks').select('*').eq('company_id', prof.company_id).order('created_at', { ascending: false }),
      ]);

      if (companyRes.data) setCompany(companyRes.data);
      if (employeesRes.data) setWorkforce(employeesRes.data);
      if (leavesRes.data) setPendingLeaves(leavesRes.data);
      if (advancesRes.data) setPendingAdvances(advancesRes.data);
      if (logsRes.data) setDailyLogs(logsRes.data);
      setLoading(false);
    }
    loadDashboardData();
  }, [router]);

  // Close the profile menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleActionUpdate = async (
    table: 'leave_requests' | 'advance_salary_requests',
    id: string,
    status: 'Approved' | 'Rejected'
  ) => {
    if (!profile?.company_id) return;
    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (!error) {
      if (table === 'leave_requests') setPendingLeaves((p) => p.filter((i) => i.id !== id));
      else setPendingAdvances((p) => p.filter((i) => i.id !== id));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  /* ── Derived, real-data-only view models ── */
  const totalActiveWorkers = workforce.length;
  const totalMonthlyPayroll = workforce.reduce((sum, emp) => sum + (Number(emp.monthly_salary) || 0), 0);
  const notificationsCount = pendingLeaves.length + (features.advanceSalary ? pendingAdvances.length : 0);

  const recentlyAddedCount = useMemo(() => {
    const now = new Date();
    return workforce.filter((e: any) => {
      if (!e.created_at) return false;
      const d = new Date(e.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [workforce]);

  const distribution = useMemo(() => {
    const key = distributionView;
    const map = new Map<string, number>();
    workforce.forEach((e: any) => {
      const k = (e[key] as string) || 'Unassigned';
      map.set(k, (map.get(k) || 0) + 1);
    });
    const total = workforce.length || 1;
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [workforce, distributionView]);

  const recentActivity = useMemo(() => {
    type Item = { id: string; type: keyof typeof ACTIVITY_ICON; label: string; at: string };
    const items: Item[] = [];
    workforce.forEach((e: any) => {
      if (e.created_at) items.push({ id: `emp-${e.id}`, type: 'employee', label: `${e.full_name} was added to the team`, at: e.created_at });
    });
    dailyLogs.forEach((l: any) => {
      const at = l.submitted_at || l.created_at;
      if (at) items.push({ id: `log-${l.id}`, type: 'log', label: `${l.employee_name} submitted an EOD log`, at });
    });
    pendingLeaves.forEach((p: any) => {
      if (p.created_at) items.push({ id: `lv-${p.id}`, type: 'leave', label: `${p.employee_name} requested ${p.leave_type} leave`, at: p.created_at });
    });
    if (features.advanceSalary) {
      pendingAdvances.forEach((a: any) => {
        if (a.created_at) items.push({ id: `adv-${a.id}`, type: 'advance', label: `${a.employee_name} requested a salary advance`, at: a.created_at });
      });
    }
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);
  }, [workforce, dailyLogs, pendingLeaves, pendingAdvances, features.advanceSalary]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-canvas)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-sm bg-surface-card-hover animate-pulse" />
          <p className="text-sm text-ink-400 font-medium font-sans">Loading workspace…</p>
        </div>
      </div>
    );
  }

  /* ── Disconnected ── */
  if (disconnectNode) {
    return (
      <div className="min-h-screen bg-[var(--surface-canvas)] flex items-center justify-center p-6">
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-8 max-w-sm w-full shadow-card">
          <div className="w-9 h-9 rounded-lg bg-[#FFFBEB] border border-amber-100 flex items-center justify-center mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-base font-semibold text-ink-900 font-sans">No workspace connected</h2>
          <p className="text-sm text-ink-600 mt-1.5 leading-relaxed font-sans">
            Your account is authenticated but not linked to a company. Please complete your workspace setup to continue.
          </p>
        </div>
      </div>
    );
  }

  const adminInitials = (profile?.full_name || 'Administrator')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  /* ────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen bg-[var(--surface-canvas)] antialiased"
      style={{ backgroundImage: 'radial-gradient(circle at 85% 5%, rgba(99,102,241,0.06), transparent 30%)' }}
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[var(--surface-canvas)]/90 backdrop-blur border-b border-[var(--border-subtle)]">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-900 font-sans tracking-tight truncate">
              Good {getTimeGreeting()}, {firstName(profile?.full_name)} 👋
            </h1>
            <p className="text-sm text-ink-600 font-sans mt-0.5">
              Here&apos;s what&apos;s happening in{' '}
              <span className="font-medium text-ink-900">{company?.name || 'your workspace'}</span> today.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 w-64 lg:w-80 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2 text-sm transition-colors duration-150 focus-within:border-[#3157D5]/50 focus-within:ring-2 focus-within:ring-[#3157D5]/10">
              <Search className="w-4 h-4 shrink-0 text-ink-400" />
              <input
                type="text"
                placeholder="Search employees, payroll, reports..."
                className="bg-transparent outline-none flex-1 text-ink-900 placeholder:text-ink-400 font-sans min-w-0"
              />
              <kbd className="hidden lg:inline-flex text-[10px] font-medium text-ink-400 border border-[var(--border-subtle)] rounded px-1.5 py-0.5 font-sans">
                ⌘K
              </kbd>
            </div>

            {/* Notifications */}
            <Link
              href={notificationsCount > 0 ? '#leave-requests' : '#'}
              className="relative w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center justify-center text-ink-600 hover:text-ink-900 hover:bg-[var(--surface-card-hover)] transition-colors duration-150"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#F43F5E] text-white text-[9px] font-bold flex items-center justify-center font-sans">
                  {notificationsCount}
                </span>
              )}
            </Link>

            {/* Help */}
            <button
              type="button"
              title="Help & support"
              className="hidden sm:flex w-9 h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] items-center justify-center text-ink-600 hover:text-ink-900 hover:bg-[var(--surface-card-hover)] transition-colors duration-150"
              aria-label="Help & support"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Profile */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] pl-1 pr-2 py-1 hover:bg-[var(--surface-card-hover)] transition-colors duration-150"
              >
                <span className="w-7 h-7 rounded-full bg-[#EEF1FE] text-[#3157D5] flex items-center justify-center text-[11px] font-semibold font-sans">
                  {adminInitials}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-ink-400 transition-transform duration-150 ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                    <p className="text-sm font-semibold text-ink-900 font-sans truncate">{profile?.full_name || 'Administrator'}</p>
                    <p className="text-xs text-ink-400 font-sans">Administrator</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-sans text-rose-600 hover:bg-[var(--surface-card-hover)] transition-colors duration-150"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-5 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
        {/* ── Lightweight hero actions ── */}
        <div className="flex items-center gap-4 -mt-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-[#3157D5] transition-colors font-sans font-medium"
          >
            <Users className="w-3.5 h-3.5" />
            Staff directory
          </Link>
          <span className="text-[var(--border-subtle)]">·</span>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-ink-600 hover:text-[#3157D5] transition-colors font-sans font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Onboard employee
          </Link>
        </div>

        {/* ── KPI Row ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          <MetricCard
            label="Active Employees"
            value={String(totalActiveWorkers)}
            sub={totalActiveWorkers === 0 ? 'No hires yet' : `${recentlyAddedCount} added this month`}
            icon={<Users className="w-4 h-4" />}
            accent="indigo"
          />
          <MetricCard
            label="Monthly Payroll"
            value={formatINR(totalMonthlyPayroll)}
            sub={totalMonthlyPayroll === 0 ? 'Runs after roster is set' : 'Gross monthly liability'}
            icon={<IndianRupee className="w-4 h-4" />}
            accent="green"
          />
          <MetricCard
            label="On Leave Today"
            value={String(pendingLeaves.length)}
            sub={pendingLeaves.length === 0 ? 'Pending approvals' : `${pendingLeaves.length} awaiting your review`}
            icon={<CalendarClock className="w-4 h-4" />}
            accent="amber"
            urgent={pendingLeaves.length > 0}
          />
          <MetricCard
            label="Attendance Today"
            value="—"
            sub="Needs first check-in"
            icon={<Activity className="w-4 h-4" />}
            accent="purple"
          />
        </section>

        {/* ── Row 1: Attendance overview / Check-ins / Quick actions ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <DashboardCard>
            <CardHeader icon={<PieChart className="w-3.5 h-3.5" />} title="Attendance overview" />
            <EmptyState
              icon={<PieChart className="w-5 h-5" />}
              heading="Attendance data will appear here"
              description="Once your team starts checking in, you'll see today's attendance breakdown."
            />
          </DashboardCard>

          <DashboardCard>
            <CardHeader icon={<Activity className="w-3.5 h-3.5" />} title="Check-ins by hour (today)" />
            <EmptyState
              icon={<Activity className="w-5 h-5" />}
              heading="No check-ins yet today"
              description="Check-in activity will appear here once employees start punching in."
            />
          </DashboardCard>

          <DashboardCard>
            <CardHeader icon={<Sparkles className="w-3.5 h-3.5" />} title="Quick Actions" />
            <div className="p-2.5 space-y-0.5">
              <QuickAction icon={<UserPlus className="w-4 h-4" />} label="Add Employee" href="/admin" />
              <QuickAction icon={<Wallet className="w-4 h-4" />} label="Run Payroll" href="/admin/payroll" />
              <QuickAction
                icon={<CheckSquare className="w-4 h-4" />}
                label="Approve Leave"
                href="#leave-requests"
                badge={pendingLeaves.length}
              />
              {features.advanceSalary && (
                <QuickAction icon={<IndianRupee className="w-4 h-4" />} label="Add Advance" href="/admin" badge={pendingAdvances.length} />
              )}
              <QuickAction icon={<BarChart3 className="w-4 h-4" />} label="View Insights" soon />
            </div>
          </DashboardCard>
        </section>

        {/* ── Row 2: Leave & advances / Payroll summary / Recent activity ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Leave + Advances */}
          <div className="space-y-6">
            <DashboardCard id="leave-requests">
              <CardHeader
                icon={<Circle className="w-3 h-3 fill-amber-400 text-amber-400" />}
                title="Leave requests"
                right={<ViewAllLink href="/admin" />}
              />
              {pendingLeaves.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  heading="You're all caught up"
                  description="No pending leave requests right now."
                  compact
                />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
                  {pendingLeaves.map((ticket) => (
                    <div key={ticket.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-[var(--surface-card-hover)] transition-colors duration-150">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Avatar name={ticket.employee_name} />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-ink-900 font-sans leading-snug">{ticket.employee_name}</p>
                            <Badge>{ticket.employee_code}</Badge>
                          </div>
                          <p className="text-[11px] text-ink-400 font-sans">
                            {ticket.leave_type} · {formatDateRange(ticket.start_date, ticket.end_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusPill tone="amber">Pending</StatusPill>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleActionUpdate('leave_requests', ticket.id, 'Approved')}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-status-success-bg transition-colors duration-150 cursor-pointer"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleActionUpdate('leave_requests', ticket.id, 'Rejected')}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-status-danger-bg transition-colors duration-150 cursor-pointer"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>

            <PlanGate feature="advanceSalary">
              <DashboardCard>
                <CardHeader
                  icon={<Circle className="w-3 h-3 fill-rose-400 text-rose-400" />}
                  title="Advance requests"
                  count={pendingAdvances.length}
                />
                {pendingAdvances.length === 0 ? (
                  <EmptyState
                    icon={<Wallet className="w-5 h-5" />}
                    heading="Nothing pending"
                    description="No salary advance requests right now."
                    compact
                  />
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)] max-h-64 overflow-y-auto">
                    {pendingAdvances.map((claim) => (
                      <div key={claim.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-[var(--surface-card-hover)] transition-colors duration-150">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Avatar name={claim.employee_name} />
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-ink-900 font-sans leading-snug">{claim.employee_name}</p>
                              <Badge>{claim.employee_code}</Badge>
                            </div>
                            <p className="text-xs font-semibold text-rose-600 font-sans">
                              ₹{Number(claim.requested_amount).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <button
                            onClick={() => handleActionUpdate('advance_salary_requests', claim.id, 'Approved')}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-status-success-bg transition-colors duration-150 cursor-pointer"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleActionUpdate('advance_salary_requests', claim.id, 'Rejected')}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-status-danger-bg transition-colors duration-150 cursor-pointer"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>
            </PlanGate>
          </div>

          {/* Payroll summary */}
          <DashboardCard>
            <CardHeader icon={<IndianRupee className="w-3.5 h-3.5" />} title="Payroll summary" right={<ViewAllLink href="/admin/payroll" label="View details" />} />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-sm font-sans">
                <span className="text-ink-600">Total Employees</span>
                <span className="font-semibold text-ink-900 tabular-nums">{totalActiveWorkers}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-sans">
                <span className="text-ink-600">Gross Payroll</span>
                <span className="font-semibold text-ink-900 tabular-nums">{formatINR(totalMonthlyPayroll)}</span>
              </div>
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <p className="text-xs text-ink-400 font-sans leading-relaxed">
                  Deduction breakdown will appear here once a payroll run has been processed for this cycle.
                </p>
              </div>
            </div>
          </DashboardCard>

          {/* Recent activity */}
          <DashboardCard>
            <CardHeader icon={<ClipboardList className="w-3.5 h-3.5" />} title="Recent activity" />
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="w-5 h-5" />}
                heading="Your workspace is quiet"
                description="Activity will appear here as your team starts using HRBharat."
                compact
              />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] max-h-96 overflow-y-auto">
                {recentActivity.map((item) => {
                  const meta = ACTIVITY_ICON[item.type];
                  const c = ACCENTS[meta.accent];
                  return (
                    <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                      <span className={`w-7 h-7 rounded-lg ${c.bg} ${c.text} flex items-center justify-center shrink-0 mt-0.5`}>
                        {meta.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-ink-900 font-sans leading-snug">{item.label}</p>
                        <p className="text-[11px] text-ink-400 font-sans mt-0.5">{timeAgo(item.at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashboardCard>
        </section>

        {/* ── Row 3: Team distribution / Compliance ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <DashboardCard>
            <CardHeader
              icon={<Users className="w-3.5 h-3.5" />}
              title="Team distribution"
              right={
                <div className="flex items-center gap-1 bg-[var(--surface-card-hover)] rounded-lg p-0.5">
                  {(['department', 'designation'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setDistributionView(v)}
                      className={`text-[11px] font-medium font-sans px-2.5 py-1 rounded-md transition-colors duration-150 capitalize ${
                        distributionView === v ? 'bg-[var(--surface-card)] text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-900'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              }
            />
            {workforce.length === 0 ? (
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                heading="Team distribution will appear here"
                description="Once you onboard employees, you'll see how your team breaks down."
              />
            ) : (
              <div className="p-5 space-y-4">
                {distribution.map((row, i) => (
                  <BarRow key={row.label} label={row.label} count={row.count} pct={row.pct} accent={DISTRIBUTION_CYCLE[i % DISTRIBUTION_CYCLE.length]} />
                ))}
              </div>
            )}
          </DashboardCard>

          <PlanGate feature="customGeofence">
            <DashboardCard>
              <CardHeader icon={<MapPin className="w-3.5 h-3.5" />} title="Compliance" />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#ECFEFF] ring-1 ring-[#06B6D4]/15 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-[#06B6D4]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-ink-900 font-sans">Geofenced Check-ins</p>
                      <StatusPill tone="green">Active</StatusPill>
                    </div>
                    <p className="text-xs text-ink-600 font-sans mt-1 leading-relaxed">
                      Attendance is restricted to within{' '}
                      <span className="font-semibold text-ink-900">{company?.allowed_radius_meters || 100} meters</span> of your
                      registered office location.
                    </p>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </PlanGate>
        </section>

        {/* ── Row 4: Daily output logs ── */}
        <PlanGate feature="eodReports">
          <DashboardCard>
            <CardHeader icon={<ClipboardList className="w-3.5 h-3.5" />} title="Daily output logs" count={dailyLogs.length} />
            {dailyLogs.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-5 h-5" />}
                heading="No EOD logs submitted yet"
                description="Daily output logs will appear here once your team starts submitting them."
              />
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] max-h-[28rem] overflow-y-auto">
                {dailyLogs.map((log) => (
                  <div key={log.id} className="px-5 py-4 hover:bg-[var(--surface-card-hover)] transition-colors duration-150 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={log.employee_name} />
                        <div>
                          <span className="text-sm font-semibold text-ink-900 font-sans">{log.employee_name}</span>
                          <Badge>{log.employee_code}</Badge>
                        </div>
                      </div>
                      <span className="text-[10px] font-sans text-ink-400 shrink-0 tabular-nums">
                        {new Date(log.submitted_at || log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    {log.task_priorities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-[42px]">
                        {log.task_priorities.map((task: string, i: number) => (
                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium font-sans bg-[#ECFEFF] text-[#06B6D4]">
                            {task}
                          </span>
                        ))}
                      </div>
                    )}
                    {log.eod_submission && (
                      <p className="text-[12.5px] text-ink-600 font-sans leading-relaxed pl-[18px] border-l-2 border-[var(--border-subtle)] ml-[24px]">
                        {log.eod_submission}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DashboardCard>
        </PlanGate>
      </div>
    </div>
  );
}