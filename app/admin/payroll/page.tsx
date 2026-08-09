"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { commitMonthlyPayrollAction } from '@/lib/actions';
import { calculateIndianPayrollBreakdown } from '@/lib/payroll-math';
import {
  Banknote,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
  Users,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Wallet,
  FileText,
  Bell,
  HelpCircle,
  Play,
  Zap,
  SlidersHorizontal,
  Settings,
  CalendarClock,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL ASSUMPTIONS (verify with Gokul)
   ─────────────────────────────────────────────
   - Per-employee "Processed / Draft" status is derived, not stored:
     an employee is "Processed" for the selected month if a
     payroll_ledger row exists for them with that month_year;
     otherwise "Draft" (computed preview, not yet disbursed).
     payroll_ledger.status has only ever been observed as 'paid',
     so "Pending"/"Failed" states from the reference aren't
     reachable with the current schema — badge colors are resolved
     generically so a future status value won't break styling.
   - KPI trend lines only render when payroll_ledger has 2+ distinct
     historical months to compare — no fabricated "+X% vs last
     month" when there isn't real history yet.
   - "Upcoming Payroll Dates" (run/payment/payslip-release dates)
     has no backing settings field anywhere in the schema, so it's
     left as a locked "Soon" card rather than inventing dates.
   - Location filter uses `branches` + `employees.branch_id`, which
     this page didn't previously query — added since both are real
     tables/columns.
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Avatar({ name }: { name: string }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hues = [210, 160, 340, 30, 280, 195];
  const hue = hues[(name || '').charCodeAt(0) % hues.length];
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[12px] font-semibold shrink-0 font-sans"
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

function Divider() {
  return <div className="border-t border-[var(--border-subtle)]" />;
}

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      {children}
    </div>
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

/* Tiny inline sparkline — only ever fed real historical ledger totals */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const w = 96, h = 28;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getCurrentMonthYear() {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

function formatINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function ledgerStatusStyle(raw: string) {
  const s = (raw || '').toLowerCase();
  if (s.includes('fail')) return { label: 'Failed', color: 'rose' };
  if (s.includes('pending')) return { label: 'Pending', color: 'amber' };
  if (s.includes('paid') || s.includes('process')) return { label: 'Processed', color: 'emerald' };
  return { label: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Processed', color: 'emerald' };
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function PayrollPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState('Administrator');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [ledgerHistory, setLedgerHistory] = useState<any[]>([]);
  const [branches, setBranches] = useState<{ id: string; branch_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [customMonth, setCustomMonth] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [deptFilter, setDeptFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'run' | 'history'>('run');
  const [lockedNote, setLockedNote] = useState<string | null>(null);

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

      const [empRes, ledgerRes, branchRes] = await Promise.all([
        supabase.from('employees').select('*').eq('company_id', profile.company_id).order('full_name'),
        supabase.from('payroll_ledger').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
        supabase.from('branches').select('id, branch_name').eq('company_id', profile.company_id),
      ]);

      if (empRes.data) setEmployees(empRes.data);
      if (ledgerRes.data) setLedgerHistory(ledgerRes.data);
      if (branchRes.data) setBranches(branchRes.data);
      setLoading(false);
    }
    load();
  }, [router]);

  /* ── Month picker ── */
  const targetMonth = customMonth.trim() || selectedMonth;
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  /* ── Ledger rows for the currently targeted month, keyed by employee_code ── */
  const ledgerForTargetMonth = useMemo(
    () => ledgerHistory.filter((r) => r.month_year === targetMonth),
    [ledgerHistory, targetMonth]
  );
  const ledgerByEmpCode = useMemo(
    () => Object.fromEntries(ledgerForTargetMonth.map((r) => [r.employee_code, r])),
    [ledgerForTargetMonth]
  );

  const departments = useMemo(() => ['All', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))], [employees]);

  /* ── Derived stats ── */
  const filtered = employees.filter((e) => {
    if (deptFilter !== 'All' && e.department !== deptFilter) return false;
    if (locationFilter !== 'All' && e.branch_id !== locationFilter) return false;
    if (statusFilter !== 'All') {
      const rowStatus = ledgerByEmpCode[e.employee_code] ? ledgerStatusStyle(ledgerByEmpCode[e.employee_code].status).label : 'Draft';
      if (rowStatus !== statusFilter) return false;
    }
    const q = searchQuery.toLowerCase();
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.employee_code.toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    );
  });

  const totalGross = employees.reduce((s, e) => s + (Number(e.monthly_salary) || 0), 0);
  const totalNet = employees.reduce((s, e) => {
    const b = calculateIndianPayrollBreakdown(e.monthly_salary);
    return s + b.netHome;
  }, 0);
  const totalDeductions = totalGross - totalNet;

  const processedCount = employees.filter((e) => !!ledgerByEmpCode[e.employee_code]).length;
  const pendingCount = employees.length - processedCount;
  const processedPct = employees.length > 0 ? (processedCount / employees.length) * 100 : 0;

  /* ── Real month-over-month trend from ledger history (never fabricated) ── */
  const ledgerByMonth = ledgerHistory.reduce((acc: Record<string, any[]>, row) => {
    if (!acc[row.month_year]) acc[row.month_year] = [];
    acc[row.month_year].push(row);
    return acc;
  }, {});
  const monthTotals = Object.entries(ledgerByMonth)
    .map(([month, rows]) => ({
      month,
      gross: (rows as any[]).reduce((s, r) => s + Number(r.gross_salary), 0),
      net: (rows as any[]).reduce((s, r) => s + Number(r.net_take_home), 0),
      deductions: (rows as any[]).reduce((s, r) => s + Number(r.gross_salary) - Number(r.net_take_home), 0),
    }))
    .sort((a, b) => (ledgerHistory.find((r) => r.month_year === a.month)?.created_at || '').localeCompare(
      ledgerHistory.find((r) => r.month_year === b.month)?.created_at || ''
    ));
  const hasTrend = monthTotals.length >= 2;
  const lastTwo = hasTrend ? monthTotals.slice(-2) : null;
  const pctChange = (curr: number, prev: number) => (prev === 0 ? null : ((curr - prev) / prev) * 100);

  /* ── Process payroll ── */
  const handleDisburse = async () => {
    if (!companyId || employees.length === 0) return;
    setProcessing(true);
    setStatusMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();

      const records = employees.map((emp) => {
        const math = calculateIndianPayrollBreakdown(emp.monthly_salary);
        return {
          company_id: profile?.company_id,
          employee_code: emp.employee_code,
          employee_name: emp.full_name,
          designation: emp.designation,
          department: emp.department,
          month_year: targetMonth,
          gross_salary: math.gross,
          epf_deduction: math.epf,
          esic_deduction: math.esic,
          prof_tax_deduction: math.profTax,
          net_take_home: math.netHome,
          status: 'paid',
        };
      });

      const res = await commitMonthlyPayrollAction(records);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Payroll for ${targetMonth} disbursed to ${employees.length} employees.` });
        const { data } = await supabase
          .from('payroll_ledger').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
        if (data) setLedgerHistory(data);
        setActiveView('history');
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to process payroll.' });
    } finally {
      setProcessing(false);
    }
  };

  /* ── CSV Export ── */
  const handleExport = () => {
    const rows = filtered.map((emp) => {
      const b = calculateIndianPayrollBreakdown(emp.monthly_salary);
      return [
        `"${emp.full_name}"`, `"${emp.employee_code}"`,
        `"${emp.designation || ''}"`, `"${emp.department || ''}"`,
        b.gross, b.epf, b.esic, b.profTax, b.netHome,
      ].join(',');
    });
    const csv = ['Name,Code,Designation,Department,Gross,EPF,ESIC,Prof Tax,Net Take-Home', ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURI(csv));
    link.setAttribute('download', `Payroll_${targetMonth.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const initials = adminName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-[var(--surface-card-hover)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
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
          <p className="text-xs text-ink-400 font-sans mt-0.5">Payroll <ChevronRight className="w-3 h-3 inline -mt-0.5" /> Payroll Ledger</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search employees by name, department…"
              className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400"
              onFocus={(e) => e.currentTarget.select()}
              readOnly
              onClick={() => document.getElementById('payroll-search')?.focus()}
            />
          </div>
          <button onClick={() => setLockedNote('Notifications')} className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)]">
            <Bell className="w-4 h-4" />
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
          <h2 className="text-2xl font-bold text-ink-900 font-sans">Payroll Ledger</h2>
          <p className="text-sm text-ink-400 font-sans mt-0.5">Process and track monthly salary disbursements for your team.</p>
        </div>
        <button
          onClick={handleDisburse}
          disabled={processing || employees.length === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold font-sans rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          {processing ? 'Processing…' : 'Run Payroll'}
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="px-6 lg:px-8 pt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Employees', value: String(employees.length), sub: 'Active employees',
            icon: <Users className="w-5 h-5 text-blue-600" />, iconBg: 'bg-blue-50',
            spark: null as number[] | null, color: '#2563EB',
          },
          {
            label: 'Total Gross Payroll', value: formatINR(totalGross), sub: 'This month',
            icon: <IndianRupee className="w-5 h-5 text-emerald-600" />, iconBg: 'bg-emerald-50',
            spark: hasTrend ? monthTotals.map((m) => m.gross) : null, color: '#10B981',
            trend: lastTwo ? pctChange(totalGross, lastTwo[0].gross) : null,
          },
          {
            label: 'Total Deductions', value: formatINR(totalDeductions), sub: 'This month',
            icon: <ArrowLeftRight className="w-5 h-5 text-orange-600" />, iconBg: 'bg-orange-50',
            spark: hasTrend ? monthTotals.map((m) => m.deductions) : null, color: '#F59E0B',
            trend: lastTwo ? pctChange(totalDeductions, lastTwo[0].deductions) : null,
          },
          {
            label: 'Net Disbursement', value: formatINR(totalNet), sub: 'Take-home total',
            icon: <Wallet className="w-5 h-5 text-violet-600" />, iconBg: 'bg-violet-50',
            spark: hasTrend ? monthTotals.map((m) => m.net) : null, color: '#7C3AED',
            trend: lastTwo ? pctChange(totalNet, lastTwo[0].net) : null,
          },
        ].map((k) => (
          <div key={k.label} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.iconBg}`}>{k.icon}</div>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans mt-3">{k.label}</p>
            <p className="text-2xl font-bold text-ink-900 font-sans leading-tight mt-1">{k.value}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-ink-400 font-sans">{k.sub}</p>
              {k.spark && k.spark.length >= 2 && (
                <div className="flex items-center gap-1.5">
                  {typeof (k as any).trend === 'number' && (
                    <span className={`text-[10px] font-semibold font-sans flex items-center gap-0.5 ${(k as any).trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(k as any).trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs((k as any).trend).toFixed(1)}%
                    </span>
                  )}
                  <Sparkline points={k.spark} color={k.color} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Status banner ── */}
      {pendingCount > 0 ? (
        <div className="mx-6 lg:mx-8 mt-6 px-4 py-3 rounded-lg border bg-blue-50 border-blue-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 text-sm font-sans text-blue-800">
            <Info className="w-4 h-4 shrink-0" />
            Payroll for {targetMonth} is in draft. Review, verify and process before the payment date.
          </div>
          <button onClick={() => setLockedNote('Payroll Checklist')} className="text-xs font-sans font-semibold text-brand bg-white border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 shrink-0">
            View Payroll Checklist
          </button>
        </div>
      ) : employees.length > 0 && (
        <div className="mx-6 lg:mx-8 mt-6 px-4 py-3 rounded-lg border bg-emerald-50 border-emerald-200 flex items-center gap-2.5 text-sm font-sans text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Payroll for {targetMonth} is fully processed for all {employees.length} employees.
        </div>
      )}

      {/* ── Action status toast ── */}
      {statusMsg && (
        <div className={`mx-6 lg:mx-8 mt-4 px-4 py-3 rounded-lg border text-sm font-sans flex items-center gap-3 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {statusMsg.text}
        </div>
      )}

      {/* ── Body ── */}
      <div className="px-6 lg:px-8 py-6 grid grid-cols-1 xl:grid-cols-[1fr_290px] gap-5 items-start">
        <div className="min-w-0 space-y-4">

          {/* Tabs */}
          <div className="flex items-center gap-5 border-b border-[var(--border-subtle)]">
            {[
              ['run', 'Payroll Ledger'],
              ['history', `Ledger History (${Object.keys(ledgerByMonth).length})`],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveView(id as 'run' | 'history')}
                className={`pb-2.5 text-sm font-sans font-medium border-b-2 transition-colors ${activeView === id ? 'border-brand text-brand font-semibold' : 'border-transparent text-ink-400 hover:text-ink-600'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════
              VIEW: RUN PAYROLL (Payroll Ledger)
          ════════════════════════════════ */}
          {activeView === 'run' && (
            <div className="space-y-4">

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                    className="flex items-center gap-2 text-xs font-sans font-medium text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 hover:bg-[var(--surface-card-hover)] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-ink-400" />
                    {targetMonth}
                    <ChevronDown className="w-3.5 h-3.5 text-ink-400" />
                  </button>

                  {showMonthPicker && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-lg p-3 w-64">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">Year</span>
                        <div className="flex gap-1">
                          {years.map((y) => (
                            <button
                              key={y}
                              onClick={() => setSelectedYear(y)}
                              className={`text-xs font-sans px-2 py-0.5 rounded transition-colors ${selectedYear === y ? 'bg-brand text-white' : 'text-ink-600 hover:bg-[var(--surface-card-hover)]'}`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Divider />
                      <div className="grid grid-cols-3 gap-1 mt-2">
                        {MONTHS.map((m) => {
                          const val = `${m} ${selectedYear}`;
                          return (
                            <button
                              key={m}
                              onClick={() => { setSelectedMonth(val); setCustomMonth(''); setShowMonthPicker(false); setPage(1); }}
                              className={`text-xs font-sans py-1.5 rounded-lg transition-colors ${targetMonth === val ? 'bg-brand text-white font-semibold' : 'text-ink-600 hover:bg-[var(--surface-card-hover)]'}`}
                            >
                              {m.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                      <Divider />
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Or type custom e.g. Q1 2026"
                          value={customMonth}
                          onChange={(e) => { setCustomMonth(e.target.value); setPage(1); }}
                          className="w-full text-xs font-sans text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 focus:outline-none placeholder:text-ink-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                  <input
                    id="payroll-search"
                    type="text"
                    placeholder="Search employees…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="text-xs font-sans text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400 w-44"
                  />
                </div>

                <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                  className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 focus:outline-none">
                  {departments.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                </select>

                <select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
                  className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 focus:outline-none">
                  <option value="All">All Locations</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                </select>

                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 focus:outline-none">
                  <option value="All">All Status</option>
                  <option value="Processed">Processed</option>
                  <option value="Draft">Draft</option>
                </select>

                <button
                  onClick={handleExport}
                  className="ml-auto flex items-center gap-1.5 text-xs font-sans font-semibold text-ink-600 hover:text-ink-900 bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] px-3 py-2 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                {employees.length === 0 ? (
                  <div className="py-16 text-center px-6">
                    <Banknote className="w-8 h-8 text-ink-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-ink-900 font-sans">No employees on payroll yet</p>
                    <p className="text-xs text-ink-400 font-sans mt-1 max-w-xs mx-auto">Add employees to your workspace to start processing payroll.</p>
                    <button onClick={() => router.push('/admin')} className="mt-4 px-3.5 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold font-sans rounded-lg">Add Employee</button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_0.6fr] gap-0 border-b border-[var(--border-subtle)] bg-[var(--surface-card-hover)]">
                      {['Employee', 'Department', 'Gross Pay', 'Deductions', 'Net Pay', 'Status', 'Actions'].map((h) => (
                        <div key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">{h}</div>
                      ))}
                    </div>

                    {paged.length === 0 ? (
                      <div className="py-16 text-center"><p className="text-sm text-ink-400 font-sans italic">No employees match your filters.</p></div>
                    ) : (
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {paged.map((emp) => {
                          const b = calculateIndianPayrollBreakdown(emp.monthly_salary);
                          const isExpanded = expandedEmp === emp.id;
                          const ledgerRow = ledgerByEmpCode[emp.employee_code];
                          const st = ledgerRow ? ledgerStatusStyle(ledgerRow.status) : { label: 'Draft', color: 'blue' };

                          return (
                            <div key={emp.id}>
                              <div
                                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_0.6fr] gap-0 hover:bg-[var(--surface-canvas)] transition-colors cursor-pointer group"
                                onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                              >
                                <div className="px-4 py-3.5 flex items-center gap-3 min-w-0">
                                  <Avatar name={emp.full_name} />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-ink-900 font-sans truncate">{emp.full_name}</p>
                                    <p className="text-[10px] text-ink-400 font-sans">{emp.employee_code}</p>
                                  </div>
                                </div>
                                <div className="px-4 py-3.5 flex items-center text-sm text-ink-600 font-sans truncate">{emp.department || '—'}</div>
                                <div className="px-4 py-3.5 flex items-center text-sm text-ink-900 font-sans tabular-nums">₹{b.gross.toLocaleString('en-IN')}</div>
                                <div className="px-4 py-3.5 flex items-center text-sm text-ink-600 font-sans tabular-nums">₹{(b.epf + b.esic + b.profTax).toLocaleString('en-IN')}</div>
                                <div className="px-4 py-3.5 flex items-center text-sm font-semibold text-emerald-700 font-sans tabular-nums">₹{b.netHome.toLocaleString('en-IN')}</div>
                                <div className="px-4 py-3.5 flex items-center"><Badge color={st.color}>{st.label}</Badge></div>
                                <div className="px-4 py-3.5 flex items-center gap-2 text-ink-400">
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="bg-[var(--surface-canvas)] border-t border-[var(--border-subtle)] px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <SectionLabel>Statutory Deductions</SectionLabel>
                                    <div className="space-y-2">
                                      {[
                                        { label: 'EPF (Employee PF @ 12%)', value: b.epf, note: `on ₹${Math.min(b.gross, 15000).toLocaleString('en-IN')} basis` },
                                        { label: 'ESIC (@ 0.75%)', value: b.esic, note: b.gross > 21000 ? 'not applicable above ₹21,000' : 'on gross' },
                                        { label: 'Professional Tax', value: b.profTax, note: 'state standard slab' },
                                      ].map((d) => (
                                        <div key={d.label} className="flex items-center justify-between">
                                          <div>
                                            <p className="text-xs font-sans text-ink-900">{d.label}</p>
                                            <p className="text-[10px] text-ink-400 font-sans italic">{d.note}</p>
                                          </div>
                                          <span className="text-sm font-semibold text-ink-900 font-sans tabular-nums">− ₹{d.value.toLocaleString('en-IN')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <SectionLabel>Summary</SectionLabel>
                                    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg divide-y divide-[var(--border-subtle)]">
                                      {[
                                        { label: 'Gross Salary', value: `₹${b.gross.toLocaleString('en-IN')}`, bold: false },
                                        { label: 'Total Deductions', value: `− ₹${(b.epf + b.esic + b.profTax).toLocaleString('en-IN')}`, bold: false, muted: true },
                                        { label: 'Net Take-Home', value: `₹${b.netHome.toLocaleString('en-IN')}`, bold: true },
                                      ].map((row) => (
                                        <div key={row.label} className="px-3 py-2.5 flex justify-between items-center">
                                          <span className={`text-xs font-sans ${row.bold ? 'font-semibold text-ink-900' : 'text-ink-600'}`}>{row.label}</span>
                                          <span className={`text-sm font-sans tabular-nums ${row.bold ? 'font-bold text-emerald-700' : row.muted ? 'text-rose-600' : 'text-ink-900'}`}>{row.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {(emp.bank_account_number || emp.ifsc_code) && (
                                      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 space-y-1">
                                        <SectionLabel>Bank Details</SectionLabel>
                                        <p className="text-xs font-sans text-ink-600 mt-1">
                                          {emp.bank_account_number || '—'}
                                          {emp.ifsc_code && <span className="ml-2 text-ink-400">· {emp.ifsc_code}</span>}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Footer: pagination */}
                    <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-ink-400">
                      <span>Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} employees</span>
                      <div className="flex items-center gap-2">
                        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-ink-900 font-semibold">{page}</span> / {totalPages}
                        <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              VIEW: LEDGER HISTORY
          ════════════════════════════════ */}
          {activeView === 'history' && (
            <div className="space-y-4">
              {Object.keys(ledgerByMonth).length === 0 ? (
                <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl py-20 text-center">
                  <Banknote className="w-8 h-8 text-ink-400 mx-auto mb-3" />
                  <p className="text-sm text-ink-400 font-sans italic">No payroll cycles processed yet.</p>
                  <button onClick={() => setActiveView('run')} className="mt-4 text-xs font-sans font-semibold text-ink-600 hover:text-ink-900 underline underline-offset-2">
                    Run your first payroll →
                  </button>
                </div>
              ) : (
                Object.entries(ledgerByMonth).map(([month, rowsRaw]) => {
                  const rows = rowsRaw as any[];
                  const monthGross = rows.reduce((s, r) => s + Number(r.gross_salary), 0);
                  const monthNet = rows.reduce((s, r) => s + Number(r.net_take_home), 0);
                  return (
                    <div key={month} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
                        <div className="flex items-center gap-3">
                          <SectionLabel icon={<FileText className="w-3.5 h-3.5" />}>{month}</SectionLabel>
                          <Badge color="emerald">{rows.length} employees</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-sans">
                          <span className="text-ink-600">Gross <span className="font-semibold text-ink-900 tabular-nums">₹{monthGross.toLocaleString('en-IN')}</span></span>
                          <span className="text-ink-600">Net <span className="font-bold text-emerald-700 tabular-nums">₹{monthNet.toLocaleString('en-IN')}</span></span>
                        </div>
                      </div>
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {rows.map((row) => (
                          <div key={row.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--surface-card-hover)] transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar name={row.employee_name} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink-900 font-sans truncate">{row.employee_name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge>{row.employee_code}</Badge>
                                  {row.department && <Badge color="teal">{row.department}</Badge>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0 text-right">
                              <div>
                                <p className="text-[10px] text-ink-400 font-sans uppercase tracking-wider">Gross</p>
                                <p className="text-sm text-ink-900 font-sans tabular-nums">₹{Number(row.gross_salary).toLocaleString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-ink-400 font-sans uppercase tracking-wider">Net</p>
                                <p className="text-sm font-bold text-emerald-700 font-sans tabular-nums">₹{Number(row.net_take_home).toLocaleString('en-IN')}</p>
                              </div>
                              <Badge color={ledgerStatusStyle(row.status).color}>{ledgerStatusStyle(row.status).label}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Right rail ── */}
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Payroll Summary ({targetMonth})</p>
            <div className="space-y-2 text-sm font-sans">
              <div className="flex items-center justify-between"><span className="text-ink-600">Total Gross Pay</span><span className="text-ink-900 font-medium tabular-nums">{formatINR(totalGross)}</span></div>
              <div className="flex items-center justify-between"><span className="text-ink-600">Total Deductions</span><span className="text-ink-900 font-medium tabular-nums">{formatINR(totalDeductions)}</span></div>
            </div>
            <Divider />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-ink-600 font-sans">Net Disbursement</span>
              <span className="text-lg font-bold text-brand font-sans tabular-nums">{formatINR(totalNet)}</span>
            </div>
            {employees.length > 0 && (
              <>
                <div className="mt-3 h-1.5 rounded-full bg-amber-100 overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${processedPct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] font-sans">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 className="w-3 h-3" />Processed {processedCount}</span>
                  <span className="flex items-center gap-1 text-amber-600 font-semibold"><AlertCircle className="w-3 h-3" />Pending {pendingCount}</span>
                </div>
              </>
            )}
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink-900 font-sans">Upcoming Payroll Dates</p>
            </div>
            <button onClick={() => setLockedNote('Upcoming Payroll Dates')} className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-sans text-ink-400 border border-dashed border-[var(--border-subtle)] rounded-lg hover:bg-[var(--surface-card-hover)] hover:text-ink-600">
              <CalendarClock className="w-3.5 h-3.5" /> Not configured yet
            </button>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Quick Actions</p>
            <div className="space-y-0.5">
              {[
                { label: 'Run Payroll', icon: Play, action: handleDisburse },
                { label: 'Bulk Adjustments', icon: SlidersHorizontal, action: () => setLockedNote('Bulk Adjustments') },
                { label: 'Payroll Settings', icon: Settings, action: () => setLockedNote('Payroll Settings') },
                { label: 'Download Reports', icon: Download, action: handleExport },
              ].map(({ label, icon: Icon, action }) => (
                <button key={label} onClick={action} className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-xs font-sans text-ink-600 hover:bg-[var(--surface-card-hover)] hover:text-ink-900 transition-colors">
                  <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" />{label}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lockedNote && <LockedFeatureNote title={lockedNote} onClose={() => setLockedNote(null)} />}
    </div>
  );
}