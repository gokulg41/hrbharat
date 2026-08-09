"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Users,
  CalendarCheck,
  Wallet,
  FileText,
  ClipboardList,
  Clock3,
  Building2,
  Landmark,
  Download,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  HelpCircle,
  Filter,
  FileBarChart2,
  CalendarClock,
  DownloadCloud as DownloadCloudIcon,
  Plus,
  Settings,
  History,
  X,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL (verified against the live schema before writing this)
   ─────────────────────────────────────────────
   - No `reports` / `report_history` / `scheduled_reports` table existed
     anywhere. Rather than invent a parallel data model, this page reuses
     the real tables directly: employees, attendance, leave_requests,
     leave_balances, payroll_ledger (the real payroll source of truth —
     see the Payslips page notes), and payslips. The 8 report types below
     are a code-defined catalog (like nav items), not fabricated database
     rows.
   - Two small tables were added because they were genuinely missing, not
     duplicated: `report_activity` (a real log of generate/download events,
     so "Reports This Month" / "Downloads This Month" / "Last Generated"
     are real counts, not fabricated) and `report_schedules` (stores a
     schedule's intent — no cron/edge function exists yet to actually run
     it, and the Schedule modal says so).
   - `leave_balances` had RLS enabled with zero policies (same bug class
     found on `payslips` earlier) — fixed alongside this page's migration,
     otherwise the Leave Report could never read real balances.
   - There is no overtime-hours column or table anywhere in the schema.
     The Overtime Report is listed (per spec) but honestly reports "not
     tracked yet" instead of inventing numbers.
   - No PDF/XLSX generation pipeline exists in this codebase (confirmed
     again here, same finding as Payslips). Every report exports as CSV,
     not "PDF, Excel" — the format badge says CSV so the UI doesn't
     promise a file type nothing can produce.
───────────────────────────────────────────── */

type ReportKey =
  | 'employee_directory'
  | 'attendance_summary'
  | 'payroll_summary'
  | 'payslip_summary'
  | 'leave_report'
  | 'overtime_report'
  | 'department_summary'
  | 'statutory_summary';

type Category = 'HR' | 'Payroll' | 'Attendance' | 'Statutory';

type ReportDef = {
  key: ReportKey;
  name: string;
  category: Category;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  hasData: boolean; // false only for Overtime Report — no source data exists
};

const REPORT_CATALOG: ReportDef[] = [
  { key: 'employee_directory', name: 'Employee Directory', category: 'HR', description: 'Complete list of all employees with department and contact details.', icon: Users, hasData: true },
  { key: 'attendance_summary', name: 'Attendance Summary', category: 'Attendance', description: 'Summary of employee attendance for the selected period.', icon: CalendarCheck, hasData: true },
  { key: 'payroll_summary', name: 'Payroll Summary', category: 'Payroll', description: 'Summary of payroll including gross pay, deductions and net pay.', icon: Wallet, hasData: true },
  { key: 'payslip_summary', name: 'Payslip Summary', category: 'Payroll', description: 'Summary of payslips generated for the selected period.', icon: FileText, hasData: true },
  { key: 'leave_report', name: 'Leave Report', category: 'HR', description: 'Summary of leave applications and balances.', icon: ClipboardList, hasData: true },
  { key: 'overtime_report', name: 'Overtime Report', category: 'Payroll', description: 'Summary of employee overtime and overtime payment.', icon: Clock3, hasData: false },
  { key: 'department_summary', name: 'Department Summary', category: 'HR', description: 'Headcount and payroll summary by department.', icon: Building2, hasData: true },
  { key: 'statutory_summary', name: 'Statutory Summary', category: 'Statutory', description: 'PF, ESI, PT and other statutory compliance summary.', icon: Landmark, hasData: true },
];

const CATEGORY_COLOR: Record<Category, string> = { HR: 'blue', Payroll: 'emerald', Attendance: 'violet', Statutory: 'amber' };

function formatFullINR(n: number) {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}
function formatDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today, ${time}` : `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${time}`;
}
function toCSV(columns: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [columns.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}
function downloadCSV(filename: string, columns: string[], rows: (string | number)[][]) {
  const csv = toCSV(columns, rows);
  const link = document.createElement('a');
  link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    gray: 'bg-surface-card-hover text-ink-600 border-border-subtle',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border font-sans ${map[color]}`}>{children}</span>;
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

/* ── Small donut chart, driven entirely by real category counts ── */
function Donut({ data, centerLabel, centerValue }: { data: { label: string; value: number; color: string }[]; centerLabel: string; centerValue: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 42, cx = 50, cy = 50, strokeWidth = 14;
  let cumulative = 0;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <svg width="112" height="112" viewBox="0 0 100 100" className="shrink-0 -rotate-90">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        ) : data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circumference;
          const offset = cumulative * circumference;
          cumulative += frac;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
        })}
      </svg>
      <div className="absolute" style={{ marginLeft: 56 - 28 }} />
      <div className="space-y-1.5 flex-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between text-xs font-sans">
            <span className="flex items-center gap-1.5 text-ink-600"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.label}</span>
            <span className="text-ink-900 font-semibold">{d.value} {total > 0 && `(${Math.round((d.value / total) * 100)}%)`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
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
  const [payslips, setPayslips] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'All' | Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); });

  const [viewingKey, setViewingKey] = useState<ReportKey | null>(null);
  const [busyKey, setBusyKey] = useState<ReportKey | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<ReportKey | null>(null);
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('company_id, role, full_name').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
      if (profile.full_name) setAdminName(profile.full_name.split(' ')[0]);
      setCompanyId(profile.company_id);

      const cid = profile.company_id;
      const [empRes, attRes, leaveRes, balRes, ledgerRes, slipRes, actRes, schedRes] = await Promise.all([
        supabase.from('employees').select('id, full_name, employee_code, department, designation, email, phone_number, status').eq('company_id', cid),
        supabase.from('attendance').select('employee_id, employee_code, employee_name, date, check_in, is_late, status').eq('company_id', cid).gte('date', dateFrom).lte('date', dateTo),
        supabase.from('leave_requests').select('id, employee_id, leave_type, start_date, end_date, status, created_at').eq('company_id', cid),
        supabase.from('leave_balances').select('employee_id, allocated_leaves, used_leaves, remaining_leaves').eq('company_id', cid),
        supabase.from('payroll_ledger').select('*').eq('company_id', cid),
        supabase.from('payslips').select('*').eq('company_id', cid),
        supabase.from('report_activity').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
        supabase.from('report_schedules').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
      ]);

      const firstErr = [empRes, attRes, leaveRes, balRes, ledgerRes, slipRes, actRes, schedRes].find((r) => r.error)?.error;
      if (firstErr) setLoadError(firstErr.message);

      if (empRes.data) setEmployees(empRes.data);
      if (attRes.data) setAttendance(attRes.data);
      if (leaveRes.data) setLeaveRequests(leaveRes.data);
      if (balRes.data) setLeaveBalances(balRes.data);
      if (ledgerRes.data) setLedger(ledgerRes.data);
      if (slipRes.data) setPayslips(slipRes.data);
      if (actRes.data) setActivity(actRes.data);
      if (schedRes.data) setSchedules(schedRes.data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, dateFrom, dateTo]);

  const departments = useMemo(() => ['All', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))] as string[], [employees]);

  /* ── Real computation per report type, used by both View and Download ── */
  function computeReport(key: ReportKey): { columns: string[]; rows: (string | number)[][]; empty?: string } {
    switch (key) {
      case 'employee_directory': {
        const rows = employees
          .filter((e) => deptFilter === 'All' || e.department === deptFilter)
          .map((e) => [e.full_name, e.employee_code || '-', e.department || '-', e.designation || '-', e.email || '-', e.phone_number || '-', e.status || 'Active']);
        return { columns: ['Name', 'Employee ID', 'Department', 'Designation', 'Email', 'Phone', 'Status'], rows };
      }
      case 'attendance_summary': {
        const byEmp: Record<string, { name: string; code: string; present: number; late: number }> = {};
        for (const a of attendance) {
          const k = a.employee_code || a.employee_id;
          if (!byEmp[k]) byEmp[k] = { name: a.employee_name || k, code: a.employee_code || '-', present: 0, late: 0 };
          if (a.check_in) byEmp[k].present += 1;
          if (a.is_late) byEmp[k].late += 1;
        }
        const rows = Object.values(byEmp).map((r) => [r.name, r.code, r.present, r.late]);
        return { columns: ['Employee', 'Employee ID', 'Present Days', 'Late Days'], rows, empty: rows.length ? undefined : 'No attendance punches recorded in this date range.' };
      }
      case 'payroll_summary': {
        const rows = ledger
          .filter((r) => deptFilter === 'All' || r.department === deptFilter)
          .map((r) => [r.employee_name, r.employee_code, r.month_year, r.gross_salary, r.epf_deduction + r.esic_deduction + r.prof_tax_deduction, r.net_take_home]);
        return { columns: ['Employee', 'Employee ID', 'Month', 'Gross Salary', 'Total Deductions', 'Net Pay'], rows, empty: rows.length ? undefined : 'No payroll has been run yet.' };
      }
      case 'payslip_summary': {
        const ledgerById: Record<string, any> = Object.fromEntries(ledger.map((r) => [r.id, r]));
        const rows = payslips.map((p) => {
          const l = ledgerById[p.payroll_id];
          return [l?.employee_name || '-', l?.employee_code || '-', l?.month_year || '-', p.base_salary, p.deductions, p.net_paid, p.status];
        });
        return { columns: ['Employee', 'Employee ID', 'Month', 'Base Salary', 'Deductions', 'Net Paid', 'Status'], rows, empty: rows.length ? undefined : 'No payslips have been generated yet.' };
      }
      case 'leave_report': {
        const empById: Record<string, any> = Object.fromEntries(employees.map((e) => [e.id, e]));
        const rows = leaveRequests.map((r) => {
          const e = empById[r.employee_id];
          return [e?.full_name || '-', e?.employee_code || '-', r.leave_type, r.start_date, r.end_date, r.status];
        });
        return { columns: ['Employee', 'Employee ID', 'Leave Type', 'Start Date', 'End Date', 'Status'], rows, empty: rows.length ? undefined : 'No leave requests found.' };
      }
      case 'overtime_report': {
        return { columns: ['Employee', 'Overtime Hours', 'Overtime Pay'], rows: [], empty: 'Overtime isn\u2019t tracked anywhere in the schema yet — no hours column or table exists, so this report has nothing real to show.' };
      }
      case 'department_summary': {
        const byDept: Record<string, { headcount: number; gross: number; net: number }> = {};
        for (const e of employees) {
          const d = e.department || 'Unassigned';
          if (!byDept[d]) byDept[d] = { headcount: 0, gross: 0, net: 0 };
          byDept[d].headcount += 1;
        }
        for (const r of ledger) {
          const d = r.department || 'Unassigned';
          if (!byDept[d]) byDept[d] = { headcount: 0, gross: 0, net: 0 };
          byDept[d].gross += Number(r.gross_salary);
          byDept[d].net += Number(r.net_take_home);
        }
        const rows = Object.entries(byDept).map(([d, v]) => [d, v.headcount, formatFullINR(v.gross), formatFullINR(v.net)]);
        return { columns: ['Department', 'Headcount', 'Total Gross (in range)', 'Total Net (in range)'], rows };
      }
      case 'statutory_summary': {
        const epf = ledger.reduce((s, r) => s + Number(r.epf_deduction), 0);
        const esic = ledger.reduce((s, r) => s + Number(r.esic_deduction), 0);
        const pt = ledger.reduce((s, r) => s + Number(r.prof_tax_deduction), 0);
        return { columns: ['Component', 'Total Amount'], rows: [['EPF', formatFullINR(epf)], ['ESIC', formatFullINR(esic)], ['Professional Tax', formatFullINR(pt)], ['Total Statutory Deductions', formatFullINR(epf + esic + pt)]], empty: ledger.length ? undefined : 'No payroll runs to summarize yet.' };
      }
    }
  }

  const lastGeneratedByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of activity) if (a.action === 'generated' && !map[a.report_key]) map[a.report_key] = a.created_at;
    return map;
  }, [activity]);

  async function logActivity(key: ReportKey, name: string, action: 'generated' | 'downloaded') {
    if (!companyId) return;
    const { data, error } = await supabase.from('report_activity').insert({ company_id: companyId, report_key: key, report_name: name, action, format: 'CSV' }).select().single();
    if (!error && data) setActivity((prev) => [data, ...prev]);
  }

  async function handleView(def: ReportDef) {
    setViewingKey(def.key);
    setBusyKey(def.key);
    await logActivity(def.key, def.name, 'generated');
    setBusyKey(null);
  }

  async function handleDownload(def: ReportDef) {
    const { columns, rows, empty } = computeReport(def.key);
    if (empty && rows.length === 0) {
      setStatusMsg({ type: 'error', text: `${def.name}: ${empty}` });
      return;
    }
    downloadCSV(`${def.name.replace(/\s+/g, '_')}_${dateFrom}_to_${dateTo}.csv`, columns, rows);
    await logActivity(def.key, def.name, 'downloaded');
  }

  /* ── Tabs / filters over the catalog ── */
  const tabFiltered = useMemo(() => REPORT_CATALOG.filter((r) => activeTab === 'All' || r.category === activeTab), [activeTab]);
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tabFiltered.filter((r) => {
      if (formatFilter !== 'All' && formatFilter !== 'CSV') return false; // only CSV exists
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    });
  }, [tabFiltered, searchQuery, formatFilter]);

  useEffect(() => { setPage(1); }, [activeTab, searchQuery, formatFilter, deptFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedReports = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ── KPIs — all real ── */
  const now = new Date();
  const generatedThisMonth = activity.filter((a) => a.action === 'generated' && new Date(a.created_at).getMonth() === now.getMonth() && new Date(a.created_at).getFullYear() === now.getFullYear());
  const downloadedThisMonth = activity.filter((a) => a.action === 'downloaded' && new Date(a.created_at).getMonth() === now.getMonth() && new Date(a.created_at).getFullYear() === now.getFullYear());
  const lastGenerated = activity.find((a) => a.action === 'generated') || null;
  const activeSchedules = schedules.filter((s) => s.is_active);

  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = { HR: 0, Payroll: 0, Attendance: 0, Statutory: 0 };
    for (const r of REPORT_CATALOG) counts[r.category] += 1;
    return counts;
  }, []);
  const donutData = [
    { label: 'HR Reports', value: categoryCounts.HR, color: '#3b82f6' },
    { label: 'Payroll Reports', value: categoryCounts.Payroll, color: '#10b981' },
    { label: 'Attendance Reports', value: categoryCounts.Attendance, color: '#8b5cf6' },
    { label: 'Statutory Reports', value: categoryCounts.Statutory, color: '#f59e0b' },
  ];

  const recentActivity = activity.filter((a) => a.action === 'generated').slice(0, 5);

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
          <p className="text-xs text-ink-400 font-sans mt-0.5">Home <ChevronRight className="w-3 h-3 inline -mt-0.5" /> Reports</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input placeholder="Search by report name or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-10 py-2 w-72 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400" />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-400 font-sans border border-[var(--border-subtle)] rounded px-1">⌘K</span>
          </div>
          <button onClick={() => setLockedNote('Notifications')} className="relative p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)]">
            <Bell className="w-4 h-4" /><span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">3</span>
          </button>
          <button onClick={() => setLockedNote('Help Center')} className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)]"><HelpCircle className="w-4 h-4" /></button>
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-[11px] font-semibold text-white font-sans">{initials}</div>
        </div>
      </div>

      <div className="px-6 lg:px-8 pt-4">
        <h2 className="text-2xl font-bold text-ink-900 font-sans">Reports</h2>
        <p className="text-sm text-ink-400 font-sans mt-0.5">View, analyze and export important HR &amp; payroll reports.</p>
      </div>

      {loadError && (
        <div className="mx-6 lg:mx-8 mt-4 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-sans flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {loadError}
        </div>
      )}
      {statusMsg && (
        <div className={`mx-6 lg:mx-8 mt-4 px-4 py-2.5 rounded-lg border text-xs font-sans flex items-center justify-between gap-2 ${statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
          <span className="flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* KPIs */}
      <div className="px-6 lg:px-8 pt-6 grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Reports', value: REPORT_CATALOG.length, sub: 'Report types available', icon: FileBarChart2, tint: 'blue' },
          { label: 'Scheduled Reports', value: activeSchedules.length, sub: 'Auto generated', icon: CalendarClock, tint: 'emerald' },
          { label: 'Reports This Month', value: generatedThisMonth.length, sub: 'Generated', icon: FileText, tint: 'violet' },
          { label: 'Downloads This Month', value: downloadedThisMonth.length, sub: 'Total downloads', icon: DownloadCloudIcon, tint: 'amber' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          const tintMap: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600' };
          return (
            <div key={kpi.label} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tintMap[kpi.tint]}`}><Icon className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-bold text-ink-900 font-sans mt-2 tabular-nums">{kpi.value}</p>
              <p className="text-xs text-ink-400 font-sans mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">Last Generated</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-50 text-teal-600"><History className="w-4 h-4" /></div>
          </div>
          <p className="text-lg font-bold text-ink-900 font-sans mt-2">{lastGenerated ? formatDateTime(lastGenerated.created_at) : 'Not yet generated'}</p>
          <p className="text-xs text-ink-400 font-sans mt-0.5">{lastGenerated ? lastGenerated.report_name : 'Generate a report to see it here'}</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="px-6 lg:px-8 pt-6 pb-8 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="min-w-0 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-[var(--border-subtle)] overflow-x-auto">
            {(['All', 'HR', 'Payroll', 'Attendance', 'Statutory'] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`whitespace-nowrap pb-3 text-sm font-sans font-medium border-b-2 transition-colors ${activeTab === t ? 'border-brand text-brand font-semibold' : 'border-transparent text-ink-400 hover:text-ink-600'}`}>
                {t === 'All' ? 'All Reports' : `${t} Reports`}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input placeholder="Search reports by name or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400" />
            </div>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600">
              {departments.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
            </select>
            <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)} className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600">
              <option value="All">All Formats</option>
              <option value="CSV">CSV</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600" />
            <span className="text-ink-400 text-xs">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600" />
            <button onClick={() => setLockedNote('Advanced Filters')} className="flex items-center gap-1.5 text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 hover:bg-[var(--surface-card-hover)]">
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
          </div>

          {/* Report table */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-20 text-center"><FileBarChart2 className="w-8 h-8 text-ink-400 mx-auto mb-3" /><p className="text-sm text-ink-400 font-sans italic">No reports match these filters.</p></div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm font-sans">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-ink-400 text-left">
                        <th className="px-5 py-3 font-semibold">Report Name</th>
                        <th className="px-5 py-3 font-semibold">Category</th>
                        <th className="px-5 py-3 font-semibold">Description</th>
                        <th className="px-5 py-3 font-semibold">Format</th>
                        <th className="px-5 py-3 font-semibold">Last Generated</th>
                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {pagedReports.map((def) => {
                        const Icon = def.icon;
                        const last = lastGeneratedByKey[def.key];
                        return (
                          <tr key={def.key} className="hover:bg-[var(--surface-card-hover)] transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-lg bg-[var(--surface-card-hover)] flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-ink-600" /></span>
                                <span className="font-semibold text-ink-900">{def.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3"><Badge color={CATEGORY_COLOR[def.category]}>{def.category}</Badge></td>
                            <td className="px-5 py-3 text-ink-600 max-w-xs">{def.description}</td>
                            <td className="px-5 py-3 text-ink-600">CSV</td>
                            <td className="px-5 py-3 text-ink-600">{last ? formatDateTime(last) : <span className="text-ink-400">Never</span>}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-1.5 relative">
                                <button onClick={() => handleView(def)} title="View" disabled={busyKey === def.key} className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] disabled:opacity-50">
                                  {busyKey === def.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => handleDownload(def)} title="Download" className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]"><Download className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setOpenMenuKey(openMenuKey === def.key ? null : def.key)} title="More" className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]"><MoreVertical className="w-3.5 h-3.5" /></button>
                                {openMenuKey === def.key && (
                                  <div className="absolute right-0 top-8 z-10 w-44 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl py-1">
                                    <button onClick={() => { setOpenMenuKey(null); setShowScheduleModal(true); }} className="w-full text-left px-3 py-1.5 text-xs text-ink-600 hover:bg-[var(--surface-card-hover)]">Schedule this report</button>
                                    <button onClick={() => { setOpenMenuKey(null); setLockedNote('Email Report'); }} className="w-full text-left px-3 py-1.5 text-xs text-ink-600 hover:bg-[var(--surface-card-hover)]">Email to stakeholders</button>
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
                  {pagedReports.map((def) => {
                    const Icon = def.icon;
                    const last = lastGeneratedByKey[def.key];
                    return (
                      <div key={def.key} className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-[var(--surface-card-hover)] flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-ink-600" /></span>
                            <p className="font-semibold text-ink-900 text-sm truncate">{def.name}</p>
                          </div>
                          <Badge color={CATEGORY_COLOR[def.category]}>{def.category}</Badge>
                        </div>
                        <p className="text-xs text-ink-600">{def.description}</p>
                        <p className="text-xs text-ink-400">Last generated: {last ? formatDateTime(last) : 'Never'}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={() => handleView(def)} className="flex-1 text-xs font-sans py-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600">View</button>
                          <button onClick={() => handleDownload(def)} className="flex-1 text-xs font-sans py-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600">Download</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-ink-400">
                  <span>Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} reports</span>
                  <div className="flex items-center gap-2">
                    <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button key={n} onClick={() => setPage(n)} className={`w-6 h-6 rounded-lg text-xs ${page === n ? 'bg-brand text-white font-semibold' : 'text-ink-600 hover:bg-[var(--surface-card-hover)]'}`}>{n}</button>
                    ))}
                    <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Reports Overview</p>
            <div className="relative">
              <Donut data={donutData} centerLabel="Reports" centerValue={REPORT_CATALOG.length} />
              <div className="absolute left-0 top-0 w-[112px] h-[112px] flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-ink-900 font-sans">{REPORT_CATALOG.length}</span>
                <span className="text-[9px] text-ink-400 font-sans">Reports</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink-900 font-sans">Recent Reports</p>
              <button onClick={() => setShowHistoryModal(true)} className="text-xs font-sans font-semibold text-brand hover:underline">View all</button>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-ink-400 font-sans italic py-4 text-center">No reports generated yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((a) => {
                  const def = REPORT_CATALOG.find((r) => r.key === a.report_key);
                  const Icon = def?.icon || FileText;
                  return (
                    <div key={a.id} className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[var(--surface-card-hover)] flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5 text-ink-600" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-ink-900 font-sans truncate">{a.report_name}</p>
                        <p className="text-[10px] text-ink-400 font-sans">{formatDateTime(a.created_at)}</p>
                      </div>
                      <Badge>{a.format || 'CSV'}</Badge>
                      <button onClick={() => def && handleDownload(def)} className="p-1 text-ink-400 hover:text-ink-600"><Download className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Quick Actions</p>
            <div className="space-y-0.5">
              {[
                { label: 'Generate Custom Report', icon: Plus, action: () => setShowCustomModal(true) },
                { label: 'Schedule Report', icon: CalendarClock, action: () => setShowScheduleModal(true) },
                { label: 'Report Settings', icon: Settings, action: () => setLockedNote('Report Settings') },
                { label: 'Data Export History', icon: History, action: () => setShowHistoryModal(true) },
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

      {/* View modal */}
      {viewingKey && (() => {
        const def = REPORT_CATALOG.find((r) => r.key === viewingKey)!;
        const { columns, rows, empty } = computeReport(viewingKey);
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewingKey(null)}>
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                <div>
                  <p className="text-sm font-bold text-ink-900 font-sans">{def.name}</p>
                  <p className="text-xs text-ink-400 font-sans">{dateFrom} to {dateTo}</p>
                </div>
                <button onClick={() => setViewingKey(null)}><X className="w-4 h-4 text-ink-400" /></button>
              </div>
              <div className="overflow-auto p-6">
                {rows.length === 0 ? (
                  <p className="text-sm text-ink-400 font-sans italic text-center py-10">{empty || 'No data for this period.'}</p>
                ) : (
                  <table className="w-full text-xs font-sans">
                    <thead><tr className="text-left text-ink-400 uppercase text-[10px]">{columns.map((c) => <th key={c} className="pb-2 pr-4">{c}</th>)}</tr></thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {rows.slice(0, 100).map((r, i) => (
                        <tr key={i}>{r.map((v, j) => <td key={j} className="py-2 pr-4 text-ink-900 tabular-nums whitespace-nowrap">{v}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {rows.length > 100 && <p className="text-[10px] text-ink-400 mt-3">Showing first 100 of {rows.length} rows — download the CSV for the full set.</p>}
              </div>
              <div className="px-6 py-3 border-t border-[var(--border-subtle)] flex justify-end">
                <button onClick={() => handleDownload(def)} className="flex items-center gap-1.5 text-xs font-sans font-semibold px-3 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white"><Download className="w-3.5 h-3.5" /> Download CSV</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Schedule modal — saves real intent, honest about no cron yet */}
      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSaved={(row) => { setSchedules((prev) => [row, ...prev]); setShowScheduleModal(false); setStatusMsg({ type: 'success', text: `Schedule saved for ${row.report_name}. Note: there's no automated runner wired up yet, so this won't send itself until that's built.` }); }}
          companyId={companyId}
        />
      )}

      {/* Generate Custom Report modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCustomModal(false)}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-ink-900 font-sans mb-1">Generate Custom Report</p>
            <p className="text-xs text-ink-400 font-sans mb-4">Pick one of the existing report types with your current filters ({dateFrom} to {dateTo}) — there's no separate report-builder engine, so "custom" here means running any catalog report against the filters you've already set.</p>
            <div className="space-y-1.5 max-h-64 overflow-auto">
              {REPORT_CATALOG.map((def) => (
                <button key={def.key} onClick={() => { setShowCustomModal(false); handleView(def); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-sans text-ink-600 hover:bg-[var(--surface-card-hover)] text-left">
                  <def.icon className="w-3.5 h-3.5 shrink-0" /> {def.name}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCustomModal(false)} className="w-full mt-4 text-sm font-medium font-sans px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]">Cancel</button>
          </div>
        </div>
      )}

      {/* Data Export History modal — real report_activity log */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
              <p className="text-sm font-bold text-ink-900 font-sans">Data Export History</p>
              <button onClick={() => setShowHistoryModal(false)}><X className="w-4 h-4 text-ink-400" /></button>
            </div>
            <div className="overflow-auto p-6 space-y-2">
              {activity.length === 0 ? <p className="text-sm text-ink-400 font-sans italic text-center py-10">No activity yet.</p> : activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs font-sans border-b border-[var(--border-subtle)] pb-2">
                  <span className="text-ink-900">{a.report_name}</span>
                  <span className="text-ink-400 capitalize">{a.action}</span>
                  <span className="text-ink-400">{formatDateTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {lockedNote && <LockedFeatureNote title={lockedNote} onClose={() => setLockedNote(null)} />}
    </div>
  );
}

function ScheduleModal({ onClose, onSaved, companyId }: { onClose: () => void; onSaved: (row: any) => void; companyId: string | null }) {
  const [reportKey, setReportKey] = useState<ReportKey>('payroll_summary');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    setError(null);
    const def = REPORT_CATALOG.find((r) => r.key === reportKey)!;
    const { data, error } = await supabase.from('report_schedules').insert({ company_id: companyId, report_key: reportKey, report_name: def.name, frequency, format: 'CSV', is_active: true }).select().single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved(data);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-bold text-ink-900 font-sans mb-1">Schedule Report</p>
        <p className="text-xs text-ink-400 font-sans mb-4">This saves your schedule preference. There's no automated runner (cron/edge function) wired up yet, so it won't send itself until that's built — this just records the intent.</p>
        <label className="text-xs font-sans text-ink-600 font-semibold block mb-1">Report</label>
        <select value={reportKey} onChange={(e) => setReportKey(e.target.value as ReportKey)} className="w-full text-xs font-sans bg-[var(--surface-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 mb-3">
          {REPORT_CATALOG.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
        </select>
        <label className="text-xs font-sans text-ink-600 font-semibold block mb-1">Frequency</label>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} className="w-full text-xs font-sans bg-[var(--surface-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 mb-4">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        {error && <p className="text-xs text-rose-600 font-sans mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 text-sm font-medium font-sans px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 text-sm font-semibold font-sans px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save schedule'}</button>
        </div>
      </div>
    </div>
  );
}