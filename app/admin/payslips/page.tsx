"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  Download,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Bell,
  HelpCircle,
  Filter,
  Calendar,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  Zap,
  Play,
  DownloadCloud,
  Settings,
  BarChart3,
  X,
  Loader2,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL (verified against live schema before writing this file)
   ─────────────────────────────────────────────
   - `payroll_ledger` is the real, actively-written payroll source of truth —
     confirmed by reading the live Payroll page, which queries/writes
     payroll_ledger exclusively (never `payroll`, which is a 1-row orphan
     table, or `payroll_calculations`, which is a read-only view). Every
     KPI, filter and table row on this page is built from payroll_ledger
     + payslips, not the orphan `payroll` table.
   - `payslips.payroll_id` previously had a foreign key pointing at the
     orphan `payroll` table. It has been migrated to point at
     `payroll_ledger.id` instead — otherwise a real payslip could never be
     linked to a real payroll run.
   - `payslips` had row-level security enabled with zero policies, meaning
     it was unreadable/unwritable by anyone. A policy mirroring
     payroll_ledger's ("owners can manage rows for their company") has been
     added — see the schema notes file shipped alongside this page.
   - `payroll_status` enum (used by payslips.status) only has three values:
     pending, processing, paid. There is no "failed" or "scheduled" value
     at the database level. This page maps: paid → Generated (green),
     processing → Scheduled (blue), pending → Pending (orange), and falls
     back generically for any future enum value so styling never breaks.
   - `payslips` started empty (0 rows) and has no PDF-generation pipeline
     anywhere in the codebase. "Generate Payslips" here writes real rows
     into `payslips` (base_salary/deductions/net_paid derived from the
     matching payroll_ledger row — never fabricated), but pdf_url stays
     null until a real PDF pipeline exists. Download reflects that
     honestly instead of faking a file — see the "not generated yet" /
     "PDF pending" states below.
   - payroll_ledger stores `employee_code` (text), not employee_id. To
     generate payslips we resolve employee_code → employees.id via a
     lookup fetched alongside the ledger, and never fabricate an employee
     record for a code we can't resolve.
───────────────────────────────────────────── */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCurrentMonthYear() {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

/** Parses a "Month Year" string (e.g. "August 2026") into a first/last day range. Returns null if unparseable. */
function parseMonthYear(monthYear: string): { start: Date; end: Date; monthIdx: number; year: number } | null {
  if (!monthYear) return null;
  const parts = monthYear.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const monthIdx = MONTHS.findIndex((m) => m.toLowerCase() === parts[0].toLowerCase());
  const year = parseInt(parts[1], 10);
  if (monthIdx === -1 || Number.isNaN(year)) return null;
  return {
    start: new Date(year, monthIdx, 1),
    end: new Date(year, monthIdx + 1, 0),
    monthIdx,
    year,
  };
}

function formatDateRange(monthYear: string) {
  const parsed = parseMonthYear(monthYear);
  if (!parsed) return monthYear;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(1)} ${MONTHS_SHORT[parsed.monthIdx]} - ${pad(parsed.end.getDate())} ${MONTHS_SHORT[parsed.monthIdx]} ${parsed.year}`;
}

function formatFullINR(n: number) {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return { date: '-', time: '' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

/** Maps payroll_status enum values (and any legacy free-text) to a display badge. Never invents a status. */
function payslipStatusStyle(raw: string | null) {
  const s = (raw || '').toLowerCase();
  if (s === 'paid') return { label: 'Generated', color: 'emerald' };
  if (s === 'processing') return { label: 'Scheduled', color: 'blue' };
  if (s === 'pending') return { label: 'Pending', color: 'amber' };
  if (s.includes('fail')) return { label: 'Failed', color: 'rose' };
  return { label: 'Pending', color: 'amber' };
}

function Avatar({ name }: { name: string }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hues = [210, 160, 340, 30, 280, 195, 15];
  const hue = hues[(name || '').charCodeAt(0) % hues.length];
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[12px] font-semibold shrink-0 font-sans"
      style={{ background: `hsl(${hue} 55% 88%)`, color: `hsl(${hue} 50% 35%)` }}
    >
      {initials}
    </span>
  );
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    gray: 'bg-surface-card-hover text-ink-600 border-border-subtle',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border font-sans ${map[color]}`}>
      {children}
    </span>
  );
}

function LockedFeatureNote({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-white border border-[var(--border-subtle)] flex items-center justify-center">
          <Zap className="w-5 h-5 text-ink-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-900 font-sans">{title}</p>
          <p className="text-xs text-ink-600 font-sans leading-relaxed">
            This isn&apos;t live yet — it&apos;s on the roadmap and will unlock here once it ships.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full text-sm font-medium font-sans px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

type LedgerRow = {
  id: string;
  company_id: string;
  employee_code: string;
  employee_name: string;
  designation: string | null;
  department: string | null;
  month_year: string;
  gross_salary: number;
  epf_deduction: number;
  esic_deduction: number;
  prof_tax_deduction: number;
  net_take_home: number;
  status: string;
  created_at: string;
};

type PayslipRow = {
  id: string;
  payroll_id: string;
  employee_id: string;
  company_id: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_paid: number;
  pdf_url: string | null;
  status: string;
  created_at: string;
};

/** A ledger run merged with its (possibly absent) generated payslip. */
type MergedRow = LedgerRow & {
  payslip: PayslipRow | null;
  displayStatus: { label: string; color: string };
};

export default function PayslipsPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState('Administrator');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [ledgerHistory, setLedgerHistory] = useState<LedgerRow[]>([]);
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [employeeCodeToId, setEmployeeCodeToId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'month' | '3months' | 'year'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return { monthIdx: now.getMonth(), year: now.getFullYear() };
  });

  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewingRow, setViewingRow] = useState<MergedRow | null>(null);
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const targetMonth = getCurrentMonthYear();

  /* ── Load data ── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('company_id, role, full_name').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/login'); return; }

      if (profile.full_name) setAdminName(profile.full_name.split(' ')[0]);
      setCompanyId(profile.company_id);

      const [ledgerRes, payslipRes, empRes] = await Promise.all([
        supabase.from('payroll_ledger').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
        supabase.from('payslips').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
        supabase.from('employees').select('id, employee_code, emp_code').eq('company_id', profile.company_id),
      ]);

      if (ledgerRes.error || payslipRes.error) {
        setLoadError(ledgerRes.error?.message || payslipRes.error?.message || 'Failed to load payslip data.');
      }
      if (ledgerRes.data) setLedgerHistory(ledgerRes.data as LedgerRow[]);
      if (payslipRes.data) setPayslips(payslipRes.data as PayslipRow[]);
      if (empRes.data) {
        const map: Record<string, string> = {};
        for (const e of empRes.data) {
          if (e.employee_code) map[e.employee_code] = e.id;
          if (e.emp_code) map[e.emp_code] = e.id;
        }
        setEmployeeCodeToId(map);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  /* ── Merge ledger + payslips ── */
  const payslipByPayrollId = useMemo(() => {
    const map: Record<string, PayslipRow> = {};
    for (const p of payslips) map[p.payroll_id] = p;
    return map;
  }, [payslips]);

  const mergedRows: MergedRow[] = useMemo(() => {
    return ledgerHistory.map((row) => {
      const payslip = payslipByPayrollId[row.id] || null;
      const displayStatus = payslip ? payslipStatusStyle(payslip.status) : { label: 'Pending', color: 'amber' };
      return { ...row, payslip, displayStatus };
    });
  }, [ledgerHistory, payslipByPayrollId]);

  /* ── Tab scoping (by month_year parsed against "today") ── */
  const now = new Date();
  const inLastNMonths = (monthYear: string, n: number) => {
    const parsed = parseMonthYear(monthYear);
    if (!parsed) return false;
    const monthsAgo = (now.getFullYear() - parsed.year) * 12 + (now.getMonth() - parsed.monthIdx);
    return monthsAgo >= 0 && monthsAgo < n;
  };
  const isThisMonth = (monthYear: string) => monthYear === targetMonth;
  const isThisYear = (monthYear: string) => {
    const parsed = parseMonthYear(monthYear);
    return !!parsed && parsed.year === now.getFullYear();
  };

  const tabCounts = useMemo(() => ({
    all: mergedRows.length,
    month: mergedRows.filter((r) => isThisMonth(r.month_year)).length,
    '3months': mergedRows.filter((r) => inLastNMonths(r.month_year, 3)).length,
    year: mergedRows.filter((r) => isThisYear(r.month_year)).length,
  }), [mergedRows]);

  const tabScoped = useMemo(() => {
    if (activeTab === 'month') return mergedRows.filter((r) => isThisMonth(r.month_year));
    if (activeTab === '3months') return mergedRows.filter((r) => inLastNMonths(r.month_year, 3));
    if (activeTab === 'year') return mergedRows.filter((r) => isThisYear(r.month_year));
    return mergedRows;
  }, [mergedRows, activeTab]);

  /* ── Filters ── */
  const departments = useMemo(() => ['All', ...Array.from(new Set(mergedRows.map((r) => r.department).filter(Boolean)))] as string[], [mergedRows]);
  const monthOptions = useMemo(() => ['All', ...Array.from(new Set(mergedRows.map((r) => r.month_year)))], [mergedRows]);
  const statusOptions = ['All', 'Generated', 'Pending', 'Scheduled', 'Failed'];

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tabScoped.filter((r) => {
      if (deptFilter !== 'All' && r.department !== deptFilter) return false;
      if (monthFilter !== 'All' && r.month_year !== monthFilter) return false;
      if (statusFilter !== 'All' && r.displayStatus.label !== statusFilter) return false;
      if (!q) return true;
      return (
        r.employee_name.toLowerCase().includes(q) ||
        r.employee_code.toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q)
      );
    });
  }, [tabScoped, deptFilter, monthFilter, statusFilter, searchQuery]);

  useEffect(() => { setPage(1); }, [activeTab, deptFilter, monthFilter, statusFilter, searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ── KPIs (real, from payroll_ledger + payslips — never hardcoded) ── */
  const thisMonthRows = useMemo(() => mergedRows.filter((r) => isThisMonth(r.month_year)), [mergedRows]);
  const totalPayslipsKpi = mergedRows.length; // every payroll run implies a payslip is owed
  const thisMonthKpi = thisMonthRows.length;
  const totalNetPayKpi = thisMonthRows.reduce((s, r) => s + Number(r.net_take_home), 0);
  const pendingKpi = mergedRows.filter((r) => r.displayStatus.label === 'Pending').length;

  /* ── Right-rail summary (this month) ── */
  const totalDeductionsKpi = thisMonthRows.reduce((s, r) => s + (Number(r.gross_salary) - Number(r.net_take_home)), 0);
  const netPays = thisMonthRows.map((r) => Number(r.net_take_home));
  const avgNetPay = netPays.length ? netPays.reduce((a, b) => a + b, 0) / netPays.length : 0;
  const highestNetPay = netPays.length ? Math.max(...netPays) : 0;
  const lowestNetPay = netPays.length ? Math.min(...netPays) : 0;

  /* ── Calendar (real "Generated" dates only — nothing fabricated for Scheduled/Archive) ── */
  const generatedDatesInCursorMonth = useMemo(() => {
    const set = new Set<number>();
    for (const p of payslips) {
      const d = new Date(p.created_at);
      if (d.getFullYear() === calendarCursor.year && d.getMonth() === calendarCursor.monthIdx) {
        set.add(d.getDate());
      }
    }
    return set;
  }, [payslips, calendarCursor]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarCursor.year, calendarCursor.monthIdx, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(calendarCursor.year, calendarCursor.monthIdx + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarCursor.year, calendarCursor.monthIdx, 0).getDate();
    const cells: { day: number; inMonth: boolean; generated: boolean }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, inMonth: false, generated: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true, generated: generatedDatesInCursorMonth.has(d) });
    while (cells.length % 7 !== 0) cells.push({ day: cells.length, inMonth: false, generated: false });
    return cells;
  }, [calendarCursor, generatedDatesInCursorMonth]);

  const today = new Date();

  /* ── Generate Payslips: writes real rows for the current month's pending runs ── */
  const handleGeneratePayslips = async () => {
    if (!companyId) return;
    const pending = thisMonthRows.filter((r) => !r.payslip);
    if (pending.length === 0) {
      setStatusMsg({ type: 'success', text: 'Every payroll run for this month already has a payslip.' });
      return;
    }
    setGenerating(true);
    setStatusMsg(null);
    try {
      const records = pending
        .map((r) => {
          const employeeId = employeeCodeToId[r.employee_code];
          if (!employeeId) return null; // never fabricate an employee link
          const deductions = Number(r.gross_salary) - Number(r.net_take_home);
          return {
            payroll_id: r.id,
            employee_id: employeeId,
            company_id: companyId,
            base_salary: r.gross_salary,
            allowances: 0,
            deductions,
            net_paid: r.net_take_home,
            status: 'paid',
          };
        })
        .filter(Boolean);

      if (records.length === 0) {
        throw new Error('No matching employee records to link — nothing generated.');
      }

      const { data, error } = await supabase.from('payslips').insert(records as any[]).select();
      if (error) throw error;

      setPayslips((prev) => [...(data as PayslipRow[]), ...prev]);
      const skipped = pending.length - records.length;
      setStatusMsg({
        type: 'success',
        text: `Generated ${records.length} payslip${records.length === 1 ? '' : 's'} for ${targetMonth}.${skipped ? ` ${skipped} skipped (no linked employee record).` : ''} PDF files aren't wired up yet, so Download will show "PDF pending" until that pipeline exists.`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to generate payslips.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (row: MergedRow) => {
    if (row.payslip?.pdf_url) {
      window.open(row.payslip.pdf_url, '_blank');
    } else if (row.payslip) {
      setStatusMsg({ type: 'error', text: `Payslip record exists for ${row.employee_name}, but no PDF has been generated yet — the PDF pipeline isn't built.` });
    } else {
      setStatusMsg({ type: 'error', text: `No payslip has been generated for ${row.employee_name} yet. Use "Generate Payslips" first.` });
    }
  };

  const initials = adminName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-[var(--surface-card-hover)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-[var(--surface-card-hover)] rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-[var(--surface-card-hover)] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)]">

      {/* ── Header ── */}
      <div className="px-6 lg:px-8 pt-6 pb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900 font-sans">Good afternoon, {adminName} 👋</h1>
          <p className="text-xs text-ink-400 font-sans mt-0.5">Home <ChevronRight className="w-3 h-3 inline -mt-0.5" /> Payslips</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search employee by name, ID or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-10 py-2 w-72 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-400 font-sans border border-[var(--border-subtle)] rounded px-1">⌘K</span>
          </div>
          <button onClick={() => setLockedNote('Notifications')} className="relative p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)]">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">3</span>
          </button>
          <button onClick={() => setLockedNote('Help Center')} className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)]">
            <HelpCircle className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-[11px] font-semibold text-white font-sans">{initials}</div>
        </div>
      </div>

      {/* ── Page title ── */}
      <div className="px-6 lg:px-8 pt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 font-sans">Payslips</h2>
          <p className="text-sm text-ink-400 font-sans mt-0.5">View and download employee payslips and salary details.</p>
        </div>
      </div>

      {loadError && (
        <div className="mx-6 lg:mx-8 mt-4 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-sans flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {loadError}
        </div>
      )}
      {statusMsg && (
        <div className={`mx-6 lg:mx-8 mt-4 px-4 py-2.5 rounded-lg border text-xs font-sans flex items-center justify-between gap-2 ${statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
          <span className="flex items-center gap-2"><Info />{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="px-6 lg:px-8 pt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Payslips', value: totalPayslipsKpi.toLocaleString('en-IN'), sub: 'All time', icon: FileText, tint: 'blue' },
          { label: 'This Month', value: thisMonthKpi.toLocaleString('en-IN'), sub: targetMonth, icon: Calendar, tint: 'emerald' },
          { label: 'Total Net Pay', value: formatFullINR(totalNetPayKpi), sub: 'This month', icon: Wallet, tint: 'violet' },
          { label: 'Pending Payslips', value: pendingKpi.toLocaleString('en-IN'), sub: 'Yet to be generated', icon: Clock, tint: 'amber' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          const tintMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            violet: 'bg-violet-50 text-violet-600',
            amber: 'bg-amber-50 text-amber-600',
          };
          return (
            <div key={kpi.label} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tintMap[kpi.tint]}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-ink-900 font-sans mt-2 tabular-nums">{kpi.value}</p>
              <p className="text-xs text-ink-400 font-sans mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Main layout ── */}
      <div className="px-6 lg:px-8 pt-6 pb-8 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="min-w-0 space-y-4">

          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-[var(--border-subtle)] overflow-x-auto">
            {[
              { key: 'all', label: 'All Payslips' },
              { key: 'month', label: `This Month (${tabCounts.month})` },
              { key: '3months', label: `Last 3 Months (${tabCounts['3months']})` },
              { key: 'year', label: `This Year (${tabCounts.year})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`whitespace-nowrap pb-3 text-sm font-sans font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? 'border-brand text-brand font-semibold' : 'border-transparent text-ink-400 hover:text-ink-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search by employee name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400"
              />
            </div>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600">
              {departments.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
            </select>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600">
              {monthOptions.map((m) => <option key={m} value={m}>{m === 'All' ? 'All Months' : m}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600">
              {statusOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
            </select>
            <button onClick={() => setLockedNote('Advanced Filters')} className="flex items-center gap-1.5 text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 hover:bg-[var(--surface-card-hover)]">
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <FileText className="w-8 h-8 text-ink-400 mx-auto mb-3" />
                <p className="text-sm text-ink-400 font-sans italic">
                  {ledgerHistory.length === 0 ? 'No payroll has been run yet — payslips appear once payroll is processed.' : 'No payslips match these filters.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm font-sans">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-ink-400 text-left">
                        <th className="px-5 py-3 font-semibold">Employee</th>
                        <th className="px-5 py-3 font-semibold">Month</th>
                        <th className="px-5 py-3 font-semibold">Gross Salary</th>
                        <th className="px-5 py-3 font-semibold">Net Pay</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Generated On</th>
                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {pagedRows.map((row) => {
                        const gen = formatDateTime(row.payslip?.created_at || null);
                        return (
                          <tr key={row.id} className="hover:bg-[var(--surface-card-hover)] transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={row.employee_name} />
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink-900 truncate">{row.employee_name}</p>
                                  <p className="text-xs text-ink-400 truncate">{row.employee_code} • {row.department || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-ink-900">{row.month_year}</p>
                              <p className="text-xs text-ink-400">{formatDateRange(row.month_year)}</p>
                            </td>
                            <td className="px-5 py-3 tabular-nums text-ink-900">{formatFullINR(row.gross_salary)}</td>
                            <td className="px-5 py-3 tabular-nums font-semibold text-ink-900">{formatFullINR(row.net_take_home)}</td>
                            <td className="px-5 py-3"><Badge color={row.displayStatus.color}>{row.displayStatus.label}</Badge></td>
                            <td className="px-5 py-3">
                              {gen.date === '-' ? <span className="text-ink-400">-</span> : (
                                <>
                                  <p className="text-ink-900">{gen.date}</p>
                                  <p className="text-xs text-ink-400">{gen.time}</p>
                                </>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-1.5 relative">
                                <button onClick={() => setViewingRow(row)} title="View" className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]"><Eye className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDownload(row)} title="Download" className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]"><Download className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)} title="More" className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]"><MoreVertical className="w-3.5 h-3.5" /></button>
                                {openMenuId === row.id && (
                                  <div className="absolute right-0 top-8 z-10 w-40 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl py-1">
                                    <button onClick={() => { setOpenMenuId(null); setLockedNote('Resend Payslip'); }} className="w-full text-left px-3 py-1.5 text-xs text-ink-600 hover:bg-[var(--surface-card-hover)]">Resend to employee</button>
                                    <button onClick={() => { setOpenMenuId(null); setLockedNote('Regenerate Payslip'); }} className="w-full text-left px-3 py-1.5 text-xs text-ink-600 hover:bg-[var(--surface-card-hover)]">Regenerate</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-[var(--border-subtle)]">
                  {pagedRows.map((row) => (
                    <div key={row.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={row.employee_name} />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink-900 text-sm truncate">{row.employee_name}</p>
                            <p className="text-xs text-ink-400 truncate">{row.employee_code} • {row.department || '—'}</p>
                          </div>
                        </div>
                        <Badge color={row.displayStatus.color}>{row.displayStatus.label}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                        <div><p className="text-ink-400">Month</p><p className="text-ink-900">{row.month_year}</p></div>
                        <div><p className="text-ink-400">Net Pay</p><p className="text-ink-900 font-semibold">{formatFullINR(row.net_take_home)}</p></div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={() => setViewingRow(row)} className="flex-1 text-xs font-sans py-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600">View</button>
                        <button onClick={() => handleDownload(row)} className="flex-1 text-xs font-sans py-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600">Download</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-ink-400">
                  <span>Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} payslips</span>
                  <div className="flex items-center gap-3">
                    <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="text-xs font-sans bg-transparent border border-[var(--border-subtle)] rounded-lg px-2 py-1">
                      {[10, 25, 50].map((n) => <option key={n} value={n}>{n} rows</option>)}
                    </select>
                    <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => (
                      <button key={n} onClick={() => setPage(n)} className={`w-6 h-6 rounded-lg text-xs ${page === n ? 'bg-brand text-white font-semibold' : 'text-ink-600 hover:bg-[var(--surface-card-hover)]'}`}>{n}</button>
                    ))}
                    <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink-900 font-sans">Payslip Summary</p>
              <button onClick={() => setLockedNote('Full Payslip Summary')} className="text-xs font-sans font-semibold text-brand hover:underline">View all</button>
            </div>
            <div className="space-y-2.5 text-sm font-sans">
              <div className="flex items-center justify-between"><span className="text-ink-600 text-xs">Total Net Pay (This Month)</span><span className="text-ink-900 font-semibold tabular-nums">{formatFullINR(totalNetPayKpi)}</span></div>
              <div className="flex items-center justify-between"><span className="text-ink-600 text-xs">Total Deductions (This Month)</span><span className="text-ink-900 font-semibold tabular-nums">{formatFullINR(totalDeductionsKpi)}</span></div>
              <div className="flex items-center justify-between"><span className="text-ink-600 text-xs">Average Net Pay</span><span className="text-ink-900 font-semibold tabular-nums">{formatFullINR(avgNetPay)}</span></div>
              <div className="flex items-center justify-between"><span className="text-ink-600 text-xs">Highest Net Pay</span><span className="text-emerald-700 font-semibold tabular-nums">{formatFullINR(highestNetPay)}</span></div>
              <div className="flex items-center justify-between"><span className="text-ink-600 text-xs">Lowest Net Pay</span><span className="text-rose-600 font-semibold tabular-nums">{formatFullINR(lowestNetPay)}</span></div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink-900 font-sans">Payslip Calendar</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCalendarCursor((c) => c.monthIdx === 0 ? { monthIdx: 11, year: c.year - 1 } : { monthIdx: c.monthIdx - 1, year: c.year })} className="p-1 rounded-lg hover:bg-[var(--surface-card-hover)]"><ChevronLeft className="w-3.5 h-3.5 text-ink-600" /></button>
                <span className="text-xs font-sans text-ink-900 font-semibold w-24 text-center">{MONTHS[calendarCursor.monthIdx]} {calendarCursor.year}</span>
                <button onClick={() => setCalendarCursor((c) => c.monthIdx === 11 ? { monthIdx: 0, year: c.year + 1 } : { monthIdx: c.monthIdx + 1, year: c.year })} className="p-1 rounded-lg hover:bg-[var(--surface-card-hover)]"><ChevronRight className="w-3.5 h-3.5 text-ink-600" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-ink-400 font-sans text-center mb-1">
              {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((c, i) => {
                const isToday = c.inMonth && c.day === today.getDate() && calendarCursor.monthIdx === today.getMonth() && calendarCursor.year === today.getFullYear();
                return (
                  <div key={i} className={`aspect-square flex items-center justify-center text-[11px] font-sans rounded-lg relative
                    ${!c.inMonth ? 'text-ink-400/40' : c.generated ? 'bg-emerald-50 text-emerald-700 font-semibold' : isToday ? 'bg-brand-subtle text-brand font-semibold' : 'text-ink-600'}`}>
                    {c.day}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] font-sans text-ink-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Generated</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Scheduled</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Pending</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" />Archive</span>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Quick Actions</p>
            <div className="space-y-0.5">
              {[
                { label: 'Generate Payslips', icon: Play, action: handleGeneratePayslips, busy: generating },
                { label: 'Bulk Download', icon: DownloadCloud, action: () => setLockedNote('Bulk Download') },
                { label: 'Payslip Settings', icon: Settings, action: () => setLockedNote('Payslip Settings') },
                { label: 'Payslip Report', icon: BarChart3, action: () => setLockedNote('Payslip Report') },
              ].map(({ label, icon: Icon, action, busy }) => (
                <button key={label} onClick={action} disabled={busy} className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs font-sans text-ink-600 hover:bg-[var(--surface-card-hover)] hover:text-ink-900 transition-colors disabled:opacity-50">
                  <span className="flex items-center gap-2">
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                    {busy ? 'Generating…' : label}
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── View payslip modal ── */}
      {viewingRow && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewingRow(null)}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-ink-900 font-sans">Payslip — {viewingRow.month_year}</p>
              <button onClick={() => setViewingRow(null)}><X className="w-4 h-4 text-ink-400" /></button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Avatar name={viewingRow.employee_name} />
              <div>
                <p className="text-sm font-semibold text-ink-900 font-sans">{viewingRow.employee_name}</p>
                <p className="text-xs text-ink-400 font-sans">{viewingRow.employee_code} • {viewingRow.department || '—'} • {viewingRow.designation || '—'}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-sm font-sans border-t border-[var(--border-subtle)] pt-3">
              <div className="flex justify-between"><span className="text-ink-600">Gross Salary</span><span className="tabular-nums text-ink-900">{formatFullINR(viewingRow.gross_salary)}</span></div>
              <div className="flex justify-between"><span className="text-ink-600">EPF Deduction</span><span className="tabular-nums text-rose-600">-{formatFullINR(viewingRow.epf_deduction)}</span></div>
              <div className="flex justify-between"><span className="text-ink-600">ESIC Deduction</span><span className="tabular-nums text-rose-600">-{formatFullINR(viewingRow.esic_deduction)}</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Professional Tax</span><span className="tabular-nums text-rose-600">-{formatFullINR(viewingRow.prof_tax_deduction)}</span></div>
              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5 mt-1.5"><span className="text-ink-900 font-semibold">Net Pay</span><span className="tabular-nums text-emerald-700 font-bold">{formatFullINR(viewingRow.net_take_home)}</span></div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge color={viewingRow.displayStatus.color}>{viewingRow.displayStatus.label}</Badge>
              <button
                onClick={() => handleDownload(viewingRow)}
                className="flex items-center gap-1.5 text-xs font-sans font-semibold px-3 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {lockedNote && <LockedFeatureNote title={lockedNote} onClose={() => setLockedNote(null)} />}
    </div>
  );
}

function Info() {
  return <AlertCircle className="w-3.5 h-3.5 shrink-0" />;
}