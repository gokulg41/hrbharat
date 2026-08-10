"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatINR } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import {
  Briefcase,
  TrendingDown,
  Wallet,
  CheckCircle2,
  Calendar,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Landmark,
  CreditCard,
  Circle,
  Bell,
  LogOut,
  AlertCircle,
  RefreshCw,
  Loader2,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL (verified against live schema before writing this page)
   ─────────────────────────────────────────────
   - `payroll_ledger` is the real, actively-written payroll source of truth
     (see app/admin/payroll, app/admin/payslips, app/employee/page.tsx — all
     read/write this table exclusively). Columns actually available per row:
     employee_code, employee_name, designation, department, month_year,
     gross_salary, epf_deduction, esic_deduction, prof_tax_deduction,
     net_take_home, status, created_at. There is NO stored breakdown of
     gross into Basic/HRA/Special Allowance/Other Allowances anywhere in
     the schema, so the earnings side of the salary card shows a single
     real "Gross Salary" line rather than inventing a split that doesn't
     exist in the database.
   - `payroll_ledger` previously only had an owner-scoped RLS policy, so an
     employee querying their own rows client-side (anon key) got zero
     results. A companion migration
     (20260810060000_employee_self_payroll_ledger_read.sql) adds a
     "employee_code belongs to me" SELECT policy, mirroring the existing
     "Employees can view their assigned shift" pattern.
   - `payslips.pdf_url` has no generation pipeline anywhere in the codebase
     (confirmed in app/admin/payslips/page.tsx notes), so "Download
     Payslip" here generates a real PDF client-side from the actual
     payroll_ledger row (same approach the previous version of this page
     used), instead of linking to a file that doesn't exist.
   - Payment Method has no backing column — "Bank Transfer" is shown as a
     static descriptive label (not a per-row fabricated fact), consistent
     with employees always being paid via their captured bank details.
   - Bank account number is always masked to the last 4 digits before
     rendering; the full number is never sent to the DOM.
───────────────────────────────────────────── */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseMonthYear(monthYear?: string | null): { year: number; monthIdx: number } | null {
  if (!monthYear) return null;
  const parts = monthYear.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const monthIdx = MONTHS.findIndex((m) => m.toLowerCase() === parts[0].toLowerCase());
  const year = parseInt(parts[1], 10);
  if (monthIdx === -1 || Number.isNaN(year)) return null;
  return { year, monthIdx };
}

/** Sortable numeric key for a ledger row's period. Falls back to created_at for any month_year value that doesn't parse as "Month YYYY". */
function monthSortKey(monthYear?: string | null, fallbackDate?: string | null) {
  const parsed = parseMonthYear(monthYear);
  if (parsed) return parsed.year * 12 + parsed.monthIdx;
  return fallbackDate ? new Date(fallbackDate).getTime() / (1000 * 60 * 60 * 24 * 30) : 0;
}

function maskAccount(num?: string | null) {
  if (!num) return null;
  const digits = String(num).replace(/\s+/g, '');
  return digits.length <= 4 ? `•••• ${digits}` : `•••• ${digits.slice(-4)}`;
}

function statusMeta(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return { label: 'Paid', text: 'text-status-success', bg: 'bg-status-success-bg' };
  if (s === 'processing') return { label: 'Processing', text: 'text-brand', bg: 'bg-brand-subtle' };
  if (s === 'pending') return { label: 'Pending', text: 'text-status-warning', bg: 'bg-status-warning-bg' };
  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Processed',
    text: 'text-ink-600',
    bg: 'bg-surface-card-hover',
  };
}

/* ── Small shared bits ───────────────────────────────────────── */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

function SectionCard({
  title,
  action,
  children,
  className = '',
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface-card border border-border-subtle rounded-2xl shadow-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          {title && <h2 className="text-[15px] font-bold text-ink-900 font-sans">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function EmployeePayrollPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email?.toLowerCase().trim())
        .single();

      if (empErr || !emp) {
        setEmployee(null);
        setLedgerRows([]);
        setLoading(false);
        return;
      }
      setEmployee(emp);

      const { data: rows, error: ledgerErr } = await supabase
        .from('payroll_ledger')
        .select('*')
        .eq('company_id', emp.company_id)
        .eq('employee_code', emp.employee_code)
        .order('created_at', { ascending: false });

      if (ledgerErr) throw ledgerErr;
      setLedgerRows(rows || []);
    } catch (err) {
      console.error('Payroll load error:', err);
      setError('Unable to load payroll information.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Standard fetch-on-mount pattern (same as elsewhere in this codebase,
    // e.g. components/TopBar.tsx) — fetchPayroll owns its own loading/error
    // state internally.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayroll();
  }, [fetchPayroll]);

  /* Months available for this employee, most recent first */
  const monthsDesc = useMemo(() => {
    const rowByMonth = new Map<string, any>();
    ledgerRows.forEach((r) => {
      if (!rowByMonth.has(r.month_year)) rowByMonth.set(r.month_year, r);
    });
    return Array.from(rowByMonth.keys()).sort((a, b) => {
      const ra = rowByMonth.get(a);
      const rb = rowByMonth.get(b);
      return monthSortKey(b, rb?.created_at) - monthSortKey(a, ra?.created_at);
    });
  }, [ledgerRows]);

  // Derived instead of synced via effect: falls back to the most recent
  // month whenever there's no explicit user selection yet, or the user's
  // previous selection no longer exists in the (re)loaded ledger.
  const effectiveMonth =
    selectedMonth && monthsDesc.includes(selectedMonth) ? selectedMonth : monthsDesc[0] ?? null;

  const selectedRow = useMemo(
    () => ledgerRows.find((r) => r.month_year === effectiveMonth) || null,
    [ledgerRows, effectiveMonth]
  );

  const gross = Number(selectedRow?.gross_salary) || 0;
  const epf = Number(selectedRow?.epf_deduction) || 0;
  const esic = Number(selectedRow?.esic_deduction) || 0;
  const profTax = Number(selectedRow?.prof_tax_deduction) || 0;
  const totalDeductions = epf + esic + profTax;
  const net = Number(selectedRow?.net_take_home) || 0;
  const status = statusMeta(selectedRow?.status);

  const payPeriod = useMemo(() => {
    if (!selectedRow) return '—';
    const parsed = parseMonthYear(selectedRow.month_year);
    if (!parsed) return selectedRow.month_year;
    const lastDay = new Date(parsed.year, parsed.monthIdx + 1, 0).getDate();
    const monShort = MONTHS[parsed.monthIdx].slice(0, 3);
    return `01 ${monShort} – ${lastDay} ${monShort} ${parsed.year}`;
  }, [selectedRow]);

  const paymentDate = selectedRow?.created_at
    ? new Date(selectedRow.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const bankRaw = employee?.bank_account_number || employee?.account_number;
  const bankMasked = maskAccount(bankRaw) || 'Not added';

  /* Chronological ascending — for the trend chart */
  const chartData = useMemo(() => {
    return [...ledgerRows]
      .sort((a, b) => monthSortKey(a.month_year, a.created_at) - monthSortKey(b.month_year, b.created_at))
      .map((r) => {
        const parsed = parseMonthYear(r.month_year);
        const label = parsed ? `${MONTHS[parsed.monthIdx].slice(0, 3)} ${String(parsed.year).slice(2)}` : r.month_year;
        return {
          name: label,
          gross: Number(r.gross_salary) || 0,
          net: Number(r.net_take_home) || 0,
        };
      });
  }, [ledgerRows]);

  /* Chronological descending — for the history table */
  const historySorted = useMemo(() => {
    return [...ledgerRows].sort(
      (a, b) => monthSortKey(b.month_year, b.created_at) - monthSortKey(a.month_year, a.created_at)
    );
  }, [ledgerRows]);

  const totalPages = Math.max(1, Math.ceil(historySorted.length / PAGE_SIZE));
  // Clamp instead of syncing via effect — keeps `page` in range even after
  // the ledger reloads with fewer rows, without a setState-in-effect.
  const currentPage = Math.min(page, totalPages);
  const pageRows = historySorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const generatePDFSlip = async (row: any) => {
    if (!employee || !row) return;
    setGeneratingId(row.id);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const rGross = Number(row.gross_salary) || 0;
      const rEpf = Number(row.epf_deduction) || 0;
      const rEsic = Number(row.esic_deduction) || 0;
      const rProfTax = Number(row.prof_tax_deduction) || 0;
      const rNet = Number(row.net_take_home) || 0;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(11, 31, 68);
      doc.text('HRBharat', 20, 25);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('Payslip', 20, 30);
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 35, 190, 35);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(11, 31, 68);
      doc.text(`Payslip for ${row.month_year}`, 20, 45);

      doc.setFontSize(10);
      doc.text('Employee', 20, 55);
      doc.text('Payment', 110, 55);
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 57, 95, 57);
      doc.line(110, 57, 190, 57);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Name: ${employee.full_name}`, 20, 64);
      doc.text(`ID: ${employee.employee_code}`, 20, 70);
      doc.text(`Role: ${employee.designation || '-'}`, 20, 76);
      doc.text(`Dept: ${employee.department || '-'}`, 20, 82);
      const statusLabel = row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Processed';
      doc.text(`Status: ${statusLabel}`, 110, 64);
      const masked = maskAccount(employee.bank_account_number || employee.account_number);
      doc.text(`Account: ${masked || 'N/A'}`, 110, 70);
      doc.text(`IFSC: ${employee.ifsc_code || 'N/A'}`, 110, 76);

      doc.setFillColor(247, 249, 252);
      doc.rect(20, 92, 170, 8, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(11, 31, 68);
      doc.text('Description', 22, 97);
      doc.text('Amount (INR)', 145, 97);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Gross Salary', 22, 108);
      doc.text(`Rs. ${rGross.toLocaleString('en-IN')}.00`, 145, 108);
      doc.line(20, 112, 190, 112);
      doc.text('EPF', 22, 120);
      doc.text(`- Rs. ${rEpf.toLocaleString('en-IN')}.00`, 145, 120);
      doc.line(20, 124, 190, 124);
      doc.text('ESIC', 22, 132);
      doc.text(`- Rs. ${rEsic.toLocaleString('en-IN')}.00`, 145, 132);
      doc.line(20, 136, 190, 136);
      doc.text('Professional Tax', 22, 144);
      doc.text(`- Rs. ${rProfTax.toLocaleString('en-IN')}.00`, 145, 144);
      doc.line(20, 148, 190, 148);

      doc.setFillColor(226, 232, 240);
      doc.rect(20, 156, 170, 10, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(11, 31, 68);
      doc.setFontSize(10);
      doc.text('Net Take-Home', 22, 162);
      doc.text(`INR ${rNet.toLocaleString('en-IN')}.00`, 145, 162);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('System-generated document. No physical signature required.', 20, 185);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 190);

      doc.save(`Payslip_${employee.employee_code}_${String(row.month_year).replace(' ', '_')}.pdf`);
    } catch (err) {
      alert('Could not generate payslip PDF: ' + err);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleExport = () => {
    if (!historySorted.length) return;
    const header = ['Month', 'Gross Salary', 'EPF', 'ESIC', 'Professional Tax', 'Total Deductions', 'Net Salary', 'Status'];
    const lines = [header.join(',')];
    historySorted.forEach((r) => {
      const rEpf = Number(r.epf_deduction) || 0;
      const rEsic = Number(r.esic_deduction) || 0;
      const rProfTax = Number(r.prof_tax_deduction) || 0;
      lines.push(
        [
          `"${r.month_year}"`,
          Number(r.gross_salary) || 0,
          rEpf,
          rEsic,
          rProfTax,
          rEpf + rEsic + rProfTax,
          Number(r.net_take_home) || 0,
          `"${statusMeta(r.status).label}"`,
        ].join(',')
      );
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HRBharat_Payroll_${employee?.employee_code || 'employee'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-canvas font-sans">
        <div className="h-14 border-b border-border-subtle bg-surface-card px-6 flex items-center">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="px-6 lg:px-8 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-card border border-border-subtle rounded-2xl p-5 space-y-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="min-h-screen bg-surface-canvas font-sans flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-status-danger-bg flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-5 h-5 text-status-danger" />
          </div>
          <p className="text-sm font-semibold text-ink-900">{error}</p>
          <p className="text-xs text-ink-600 mt-1">Please try again.</p>
          <button
            onClick={fetchPayroll}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  /* ── No employee profile ── */
  if (!employee) {
    return (
      <div className="min-h-screen bg-surface-canvas font-sans flex items-center justify-center px-6">
        <p className="text-sm text-ink-600">No payroll profile found.</p>
      </div>
    );
  }

  const noPayrollYet = ledgerRows.length === 0;

  return (
    <div className="min-h-screen bg-surface-canvas font-sans text-ink-900">
      {/* TOP HEADER */}
      <header className="border-b border-border-subtle sticky top-0 z-30 bg-surface-canvas/95 backdrop-blur">
        <div className="px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center shrink-0">
              <span className="text-white text-[9px] font-bold">HR</span>
            </div>
            <span className="text-ink-400">/</span>
            <span className="font-semibold text-ink-900">Payroll</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 lg:px-8 py-6 space-y-6 max-w-[1400px] mx-auto">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-ink-900">Payroll</h1>
            <p className="mt-1 text-sm text-ink-600">View your salary details, payslips and payment history.</p>
          </div>

          {!noPayrollYet && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <button
                  onClick={() => setMonthPickerOpen((o) => !o)}
                  className="flex items-center gap-2 text-sm font-medium text-ink-900 bg-surface-card border border-border-subtle rounded-lg px-3.5 py-2 hover:bg-surface-card-hover transition-colors cursor-pointer shadow-card"
                >
                  <Calendar className="w-4 h-4 text-ink-400" />
                  {effectiveMonth}
                  <ChevronDown className="w-3.5 h-3.5 text-ink-400" />
                </button>
                {monthPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMonthPickerOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 z-30 bg-surface-card border border-border-subtle rounded-xl shadow-lg py-1.5 w-48 max-h-72 overflow-y-auto">
                      {monthsDesc.map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setSelectedMonth(m);
                            setMonthPickerOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-sm font-sans transition-colors cursor-pointer ${
                            m === effectiveMonth ? 'bg-brand-subtle text-brand font-semibold' : 'text-ink-600 hover:bg-surface-card-hover'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-900 bg-surface-card border border-border-subtle rounded-lg px-3.5 py-2 hover:bg-surface-card-hover transition-colors cursor-pointer shadow-card"
              >
                <Download className="w-4 h-4 text-ink-400" />
                Export
              </button>
            </div>
          )}
        </div>

        {noPayrollYet ? (
          /* ── EMPTY: no payroll processed yet ── */
          <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-card py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center mb-4">
              <Wallet className="w-5 h-5 text-brand" />
            </div>
            <p className="text-sm font-semibold text-ink-900">Payroll Not Available</p>
            <p className="text-xs text-ink-600 mt-1 max-w-xs">
              Your salary information will appear here once payroll has been processed.
            </p>
          </div>
        ) : (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-card p-5 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[var(--accent-violet-bg)] text-[var(--accent-violet)] flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-ink-600">Gross Salary</p>
                  <p className="text-xl font-bold text-ink-900 truncate">{formatINR(gross)}</p>
                </div>
              </div>

              <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-card p-5 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-status-danger-bg text-status-danger flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-ink-600">Total Deductions</p>
                  <p className="text-xl font-bold text-ink-900 truncate">{formatINR(totalDeductions)}</p>
                </div>
              </div>

              <div className="bg-brand-subtle border border-brand/20 rounded-2xl shadow-card p-5 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white text-brand flex items-center justify-center shrink-0 shadow-sm">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-ink-600">Net Salary</p>
                  <p className="text-xl font-bold text-ink-900 truncate">{formatINR(net)}</p>
                </div>
              </div>

              <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-card p-5 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-status-success-bg text-status-success flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-ink-600">Payment Status</p>
                  <p className={`text-xl font-bold truncate ${status.text}`}>{status.label}</p>
                </div>
              </div>
            </div>

            {/* MAIN SALARY + PAYMENT INFO */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
              {/* Salary breakdown */}
              <SectionCard title={`${effectiveMonth ?? ''} Salary`}>
                <div className="px-6 pb-6 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {/* Earnings */}
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">Earnings</p>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-ink-600">Gross Salary</span>
                          <span className="font-medium text-ink-900 font-mono">{formatINR(gross)}</span>
                        </div>
                      </div>
                      <div className="border-t border-border-subtle mt-4 pt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-brand">Gross Earnings</span>
                        <span className="text-sm font-bold text-brand font-mono">{formatINR(gross)}</span>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-status-danger mb-3">Deductions</p>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-ink-600">EPF</span>
                          <span className="font-medium text-ink-900 font-mono">{formatINR(epf)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-ink-600">ESIC</span>
                          <span className="font-medium text-ink-900 font-mono">{formatINR(esic)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-ink-600">Professional Tax</span>
                          <span className="font-medium text-ink-900 font-mono">{formatINR(profTax)}</span>
                        </div>
                      </div>
                      <div className="border-t border-border-subtle mt-4 pt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-status-danger">Total Deductions</span>
                        <span className="text-sm font-bold text-status-danger font-mono">{formatINR(totalDeductions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net take-home */}
                  <div className="mt-6 bg-brand-subtle border border-brand/20 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-ink-600">Net Take-Home</p>
                      <p className="text-2xl font-bold text-ink-900">{formatINR(net)}</p>
                    </div>
                    <button
                      onClick={() => selectedRow && generatePDFSlip(selectedRow)}
                      disabled={!selectedRow || generatingId === selectedRow?.id}
                      className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {generatingId === selectedRow?.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {generatingId === selectedRow?.id ? 'Generating…' : 'Download Payslip'}
                    </button>
                  </div>
                </div>
              </SectionCard>

              {/* Payment information */}
              <SectionCard title="Payment Information">
                <div className="px-6 pb-5 pt-3 divide-y divide-border-subtle">
                  {[
                    { icon: Calendar, label: 'Pay Period', value: payPeriod },
                    { icon: Calendar, label: 'Payment Date', value: paymentDate },
                    { icon: CreditCard, label: 'Payment Method', value: 'Bank Transfer' },
                    { icon: Landmark, label: 'Bank Account', value: bankMasked },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <row.icon className="w-4 h-4 text-ink-400 shrink-0" />
                        <span className="text-sm text-ink-600 truncate">{row.label}</span>
                      </div>
                      <span className="text-sm font-medium text-ink-900 font-mono text-right shrink-0">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-2.5">
                      <Circle className="w-4 h-4 text-ink-400" />
                      <span className="text-sm text-ink-600">Status</span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${status.bg} ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.text.replace('text-', 'bg-')}`} />
                      {status.label}
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* PAYSLIP HISTORY + TREND */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5 items-start">
              {/* History table */}
              <SectionCard title="Payslip History">
                <div className="px-6 pb-5 pt-3">
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-ink-400 border-b border-border-subtle">
                          <th className="font-semibold pb-2.5 pr-3">Month</th>
                          <th className="font-semibold pb-2.5 pr-3">Gross Salary</th>
                          <th className="font-semibold pb-2.5 pr-3">Deductions</th>
                          <th className="font-semibold pb-2.5 pr-3">Net Salary</th>
                          <th className="font-semibold pb-2.5 pr-3">Status</th>
                          <th className="font-semibold pb-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {pageRows.map((row) => {
                          const rEpf = Number(row.epf_deduction) || 0;
                          const rEsic = Number(row.esic_deduction) || 0;
                          const rProfTax = Number(row.prof_tax_deduction) || 0;
                          const rowStatus = statusMeta(row.status);
                          return (
                            <tr key={row.id} className="hover:bg-surface-card-hover transition-colors">
                              <td className="py-3 pr-3 font-medium text-ink-900 whitespace-nowrap">{row.month_year}</td>
                              <td className="py-3 pr-3 font-mono text-ink-900 whitespace-nowrap">{formatINR(row.gross_salary)}</td>
                              <td className="py-3 pr-3 font-mono text-ink-900 whitespace-nowrap">{formatINR(rEpf + rEsic + rProfTax)}</td>
                              <td className="py-3 pr-3 font-mono font-semibold text-ink-900 whitespace-nowrap">{formatINR(row.net_take_home)}</td>
                              <td className="py-3 pr-3">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${rowStatus.bg} ${rowStatus.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${rowStatus.text.replace('text-', 'bg-')}`} />
                                  {rowStatus.label}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => generatePDFSlip(row)}
                                  disabled={generatingId === row.id}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-surface-card-hover border border-border-subtle px-2.5 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-40"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  {generatingId === row.id ? 'Generating…' : 'Download'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
                      <p className="text-xs text-ink-600">
                        Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, historySorted.length)} of {historySorted.length} entries
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="w-7 h-7 rounded-md border border-border-subtle flex items-center justify-center text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .slice(Math.max(0, currentPage - 2), Math.max(0, currentPage - 2) + 3)
                          .map((p) => (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                p === currentPage ? 'bg-brand text-white' : 'text-ink-600 hover:bg-surface-card-hover border border-border-subtle'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        <button
                          onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="w-7 h-7 rounded-md border border-border-subtle flex items-center justify-center text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Salary trend */}
              <SectionCard title="Salary Trend">
                <div className="px-4 pb-5 pt-3">
                  {chartData.length < 2 ? (
                    <div className="h-[260px] flex flex-col items-center justify-center gap-2">
                      <Activity className="w-6 h-6 text-ink-400" />
                      <p className="text-xs text-ink-400 text-center max-w-[220px]">
                        Your salary trend will appear here once more than one month of payroll history is available.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 px-2 mb-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
                          <span className="w-2 h-2 rounded-full bg-brand" /> Gross Salary
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
                          <span className="w-2 h-2 rounded-full bg-status-success" /> Net Salary
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                            axisLine={{ stroke: 'var(--border-subtle)' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}K` : v}`}
                            width={44}
                          />
                          <Tooltip
                            formatter={(value) => formatINR(Number(value))}
                            contentStyle={{
                              fontSize: 12,
                              borderRadius: 10,
                              border: '1px solid var(--border-subtle)',
                              boxShadow: 'var(--shadow-card)',
                            }}
                          />
                          <Line type="monotone" dataKey="gross" stroke="var(--brand-primary)" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="net" stroke="var(--status-success)" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </main>
    </div>
  );
}