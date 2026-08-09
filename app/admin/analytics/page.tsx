"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Users,
  UserCheck,
  Wallet,
  TrendingUp,
  CalendarDays,
  Search,
  Bell,
  HelpCircle,
  ChevronRight,
  Info,
  Filter,
  Building2,
  Clock3,
  X,
  AlertCircle,
  CalendarClock,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL (verified against the live schema before writing this)
   ─────────────────────────────────────────────
   - Real tables used: employees, attendance, leave_requests, leave_balances,
     payroll_ledger (same real payroll source of truth as the Reports page).
   - There is no `gender` column anywhere on `employees`. The reference
     design's "Workforce Overview" (Male/Female/Other split) has no real
     data behind it, so that card slot instead shows Active/Inactive status
     and department count — both real columns — with a note explaining why
     gender isn't shown.
   - `leave_requests.leave_type` is constrained to exactly three values:
     'Casual Leave', 'Sick Leave', 'Unpaid Leave'. The Leave Overview donut
     uses these three, not the four in the reference mockup (no "Earned
     Leave" / "Other Leave" exist in this schema).
   - Same finding as the Reports page: there is no overtime-hours column or
     table backing real data (payroll_ledger has no overtime field). The
     "Top Overtime" card honestly reports this instead of inventing hours.
   - All trend charts (headcount, attendance, payroll) bucket by real
     timestamps (employees.joining_date, attendance.date,
     payroll_ledger.created_at) over the last 6 calendar months. If a
     bucket has no underlying rows it renders as a genuine gap/empty state
     rather than fabricated numbers — this workspace currently has very
     little data, so several charts will legitimately show as empty until
     real usage accumulates.
───────────────────────────────────────────── */

function formatFullINR(n: number) {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}
function formatLakhINR(n: number) {
  if (!n) return '₹0L';
  return `₹${(n / 100000).toFixed(1)}L`;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function lastNMonths(n: number) {
  const now = new Date();
  const out: { label: string; start: string; end: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    out.push({ label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), start, end });
  }
  return out;
}
function pctDelta(curr: number, prev: number): { text: string; up: boolean } | null {
  if (prev === 0) return null;
  const delta = ((curr - prev) / prev) * 100;
  return { text: `${Math.abs(delta).toFixed(1)}%`, up: delta >= 0 };
}

/* ── Small reusable donut, driven entirely by real values ── */
function Donut({ data, size = 112 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 42, cx = 50, cy = 50, strokeWidth = 14;
  let cumulative = 0;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0 -rotate-90">
      {total === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
      ) : (
        data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circumference;
          const offset = cumulative * circumference;
          cumulative += frac;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
        })
      )}
    </svg>
  );
}

/* ── Smooth area/line chart for headcount & attendance trends ── */
function AreaLineChart({
  points, color, formatY, height = 220,
}: {
  points: { label: string; value: number | null }[];
  color: string;
  formatY: (n: number) => string;
  height?: number;
}) {
  const valid = points.filter((p) => p.value !== null) as { label: string; value: number }[];
  if (valid.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-ink-400 font-sans italic" style={{ height }}>
        No data for this period yet.
      </div>
    );
  }
  const w = 640, h = height, padL = 42, padR = 16, padT = 24, padB = 28;
  const values = valid.map((p) => p.value);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const yMin = min - range * 0.15, yMax = max + range * 0.15;
  const stepX = (w - padL - padR) / Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = padL + i * stepX;
    const y = p.value === null ? null : padT + (1 - (p.value - yMin) / (yMax - yMin)) * (h - padT - padB);
    return { x, y, value: p.value, label: p.label };
  });

  const drawable = coords.filter((c) => c.y !== null) as { x: number; y: number; value: number; label: string }[];
  const linePath = drawable.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = drawable.length
    ? `M ${drawable[0].x} ${h - padB} ` + drawable.map((c) => `L ${c.x} ${c.y}`).join(' ') + ` L ${drawable[drawable.length - 1].x} ${h - padB} Z`
    : '';
  const gridLines = 4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {Array.from({ length: gridLines + 1 }, (_, i) => {
        const y = padT + (i / gridLines) * (h - padT - padB);
        const val = yMax - (i / gridLines) * (yMax - yMin);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--border-subtle)" strokeWidth={1} />
            <text x={padL - 8} y={y + 3} textAnchor="end" fontSize={10} fill="var(--ink-400)" fontFamily="var(--font-sans)">{formatY(val)}</text>
          </g>
        );
      })}
      {areaPath && <path d={areaPath} fill={color} opacity={0.12} />}
      {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {drawable.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={3.5} fill={color} stroke="white" strokeWidth={1.5} />
          <text x={c.x} y={c.y - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--ink-900)" fontFamily="var(--font-sans)">{formatY(c.value)}</text>
        </g>
      ))}
      {coords.map((c, i) => (
        <text key={i} x={c.x} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--ink-400)" fontFamily="var(--font-sans)">{c.label}</text>
      ))}
    </svg>
  );
}

/* ── Bar chart for payroll trend ── */
function BarChart({ points, color, height = 200 }: { points: { label: string; value: number }[]; color: string; height?: number }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const allZero = points.every((p) => p.value === 0);
  if (allZero) {
    return (
      <div className="flex items-center justify-center text-xs text-ink-400 font-sans italic" style={{ height }}>
        No payroll runs in this window yet.
      </div>
    );
  }
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {points.map((p) => {
        const h = Math.max((p.value / max) * (height - 40), p.value > 0 ? 4 : 0);
        return (
          <div key={p.label} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
            <span className="text-[10px] font-semibold text-ink-900 font-sans">{p.value > 0 ? formatLakhINR(p.value) : ''}</span>
            <div className="w-full rounded-t-md" style={{ height: h, background: color, minHeight: p.value > 0 ? 4 : 0 }} />
            <span className="text-[10px] text-ink-400 font-sans">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LockedFeatureNote({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-white border border-[var(--border-subtle)] flex items-center justify-center"><Zap className="w-5 h-5 text-ink-400" /></div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-900 font-sans">{title}</p>
          <p className="text-xs text-ink-600 font-sans leading-relaxed">This isn&apos;t live yet — it&apos;s on the roadmap and will unlock here once it ships.</p>
        </div>
        <button onClick={onClose} className="w-full text-sm font-medium font-sans px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] transition-colors">Got it</button>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState('Administrator');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deptFilter, setDeptFilter] = useState('All');

  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('company_id, role, full_name').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
      if (profile.full_name) setAdminName(profile.full_name.split(' ')[0]);
      setCompanyId(profile.company_id);

      const cid = profile.company_id;
      const [empRes, attRes, leaveRes, balRes, ledgerRes] = await Promise.all([
        supabase.from('employees').select('id, full_name, department, status, joining_date, monthly_salary').eq('company_id', cid),
        supabase.from('attendance').select('employee_id, date, check_in, status, is_late').eq('company_id', cid),
        supabase.from('leave_requests').select('id, employee_id, leave_type, start_date, end_date, status, created_at').eq('company_id', cid),
        supabase.from('leave_balances').select('employee_id, allocated_leaves, used_leaves, remaining_leaves').eq('company_id', cid),
        supabase.from('payroll_ledger').select('employee_code, employee_name, department, month_year, gross_salary, net_take_home, created_at').eq('company_id', cid),
      ]);

      const firstErr = [empRes, attRes, leaveRes, balRes, ledgerRes].find((r) => r.error)?.error;
      if (firstErr) setLoadError(firstErr.message);

      if (empRes.data) setEmployees(empRes.data);
      if (attRes.data) setAttendance(attRes.data);
      if (leaveRes.data) setLeaveRequests(leaveRes.data);
      if (balRes.data) setLeaveBalances(balRes.data);
      if (ledgerRes.data) setLedger(ledgerRes.data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const departments = useMemo(() => ['All', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))] as string[], [employees]);

  const scopedEmployees = useMemo(
    () => employees.filter((e) => deptFilter === 'All' || e.department === deptFilter),
    [employees, deptFilter]
  );

  /* ── 6-month buckets, reused across trends ── */
  const months = useMemo(() => lastNMonths(6), []);

  const headcountTrend = useMemo(
    () => months.map((m) => ({
      label: m.label,
      value: scopedEmployees.filter((e) => !e.joining_date || e.joining_date <= m.end).length,
    })),
    [months, scopedEmployees]
  );

  const attendanceTrend = useMemo(
    () => months.map((m) => {
      const rows = attendance.filter((a) => a.date >= m.start && a.date <= m.end);
      if (rows.length === 0) return { label: m.label, value: null as number | null };
      const present = rows.filter((r) => r.status === 'Present' || r.status === 'Late' || !!r.check_in).length;
      return { label: m.label, value: Math.round((present / rows.length) * 1000) / 10 };
    }),
    [months, attendance]
  );

  const payrollTrend = useMemo(
    () => months.map((m) => {
      const rows = ledger.filter((r) => r.created_at >= m.start && r.created_at <= `${m.end}T23:59:59`)
        .filter((r) => deptFilter === 'All' || r.department === deptFilter);
      return { label: m.label, value: rows.reduce((s, r) => s + Number(r.gross_salary || 0), 0) };
    }),
    [months, ledger, deptFilter]
  );

  /* ── KPIs — all real, computed from the loaded rows ── */
  const today = todayISO();
  const totalEmployees = scopedEmployees.length;
  const presentTodayRows = attendance.filter((a) => a.date === today && (a.status === 'Present' || a.status === 'Late' || !!a.check_in));
  const presentToday = presentTodayRows.length;
  const onLeaveTodayRows = leaveRequests.filter((r) => r.status === 'Approved' && r.start_date <= today && r.end_date >= today);
  const onLeaveToday = onLeaveTodayRows.length;

  const rangeAttendance = attendance.filter((a) => a.date >= dateFrom && a.date <= dateTo);
  const rangePresent = rangeAttendance.filter((a) => a.status === 'Present' || a.status === 'Late' || !!a.check_in).length;
  const avgAttendance = rangeAttendance.length ? Math.round((rangePresent / rangeAttendance.length) * 1000) / 10 : null;

  const thisMonthPayroll = payrollTrend[payrollTrend.length - 1]?.value ?? 0;
  const lastMonthPayroll = payrollTrend[payrollTrend.length - 2]?.value ?? 0;
  const payrollDelta = pctDelta(thisMonthPayroll, lastMonthPayroll);

  const thisMonthHeadcount = headcountTrend[headcountTrend.length - 1]?.value ?? 0;
  const lastMonthHeadcount = headcountTrend[headcountTrend.length - 2]?.value ?? 0;
  const headcountChange = thisMonthHeadcount - lastMonthHeadcount;

  const thisMonthAttendance = attendanceTrend[attendanceTrend.length - 1]?.value ?? null;
  const lastMonthAttendance = attendanceTrend[attendanceTrend.length - 2]?.value ?? null;
  const attendanceChange = thisMonthAttendance !== null && lastMonthAttendance !== null ? thisMonthAttendance - lastMonthAttendance : null;

  /* ── Department-wise headcount (real) ── */
  const deptColors = ['#1e40af', '#15803d', '#c2410c', '#7c3aed', '#0891b2', '#94a3b8'];
  const deptCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of scopedEmployees) { const d = e.department || 'Unassigned'; map[d] = (map[d] || 0) + 1; }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: deptColors[i % deptColors.length] }));
  }, [scopedEmployees]);

  /* ── Employee status split (replaces the reference's gender split — no gender column exists) ── */
  const statusCounts = useMemo(() => {
    const active = scopedEmployees.filter((e) => (e.status || 'Active') === 'Active').length;
    const inactive = scopedEmployees.length - active;
    return [
      { label: 'Active', value: active, color: 'var(--status-success)' },
      { label: 'Inactive', value: inactive, color: 'var(--status-danger)' },
    ];
  }, [scopedEmployees]);

  /* ── Leave overview — real leave_type values only ── */
  const rangeLeave = leaveRequests.filter((r) => r.created_at.slice(0, 10) >= dateFrom && r.created_at.slice(0, 10) <= dateTo);
  const leaveTypeColors: Record<string, string> = { 'Casual Leave': 'var(--brand-primary)', 'Sick Leave': 'var(--accent-orange)', 'Unpaid Leave': 'var(--ink-400)' };
  const leaveDonutData = useMemo(() => {
    const map: Record<string, number> = { 'Casual Leave': 0, 'Sick Leave': 0, 'Unpaid Leave': 0 };
    for (const r of rangeLeave) if (map[r.leave_type] !== undefined) map[r.leave_type] += 1;
    return Object.entries(map).map(([label, value]) => ({ label, value, color: leaveTypeColors[label] }));
  }, [rangeLeave]);
  const totalLeaves = leaveDonutData.reduce((s, d) => s + d.value, 0);
  const totalAllocated = leaveBalances.reduce((s, b) => s + Number(b.allocated_leaves || 0), 0);
  const totalUsed = leaveBalances.reduce((s, b) => s + Number(b.used_leaves || 0), 0);
  const leaveUtilization = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 1000) / 10 : null;

  const initials = adminName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-[var(--surface-card-hover)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-[var(--surface-card-hover)] rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-[var(--surface-card-hover)] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)]">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-6 pb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900 font-sans">Good afternoon, {adminName} 👋</h1>
          <p className="text-xs text-ink-400 font-sans mt-0.5">Home <ChevronRight className="w-3 h-3 inline -mt-0.5" /> Analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input placeholder="Search employee, department, or metrics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-10 py-2 w-72 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400" />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-400 font-sans border border-[var(--border-subtle)] rounded px-1">⌘K</span>
          </div>
          <button onClick={() => setLockedNote('Notifications')} className="relative p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)]">
            <Bell className="w-4 h-4" />
          </button>
          <button onClick={() => setLockedNote('Help Center')} className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)]"><HelpCircle className="w-4 h-4" /></button>
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-[11px] font-semibold text-white font-sans">{initials}</div>
        </div>
      </div>

      {/* Analytics header */}
      <div className="px-6 lg:px-8 pt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 font-sans">Analytics</h2>
          <p className="text-sm text-ink-400 font-sans mt-0.5">Real-time insights and trends to help you make data-driven decisions.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600">
            <CalendarDays className="w-3.5 h-3.5 text-ink-400" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent focus:outline-none" />
            <span className="text-ink-400">–</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent focus:outline-none" />
          </div>
          <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-1.5 text-xs font-sans font-semibold bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 hover:bg-[var(--surface-card-hover)]">
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mx-6 lg:mx-8 mt-3 p-4 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] flex flex-wrap items-center gap-3">
          <label className="text-xs font-sans text-ink-600 font-semibold">Department</label>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-xs font-sans bg-[var(--surface-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600">
            {departments.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
          <button onClick={() => setShowFilters(false)} className="ml-auto text-xs font-sans text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loadError && (
        <div className="mx-6 lg:mx-8 mt-4 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-sans flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {loadError}
        </div>
      )}

      {/* KPIs */}
      <div className="px-6 lg:px-8 pt-6 grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Employees', value: totalEmployees, icon: Users, tint: 'blue',
            sub: `${headcountChange >= 0 ? '↑' : '↓'} ${Math.abs(headcountChange)} vs last month`,
          },
          {
            label: 'Present Today', value: presentToday, icon: UserCheck, tint: 'emerald',
            sub: totalEmployees ? `${Math.round((presentToday / totalEmployees) * 1000) / 10}% of total` : 'No employees yet',
          },
          {
            label: 'Total Payroll (This Month)', value: formatFullINR(thisMonthPayroll), icon: Wallet, tint: 'violet',
            sub: payrollDelta ? `${payrollDelta.up ? '↑' : '↓'} ${payrollDelta.text} vs last month` : 'No payroll run last month to compare',
          },
          {
            label: 'Avg. Attendance', value: avgAttendance !== null ? `${avgAttendance}%` : '—', icon: TrendingUp, tint: 'amber',
            sub: attendanceChange !== null ? `${attendanceChange >= 0 ? '↑' : '↓'} ${Math.abs(attendanceChange).toFixed(1)}% vs last month` : 'Not enough attendance data yet',
          },
          {
            label: 'On Leave Today', value: onLeaveToday, icon: CalendarClock, tint: 'rose',
            sub: totalEmployees ? `${Math.round((onLeaveToday / totalEmployees) * 1000) / 10}% of total` : 'No employees yet',
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          const tintMap: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600' };
          return (
            <div key={kpi.label} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tintMap[kpi.tint]}`}><Icon className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-bold text-ink-900 font-sans mt-2 tabular-nums">{kpi.value}</p>
              <p className="text-xs text-ink-400 font-sans mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main layout */}
      <div className="px-6 lg:px-8 pt-6 pb-8 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="min-w-0 space-y-6">
          {/* Main charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-ink-900 font-sans">Employee Headcount Trend</p>
                <span className="text-xs font-sans text-ink-400 border border-[var(--border-subtle)] rounded-lg px-2 py-1">Last 6 Months</span>
              </div>
              <AreaLineChart points={headcountTrend} color="var(--brand-primary)" formatY={(n) => `${Math.round(n)}`} />
              <p className="text-xs font-sans text-ink-600 mt-2 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand" /> Total Employees</p>
            </div>
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-ink-900 font-sans">Attendance Trend</p>
                <span className="text-xs font-sans text-ink-400 border border-[var(--border-subtle)] rounded-lg px-2 py-1">Last 6 Months</span>
              </div>
              <AreaLineChart points={attendanceTrend} color="var(--status-success)" formatY={(n) => `${Math.round(n)}%`} />
              <p className="text-xs font-sans text-ink-600 mt-2 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--status-success)' }} /> Average Attendance</p>
            </div>
          </div>

          {/* Secondary analytics grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card flex flex-col">
              <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Department wise Headcount</p>
              {deptCounts.length === 0 ? (
                <p className="text-xs text-ink-400 font-sans italic text-center py-10 flex-1">No employees yet.</p>
              ) : (
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative shrink-0">
                    <Donut data={deptCounts} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-ink-900 font-sans">{totalEmployees}</span>
                      <span className="text-[9px] text-ink-400 font-sans">Total</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {deptCounts.map((d) => (
                      <div key={d.label} className="flex items-center justify-between text-xs font-sans">
                        <span className="flex items-center gap-1.5 text-ink-600 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />{d.label}</span>
                        <span className="text-ink-900 font-semibold shrink-0">{d.value} ({Math.round((d.value / totalEmployees) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => router.push('/admin')} className="text-xs font-sans font-semibold text-brand hover:underline mt-4 self-start">View all departments →</button>
            </div>

            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-ink-900 font-sans">Monthly Payroll Trend</p>
                <span className="text-xs font-sans text-ink-400 border border-[var(--border-subtle)] rounded-lg px-2 py-1">Last 6 Months</span>
              </div>
              <BarChart points={payrollTrend} color="var(--accent-violet)" />
              <p className="text-xs font-sans text-ink-600 mt-3 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-violet)' }} /> Payroll (INR)</p>
            </div>

            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card flex flex-col">
              <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Top Overtime by Employees</p>
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
                <Clock3 className="w-6 h-6 text-ink-400" />
                <p className="text-xs text-ink-400 font-sans leading-relaxed max-w-[220px]">
                  Overtime isn&apos;t tracked in the schema yet — there&apos;s no overtime-hours field on payroll, so there&apos;s nothing real to rank here.
                </p>
              </div>
              <button onClick={() => router.push('/admin/reports')} className="text-xs font-sans font-semibold text-brand hover:underline self-start">View full reports →</button>
            </div>
          </div>

          {/* Info bar */}
          <div className="bg-[var(--brand-primary-subtle)] border border-blue-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-brand shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ink-900 font-sans">Data is updated in real-time</p>
                <p className="text-xs text-ink-600 font-sans">All analytics are based on the latest available data from your HRBharat system.</p>
              </div>
            </div>
            <button onClick={() => setLockedNote('Schedule Analytics Report')} className="text-xs font-sans font-semibold px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)] flex items-center gap-1.5 shrink-0">
              <CalendarClock className="w-3.5 h-3.5" /> Schedule Analytics Report
            </button>
          </div>
        </div>

        {/* Right-side insights column */}
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Employee Status</p>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Donut data={statusCounts} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-ink-900 font-sans">{totalEmployees}</span>
                  <span className="text-[9px] text-ink-400 font-sans">Total</span>
                </div>
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                {statusCounts.map((d) => (
                  <div key={d.label} className="flex items-center justify-between text-xs font-sans">
                    <span className="flex items-center gap-1.5 text-ink-600"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.label}</span>
                    <span className="text-ink-900 font-semibold">{d.value}{totalEmployees > 0 && ` (${Math.round((d.value / totalEmployees) * 100)}%)`}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-ink-400 font-sans mt-3 flex items-start gap-1.5">
              <Building2 className="w-3 h-3 mt-0.5 shrink-0" />
              Gender isn&apos;t captured in the employee schema yet, so this shows Active/Inactive status instead.
            </p>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Leave Overview ({dateFrom} to {dateTo})</p>
            {totalLeaves === 0 ? (
              <p className="text-xs text-ink-400 font-sans italic text-center py-6">No leave requests in this period.</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Donut data={leaveDonutData} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-ink-900 font-sans">{totalLeaves}</span>
                    <span className="text-[9px] text-ink-400 font-sans">Leaves</span>
                  </div>
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  {leaveDonutData.filter((d) => d.value > 0).map((d) => (
                    <div key={d.label} className="flex items-center justify-between text-xs font-sans">
                      <span className="flex items-center gap-1.5 text-ink-600"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.label}</span>
                      <span className="text-ink-900 font-semibold">{d.value} ({Math.round((d.value / totalLeaves) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-sans">
              <span className="text-ink-600">Leave Utilization</span>
              <span className="font-semibold text-ink-900">{leaveUtilization !== null ? `${leaveUtilization}%` : 'No balance data yet'}</span>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Insights</p>
            <div className="space-y-1">
              {[
                {
                  icon: TrendingUp,
                  text: attendanceChange !== null
                    ? `Attendance ${attendanceChange >= 0 ? 'improved' : 'declined'} by ${Math.abs(attendanceChange).toFixed(1)}%`
                    : 'Not enough attendance data yet',
                  sub: 'Compared to last month.',
                },
                {
                  icon: Wallet,
                  text: payrollDelta ? `Payroll expenses ${payrollDelta.up ? 'increased' : 'decreased'} by ${payrollDelta.text}` : 'No payroll run last month to compare',
                  sub: 'Compared to last month.',
                },
                {
                  icon: Users,
                  text: `Headcount ${headcountChange >= 0 ? 'grew by' : 'shrank by'} ${Math.abs(headcountChange)} employee${Math.abs(headcountChange) === 1 ? '' : 's'}`,
                  sub: 'Compared to last month.',
                },
                {
                  icon: CalendarClock,
                  text: leaveUtilization !== null ? `Leave utilization is at ${leaveUtilization}%` : 'No leave balance data recorded yet',
                  sub: 'Based on allocated vs. used leave.',
                },
              ].map((row, i) => {
                const Icon = row.icon;
                return (
                  <div key={i} className="flex items-center gap-2.5 py-2 border-b border-[var(--border-subtle)] last:border-0">
                    <span className="w-7 h-7 rounded-lg bg-[var(--surface-card-hover)] flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5 text-ink-600" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-900 font-sans truncate">{row.text}</p>
                      <p className="text-[10px] text-ink-400 font-sans">{row.sub}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {lockedNote && <LockedFeatureNote title={lockedNote} onClose={() => setLockedNote(null)} />}
    </div>
  );
}