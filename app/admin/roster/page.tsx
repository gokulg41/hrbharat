"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { onboardEmployeeAction } from '@/lib/actions';
import {
  Search,
  Users,
  Building2,
  Mail,
  Phone,
  Key,
  Edit2,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Briefcase,
  UserCheck,
  Copy,
  Check,
  UserPlus,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Helpers (match existing design system)
───────────────────────────────────────────── */
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hues = [210, 160, 340, 30, 280, 195];
  const hue = hues[(name || '').charCodeAt(0) % hues.length];
  const sizes = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-[12px]',
    lg: 'w-11 h-11 text-[14px]',
  };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md font-semibold shrink-0 font-sans ${sizes[size]}`}
      style={{ background: `hsl(${hue} 55% 88%)`, color: `hsl(${hue} 50% 35%)` }}
    >
      {initials}
    </span>
  );
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    gray:    'bg-stone-100 text-stone-500 border-stone-200',
    teal:    'bg-teal-50 text-teal-700 border-teal-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
    rose:    'bg-rose-50 text-rose-600 border-rose-100',
    blue:    'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border font-sans ${map[color]}`}>
      {children}
    </span>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-[#F0EAD9] border border-[#DDD5C0] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 font-sans">{label}</p>
        <p className="text-xl font-bold text-stone-900 font-sans leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-stone-400 font-sans mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* Copy-to-clipboard mini button */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handle}
      className="ml-1 p-0.5 rounded text-stone-300 hover:text-stone-600 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Onboard New Employee Modal
───────────────────────────────────────────── */
function OnboardModal({ onClose, onCreated }: { onClose: () => void; onCreated: (emp: any) => void }) {
  const [form, setForm] = useState({
    full_name: '',
    employee_code: '',
    designation: '',
    department: '',
    monthly_salary: '',
    email: '',
    phone_number: '',
    bank_account_number: '',
    ifsc_code: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(form.full_name || '').trim() || !(form.employee_code || '').trim() || !(form.email || '').trim()) {
      setError('Full name, employee code, and email are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();

      const fullName = (form.full_name || '').trim();
      const employeeCode = (form.employee_code || '').toUpperCase().trim();

      const payload = {
        companyId: profile?.company_id,
        fullName,
        employeeCode,
        designation: (form.designation || '').trim() || 'Employee',
        department: (form.department || '').trim() || 'Operations',
        monthlySalary: form.monthly_salary ? Number(form.monthly_salary) : 0,
        email: (form.email || '').trim(),
        phone: (form.phone_number || '').trim() || '',
        bankAccount: (form.bank_account_number || '').trim() || null,
        ifscCode: (form.ifsc_code || '').trim() || null,
        joiningDate: new Date().toISOString().split('T')[0],
      };
      const res = await onboardEmployeeAction(payload);
      if (res.success) {
        onCreated({
          id: res.employeeId,
          full_name: fullName,
          employee_code: employeeCode,
          designation: payload.designation,
          department: payload.department,
          monthly_salary: payload.monthlySalary,
          email: payload.email,
          phone_number: payload.phone || null,
          bank_account_number: payload.bankAccount,
          ifsc_code: payload.ifscCode,
        });
        onClose();
      } else {
        setError(res.error || 'Failed to onboard employee.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = 'text', required = false) => (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 font-sans">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full text-sm font-sans text-stone-800 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-300"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E0CC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-stone-100" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900 font-sans">Onboard Employee</p>
              <p className="text-[10px] text-stone-400 font-sans">Add a new member to the roster</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-lg font-light">✕</button>
        </div>
        {/* Fields */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {field('Full Name', 'full_name', 'text', true)}
              {field('Employee Code', 'employee_code', 'text', true)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field('Designation', 'designation')}
              {field('Department', 'department')}
            </div>
            {field('Monthly Salary (₹)', 'monthly_salary', 'number')}
            <div className="grid grid-cols-2 gap-3">
              {field('Email', 'email', 'email', true)}
              {field('Phone', 'phone_number')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field('Bank Account', 'bank_account_number')}
              {field('IFSC Code', 'ifsc_code')}
            </div>
            {error && (
              <div className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg font-sans">
                {error}
              </div>
            )}
            <div className="px-3 py-2 bg-amber-50 border border-amber-100 text-amber-700 text-[11px] rounded-lg font-sans">
              Temp password will be <span className="font-semibold">Temp@{(form.employee_code || '').toUpperCase() || '{CODE}'}</span>. Share credentials securely.
            </div>
          </div>
          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E8E0CC] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-sans text-stone-500 hover:text-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold font-sans bg-stone-900 hover:bg-stone-700 text-stone-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {submitting ? 'Adding employee…' : 'Onboard Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Edit Modal
───────────────────────────────────────────── */
function EditModal({ emp, onClose, onSave }: { emp: any; onClose: () => void; onSave: (updated: any) => Promise<void> }) {
  const [form, setForm] = useState({
    full_name: emp.full_name || '',
    designation: emp.designation || '',
    department: emp.department || '',
    monthly_salary: emp.monthly_salary || '',
    email: emp.email || '',
    phone_number: emp.phone_number || '',
    bank_account_number: emp.bank_account_number || '',
    ifsc_code: emp.ifsc_code || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...emp, ...form, monthly_salary: Number(form.monthly_salary) });
    setSaving(false);
    onClose();
  };

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 font-sans">{label}</label>
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full text-sm font-sans text-stone-800 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-300"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-[#E8E0CC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={emp.full_name} />
            <div>
              <p className="text-sm font-semibold text-stone-900 font-sans">{emp.full_name}</p>
              <Badge>{emp.employee_code}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-lg font-light">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {field('Full Name', 'full_name')}
          <div className="grid grid-cols-2 gap-3">
            {field('Designation', 'designation')}
            {field('Department', 'department')}
          </div>
          {field('Monthly Salary (₹)', 'monthly_salary', 'number')}
          <div className="grid grid-cols-2 gap-3">
            {field('Email', 'email', 'email')}
            {field('Phone', 'phone_number')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Bank Account', 'bank_account_number')}
            {field('IFSC Code', 'ifsc_code')}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#E8E0CC] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-sans text-stone-500 hover:text-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold font-sans bg-stone-900 hover:bg-stone-700 text-stone-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function RosterPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'salary'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showOnboard, setShowOnboard] = useState(false);

  /* ── Load ── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('company_id, role').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/login'); return; }

      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('full_name');

      if (data) setEmployees(data);
      setLoading(false);
    }
    load();
  }, [router]);

  /* ── Save edit ── */
  const handleSave = async (updated: any) => {
    const { error } = await supabase
      .from('employees')
      .update({
        full_name: updated.full_name,
        designation: updated.designation,
        department: updated.department,
        monthly_salary: updated.monthly_salary,
        email: updated.email,
        phone_number: updated.phone_number,
        bank_account_number: updated.bank_account_number,
        ifsc_code: updated.ifsc_code,
      })
      .eq('id', updated.id);
    if (!error) setEmployees(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
  };

  /* ── CSV Export ── */
  const handleExport = () => {
    const headers = ['Code', 'Name', 'Designation', 'Department', 'Salary', 'Email', 'Phone', 'Bank Account', 'IFSC'];
    const rows = employees.map(e => [
      e.employee_code, e.full_name, e.designation || '', e.department || '',
      e.monthly_salary || '', e.email || '', e.phone_number || '',
      e.bank_account_number || '', e.ifsc_code || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'roster.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Derived ── */
  const departments = ['All', ...Array.from(new Set(employees.map(e => e.department || 'Unassigned'))).sort()];

  const filtered = employees
    .filter(e => {
      const q = searchQuery.toLowerCase();
      const matchQ = !q ||
        (e.full_name || '').toLowerCase().includes(q) ||
        (e.employee_code || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q);
      const matchDept = selectedDept === 'All' || (e.department || 'Unassigned') === selectedDept;
      return matchQ && matchDept;
    })
    .sort((a, b) => {
      const cmp = sortBy === 'name'
        ? (a.full_name || '').localeCompare(b.full_name || '')
        : (a.monthly_salary || 0) - (b.monthly_salary || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalSalary = employees.reduce((s, e) => s + (Number(e.monthly_salary) || 0), 0);
  const deptCount = new Set(employees.map(e => e.department).filter(Boolean)).size;

  const toggleSort = (col: 'name' | 'salary') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: 'name' | 'salary' }) =>
    sortBy === col
      ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3 opacity-30" />;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center animate-pulse">
            <span className="text-[11px] font-bold text-stone-100 font-sans">HR</span>
          </div>
          <p className="text-xs text-stone-400 font-sans tracking-widest uppercase">Loading roster…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">Employee Roster</h1>
            <p className="text-sm text-stone-500 font-sans mt-0.5">All onboarded employees in your workspace</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowOnboard(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 text-xs font-semibold font-sans text-stone-50 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Onboard Employee
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#DDD5C0] bg-[#FDF8F0] text-xs font-semibold font-sans text-stone-600 hover:bg-[#F0EAD9] hover:text-stone-900 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={<Users className="w-5 h-5 text-stone-500" />}
            label="Total Onboarded"
            value={employees.length.toString()}
            sub="active employees"
          />
          <StatCard
            icon={<Building2 className="w-5 h-5 text-stone-500" />}
            label="Departments"
            value={deptCount.toString()}
            sub="across company"
          />
          <StatCard
            icon={<IndianRupee className="w-5 h-5 text-stone-500" />}
            label="Monthly Payroll"
            value={`₹${totalSalary.toLocaleString('en-IN')}`}
            sub="gross total"
          />
        </div>

        {/* ── Filters ── */}
        <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl px-4 py-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search by name, code, email or department…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm font-sans bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 rounded-lg text-xs font-sans font-medium transition-colors ${
                  selectedDept === dept
                    ? 'bg-stone-900 text-stone-100'
                    : 'bg-[#F0EAD9] text-stone-500 hover:text-stone-800 border border-[#DDD5C0]'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sort bar ── */}
        <div className="flex items-center gap-3 text-[11px] text-stone-400 font-sans px-1">
          <span>Sort by:</span>
          {(['name', 'salary'] as const).map(col => (
            <button
              key={col}
              onClick={() => toggleSort(col)}
              className={`flex items-center gap-1 capitalize transition-colors ${sortBy === col ? 'text-stone-800 font-semibold' : 'hover:text-stone-600'}`}
            >
              {col} <SortIcon col={col} />
            </button>
          ))}
          <span className="ml-auto">{filtered.length} of {employees.length} employees</span>
        </div>

        {/* ── Roster list ── */}
        <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl overflow-hidden divide-y divide-[#E8E0CC]">

          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <UserCheck className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-sm text-stone-400 font-sans italic">
                {searchQuery || selectedDept !== 'All' ? 'No employees match your search.' : 'No employees onboarded yet.'}
              </p>
            </div>
          ) : filtered.map((emp) => {
            const isExpanded = expandedId === emp.id;
            const tempPassword = `Temp@${emp.employee_code}`;

            return (
              <div key={emp.id}>
                {/* ── Main row ── */}
                <div
                  className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-[#F5F0E8] transition-colors cursor-pointer group"
                  onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                >
                  {/* Left: avatar + core info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={emp.full_name} size="md" />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-sm font-semibold text-stone-900 font-sans">{emp.full_name}</span>
                        <Badge>{emp.employee_code}</Badge>
                        {emp.monthly_salary > 0 && (
                          <Badge color="emerald">₹{Number(emp.monthly_salary).toLocaleString('en-IN')}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {emp.designation && <Badge color="teal">{emp.designation}</Badge>}
                        {emp.department && <Badge>{emp.department}</Badge>}
                      </div>
                    </div>
                  </div>

                  {/* Right: contact + edit */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingEmp(emp); }}
                      className="flex items-center gap-1.5 mb-1 px-2.5 py-1 bg-stone-900 hover:bg-stone-700 text-stone-50 text-[10px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-all font-sans"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    {emp.email && (
                      <span className="flex items-center gap-1 text-[11px] text-stone-400 font-sans">
                        <Mail className="w-3 h-3" />{emp.email}
                      </span>
                    )}
                    {emp.phone_number && (
                      <span className="flex items-center gap-1 text-[11px] text-stone-400 font-sans">
                        <Phone className="w-3 h-3" />{emp.phone_number}
                      </span>
                    )}
                    <span className="text-stone-300">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                </div>

                {/* ── Expanded detail panel ── */}
                {isExpanded && (
                  <div className="bg-[#F5F0E8] border-t border-[#E8E0CC] px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-6">

                    {/* Credentials */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400 font-sans">Login Credentials</p>
                      <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-lg px-3 py-2.5 space-y-2">
                        <div>
                          <p className="text-[9px] text-stone-400 font-sans uppercase tracking-wider mb-0.5">Email / Username</p>
                          <div className="flex items-center text-xs text-stone-700 font-sans">
                            <Mail className="w-3 h-3 text-stone-400 mr-1.5 shrink-0" />
                            {emp.email || '—'}
                            {emp.email && <CopyButton text={emp.email} />}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-400 font-sans uppercase tracking-wider mb-0.5">Temp Password</p>
                          <div className="flex items-center text-xs text-stone-700 font-sans font-medium">
                            <Key className="w-3 h-3 text-stone-400 mr-1.5 shrink-0" />
                            {tempPassword}
                            <CopyButton text={tempPassword} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400 font-sans">Role & Department</p>
                      <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-lg px-3 py-2.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-stone-700 font-sans">
                          <Briefcase className="w-3 h-3 text-stone-400 shrink-0" />
                          {emp.designation || <span className="text-stone-300 italic">No designation</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-700 font-sans">
                          <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                          {emp.department || <span className="text-stone-300 italic">No department</span>}
                        </div>
                        {emp.phone_number && (
                          <div className="flex items-center gap-2 text-xs text-stone-700 font-sans">
                            <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                            {emp.phone_number}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bank */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400 font-sans">Bank Details</p>
                      {emp.bank_account_number || emp.ifsc_code ? (
                        <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-lg px-3 py-2.5 space-y-2">
                          <div>
                            <p className="text-[9px] text-stone-400 font-sans uppercase tracking-wider mb-0.5">Account Number</p>
                            <div className="flex items-center text-xs text-stone-700 font-sans font-medium tabular-nums">
                              {emp.bank_account_number || '—'}
                              {emp.bank_account_number && <CopyButton text={emp.bank_account_number} />}
                            </div>
                          </div>
                          {emp.ifsc_code && (
                            <div>
                              <p className="text-[9px] text-stone-400 font-sans uppercase tracking-wider mb-0.5">IFSC Code</p>
                              <div className="flex items-center text-xs text-stone-700 font-sans">
                                {emp.ifsc_code}
                                <CopyButton text={emp.ifsc_code} />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-300 font-sans italic">No bank details on file</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* ── Edit Modal ── */}
      {editingEmp && (
        <EditModal
          emp={editingEmp}
          onClose={() => setEditingEmp(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Onboard Modal ── */}
      {showOnboard && (
        <OnboardModal
          onClose={() => setShowOnboard(false)}
          onCreated={(newEmp) => setEmployees(prev => [...prev, newEmp].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))}
        />
      )}
    </div>
  );
}