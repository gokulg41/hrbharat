"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { commitMonthlyPayrollAction } from '@/lib/actions';
import { calculateIndianPayrollBreakdown } from '@/lib/payroll-math';
import {
  Banknote,
  Download,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  IndianRupee,
  TrendingUp,
  FileText,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function Avatar({ name }: { name: string }) {
  const initials = (name || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
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
    gray:    'bg-stone-100 text-stone-500 border-stone-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
    rose:    'bg-rose-50 text-rose-600 border-rose-100',
    teal:    'bg-teal-50 text-teal-700 border-teal-100',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border font-sans ${map[color]}`}>
      {children}
    </span>
  );
}

function Divider() {
  return <div className="border-t border-[#E8E0CC]" />;
}

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400 font-sans">
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      {children}
    </div>
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

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function PayrollPage() {
  const router = useRouter();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [ledgerHistory, setLedgerHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [customMonth, setCustomMonth] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'run' | 'history'>('run');

  /* ── Load data ── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('company_id, role').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/login'); return; }

      setCompanyId(profile.company_id);

      const [empRes, ledgerRes] = await Promise.all([
        supabase.from('employees').select('*').eq('company_id', profile.company_id).order('full_name'),
        supabase.from('payroll_ledger').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
      ]);

      if (empRes.data) setEmployees(empRes.data);
      if (ledgerRes.data) setLedgerHistory(ledgerRes.data);
      setLoading(false);
    }
    load();
  }, [router]);

  /* ── Derived stats ── */
  const filtered = employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalGross = employees.reduce((s, e) => s + (Number(e.monthly_salary) || 0), 0);
  const totalNet = employees.reduce((s, e) => {
    const b = calculateIndianPayrollBreakdown(e.monthly_salary);
    return s + b.netHome;
  }, 0);
  const totalDeductions = totalGross - totalNet;

  /* ── Month picker ── */
  const targetMonth = customMonth.trim() || selectedMonth;

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

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
        // Refresh ledger
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

  /* ── Ledger history grouped by month ── */
  const ledgerByMonth = ledgerHistory.reduce((acc: Record<string, any[]>, row) => {
    if (!acc[row.month_year]) acc[row.month_year] = [];
    acc[row.month_year].push(row);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-sm bg-stone-200 animate-pulse" />
          <p className="text-sm text-stone-400 font-sans">Loading payroll…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] font-['Georgia',_serif] antialiased">

      {/* ── Page header ── */}
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Title block */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs text-stone-400 font-sans">Payroll</span>
          </div>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight leading-tight">
            Payroll Ledger
          </h1>
          <p className="text-stone-500 text-sm font-sans mt-1.5">
            Process and track monthly salary disbursements for your team.
          </p>
        </div>

        {/* ── Summary metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#DDD5C0] rounded-xl overflow-hidden border border-[#DDD5C0] mb-8">
          {[
            { label: 'Total Employees', value: String(employees.length), icon: <Users className="w-3.5 h-3.5" />, sub: 'on payroll' },
            { label: 'Total Gross', value: `₹${totalGross.toLocaleString('en-IN')}`, icon: <IndianRupee className="w-3.5 h-3.5" />, sub: 'per month' },
            { label: 'Total Deductions', value: `₹${totalDeductions.toLocaleString('en-IN')}`, icon: <TrendingUp className="w-3.5 h-3.5" />, sub: 'EPF + ESIC + PT' },
            { label: 'Net Disbursement', value: `₹${totalNet.toLocaleString('en-IN')}`, icon: <Banknote className="w-3.5 h-3.5" />, sub: 'take-home total' },
          ].map((m) => (
            <div key={m.label} className="bg-[#FDF8F0] px-5 py-5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-sans text-stone-400">
                {m.icon}
                <span className="text-[10px] font-semibold uppercase tracking-widest">{m.label}</span>
              </div>
              <span className="text-2xl font-bold text-stone-900 font-sans tabular-nums leading-none">{m.value}</span>
              <p className="text-[11px] text-stone-400 font-sans">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Status banner ── */}
        {statusMsg && (
          <div className={`mb-6 px-4 py-3 rounded-lg border text-sm font-sans flex items-center gap-3 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {statusMsg.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {statusMsg.text}
          </div>
        )}

        {/* ── View toggle ── */}
        <div className="flex gap-0.5 bg-[#F0EAD9] p-1 rounded-lg border border-[#DDD5C0] w-fit mb-6">
          {[
            { id: 'run', label: 'Run Payroll' },
            { id: 'history', label: `Ledger History (${Object.keys(ledgerByMonth).length})` },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id as any)}
              className={`px-4 py-1.5 rounded-md text-xs font-sans font-medium cursor-pointer transition-all ${
                activeView === v.id
                  ? 'bg-[#FDF8F0] text-stone-900 border border-[#DDD5C0] shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════
            VIEW: RUN PAYROLL
        ════════════════════════════════ */}
        {activeView === 'run' && (
          <div className="space-y-5">

            {/* Controls bar */}
            <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">

                {/* Month selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                    className="flex items-center gap-2 text-sm font-sans font-medium text-stone-700 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg px-3 py-2 hover:bg-[#F0EAD9] transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-stone-400" />
                    {targetMonth}
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  </button>

                  {showMonthPicker && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl shadow-lg p-3 w-64">
                      {/* Year selector */}
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 font-sans">Year</span>
                        <div className="flex gap-1">
                          {years.map((y) => (
                            <button
                              key={y}
                              onClick={() => setSelectedYear(y)}
                              className={`text-xs font-sans px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                selectedYear === y ? 'bg-stone-900 text-stone-50' : 'text-stone-500 hover:bg-[#F0EAD9]'
                              }`}
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
                              onClick={() => { setSelectedMonth(val); setCustomMonth(''); setShowMonthPicker(false); }}
                              className={`text-xs font-sans py-1.5 rounded-lg cursor-pointer transition-colors ${
                                targetMonth === val
                                  ? 'bg-stone-900 text-stone-50 font-semibold'
                                  : 'text-stone-600 hover:bg-[#F0EAD9]'
                              }`}
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
                          onChange={(e) => setCustomMonth(e.target.value)}
                          className="w-full text-xs font-sans text-stone-700 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg px-2.5 py-1.5 focus:outline-none placeholder:text-stone-300"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search employees…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-sm font-sans text-stone-800 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-300 w-52"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs font-sans font-semibold text-stone-600 hover:text-stone-900 bg-[#F0EAD9] hover:bg-[#E8E0CC] border border-[#DDD5C0] px-3 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                <button
                  onClick={handleDisburse}
                  disabled={processing || employees.length === 0}
                  className="flex items-center gap-1.5 text-xs font-sans font-semibold bg-stone-900 hover:bg-stone-700 text-stone-50 px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  {processing ? 'Processing…' : `Disburse — ${targetMonth}`}
                </button>
              </div>
            </div>

            {/* Employee payroll table */}
            <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl overflow-hidden">

              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 border-b border-[#DDD5C0] bg-[#F0EAD9]">
                {['Employee', 'Gross', 'EPF', 'ESIC', 'Prof Tax', 'Net Take-Home'].map((h) => (
                  <div key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400 font-sans">
                    {h}
                  </div>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-stone-400 font-sans italic">No employees match your search.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8E0CC]">
                  {filtered.map((emp) => {
                    const b = calculateIndianPayrollBreakdown(emp.monthly_salary);
                    const isExpanded = expandedEmp === emp.id;

                    return (
                      <div key={emp.id}>
                        {/* Main row */}
                        <div
                          className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-0 hover:bg-[#F5F0E8] transition-colors cursor-pointer group"
                          onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                        >
                          {/* Employee */}
                          <div className="px-4 py-3.5 flex items-center gap-3">
                            <Avatar name={emp.full_name} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-stone-900 font-sans truncate">{emp.full_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <Badge>{emp.employee_code}</Badge>
                                {emp.department && <Badge color="teal">{emp.department}</Badge>}
                              </div>
                            </div>
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5 text-stone-400 ml-auto shrink-0" />
                              : <ChevronDown className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-400 ml-auto shrink-0 transition-colors" />
                            }
                          </div>
                          <div className="px-4 py-3.5 flex items-center text-sm text-stone-700 font-sans tabular-nums">₹{b.gross.toLocaleString('en-IN')}</div>
                          <div className="px-4 py-3.5 flex items-center text-sm text-stone-500 font-sans tabular-nums">₹{b.epf.toLocaleString('en-IN')}</div>
                          <div className="px-4 py-3.5 flex items-center text-sm text-stone-500 font-sans tabular-nums">₹{b.esic.toLocaleString('en-IN')}</div>
                          <div className="px-4 py-3.5 flex items-center text-sm text-stone-500 font-sans tabular-nums">₹{b.profTax.toLocaleString('en-IN')}</div>
                          <div className="px-4 py-3.5 flex items-center text-sm font-semibold text-emerald-700 font-sans tabular-nums">₹{b.netHome.toLocaleString('en-IN')}</div>
                        </div>

                        {/* Expanded breakdown */}
                        {isExpanded && (
                          <div className="bg-[#F5F0E8] border-t border-[#E8E0CC] px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <SectionLabel>Statutory Deductions</SectionLabel>
                              <div className="space-y-2">
                                {[
                                  { label: 'EPF (Employee PF @ 12%)', value: b.epf, note: `on ₹${Math.min(b.gross, 15000).toLocaleString('en-IN')} basis` },
                                  { label: 'ESIC (@ 0.75%)', value: b.esic, note: b.gross > 21000 ? 'not applicable above ₹21,000' : `on gross` },
                                  { label: 'Professional Tax', value: b.profTax, note: 'state standard slab' },
                                ].map((d) => (
                                  <div key={d.label} className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs font-sans text-stone-700">{d.label}</p>
                                      <p className="text-[10px] text-stone-400 font-sans italic">{d.note}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-stone-700 font-sans tabular-nums">
                                      − ₹{d.value.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <SectionLabel>Summary</SectionLabel>
                              <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-lg divide-y divide-[#E8E0CC]">
                                {[
                                  { label: 'Gross Salary', value: `₹${b.gross.toLocaleString('en-IN')}`, bold: false },
                                  { label: 'Total Deductions', value: `− ₹${(b.epf + b.esic + b.profTax).toLocaleString('en-IN')}`, bold: false, muted: true },
                                  { label: 'Net Take-Home', value: `₹${b.netHome.toLocaleString('en-IN')}`, bold: true },
                                ].map((row) => (
                                  <div key={row.label} className="px-3 py-2.5 flex justify-between items-center">
                                    <span className={`text-xs font-sans ${row.bold ? 'font-semibold text-stone-900' : 'text-stone-500'}`}>{row.label}</span>
                                    <span className={`text-sm font-sans tabular-nums ${row.bold ? 'font-bold text-emerald-700' : row.muted ? 'text-rose-600' : 'text-stone-700'}`}>
                                      {row.value}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Banking info */}
                              {(emp.bank_account_number || emp.ifsc_code) && (
                                <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-lg px-3 py-2.5 space-y-1">
                                  <SectionLabel>Bank Details</SectionLabel>
                                  <p className="text-xs font-sans text-stone-600 mt-1">
                                    {emp.bank_account_number || '—'}
                                    {emp.ifsc_code && <span className="ml-2 text-stone-400">· {emp.ifsc_code}</span>}
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

              {/* Table footer totals */}
              {filtered.length > 0 && (
                <>
                  <Divider />
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] bg-[#F0EAD9]">
                    <div className="px-4 py-3 text-xs font-semibold text-stone-500 font-sans">
                      {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
                    </div>
                    {[
                      filtered.reduce((s, e) => s + calculateIndianPayrollBreakdown(e.monthly_salary).gross, 0),
                      filtered.reduce((s, e) => s + calculateIndianPayrollBreakdown(e.monthly_salary).epf, 0),
                      filtered.reduce((s, e) => s + calculateIndianPayrollBreakdown(e.monthly_salary).esic, 0),
                      filtered.reduce((s, e) => s + calculateIndianPayrollBreakdown(e.monthly_salary).profTax, 0),
                      filtered.reduce((s, e) => s + calculateIndianPayrollBreakdown(e.monthly_salary).netHome, 0),
                    ].map((val, i) => (
                      <div key={i} className={`px-4 py-3 text-sm font-bold font-sans tabular-nums ${i === 4 ? 'text-emerald-700' : 'text-stone-700'}`}>
                        ₹{val.toLocaleString('en-IN')}
                      </div>
                    ))}
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
              <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl py-20 text-center">
                <Banknote className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-400 font-sans italic">No payroll cycles processed yet.</p>
                <button
                  onClick={() => setActiveView('run')}
                  className="mt-4 text-xs font-sans font-semibold text-stone-600 hover:text-stone-900 underline underline-offset-2 cursor-pointer"
                >
                  Run your first payroll →
                </button>
              </div>
            ) : (
              Object.entries(ledgerByMonth).map(([month, rows]) => {
                const monthGross = rows.reduce((s: number, r: any) => s + Number(r.gross_salary), 0);
                const monthNet = rows.reduce((s: number, r: any) => s + Number(r.net_take_home), 0);

                return (
                  <div key={month} className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl overflow-hidden">
                    {/* Month header */}
                    <div className="px-5 py-4 flex items-center justify-between border-b border-[#E8E0CC] bg-[#F5F0E8]">
                      <div className="flex items-center gap-3">
                        <SectionLabel icon={<FileText className="w-3.5 h-3.5" />}>{month}</SectionLabel>
                        <Badge color="emerald">{rows.length} employees</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-sans">
                        <span className="text-stone-500">Gross <span className="font-semibold text-stone-700 tabular-nums">₹{monthGross.toLocaleString('en-IN')}</span></span>
                        <span className="text-stone-500">Net <span className="font-bold text-emerald-700 tabular-nums">₹{monthNet.toLocaleString('en-IN')}</span></span>
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-[#E8E0CC]">
                      {(rows as any[]).map((row: any) => (
                        <div key={row.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#F0EAD9] transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={row.employee_name} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-stone-900 font-sans truncate">{row.employee_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge>{row.employee_code}</Badge>
                                {row.department && <Badge color="teal">{row.department}</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 shrink-0 text-right">
                            <div>
                              <p className="text-[10px] text-stone-400 font-sans uppercase tracking-wider">Gross</p>
                              <p className="text-sm text-stone-700 font-sans tabular-nums">₹{Number(row.gross_salary).toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-stone-400 font-sans uppercase tracking-wider">Net</p>
                              <p className="text-sm font-bold text-emerald-700 font-sans tabular-nums">₹{Number(row.net_take_home).toLocaleString('en-IN')}</p>
                            </div>
                            <Badge color={row.status === 'paid' ? 'emerald' : 'amber'}>
                              {row.status}
                            </Badge>
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
    </div>
  );
}