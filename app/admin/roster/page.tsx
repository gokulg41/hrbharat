"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Search,
  Users,
  Calendar,
  Clock,
  Activity,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Download,
  Bell,
  HelpCircle,
  Plus,
  X,
  Zap,
  UserCheck,
  ListPlus,
  Users2,
  FileBarChart,
  UploadCloud,
  MoreVertical,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL ASSUMPTIONS (verify with Gokul)
   ─────────────────────────────────────────────
   - employees.assigned_shift_id is treated as the current shift
     assignment, falling back to employees.shift_id if null (both
     columns exist on `employees`; unclear which is canonical).
   - "Break" duration has no column anywhere in the schema
     (attendance / company_shifts / employees) — rendered as "—".
     No break tracking exists yet.
   - attendance.status is free text with an unknown enum, so badge
     colors are resolved via case-insensitive keyword matching with
     a neutral fallback for unrecognized values.
   - payroll.month is a free-text column with an unconfirmed format;
     monthly payroll sums rows matching a few common current-month
     string shapes, falling back to created_at within the current
     calendar month. Confirm the real format and tighten this.
   - "Scheduled Today" = employees with a resolved shift assignment
     (not date-specific, since no per-date roster table exists).
───────────────────────────────────────────── */

type Employee = {
  id: string;
  employee_code: string | null;
  full_name: string;
  department: string;
  designation: string;
  monthly_salary: number;
  status: string | null;
  assigned_shift_id: string | null;
  shift_id: string | null;
  manager_id: string | null;
};

type Shift = {
  id: string;
  shift_name: string;
  start_time: string; // HH:MM:SS
  end_time: string;
  grace_period_minutes: number;
};

type AttendanceRow = {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  shift_id: string | null;
  is_late: boolean | null;
  minutes_late: number | null;
};

type Branch = { id: string; branch_name: string };

/* ─────────────────────────────────────────────
   Formatting helpers
───────────────────────────────────────────── */
function formatINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatShiftTime(t: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function statusStyle(raw: string | null) {
  const s = (raw || '').toLowerCase();
  if (s.includes('present') || s === 'on time') return { label: 'Present', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  if (s.includes('half')) return { label: 'Half Day', color: 'bg-amber-50 text-amber-700 border-amber-100' };
  if (s.includes('late')) return { label: 'Late', color: 'bg-orange-50 text-orange-700 border-orange-100' };
  if (s.includes('absent')) return { label: 'Absent', color: 'bg-rose-50 text-rose-700 border-rose-100' };
  if (s.includes('leave')) return { label: 'On Leave', color: 'bg-blue-50 text-blue-700 border-blue-100' };
  if (!raw) return { label: 'Scheduled', color: 'bg-slate-50 text-slate-600 border-slate-200' };
  return { label: raw.charAt(0).toUpperCase() + raw.slice(1), color: 'bg-slate-50 text-slate-600 border-slate-200' };
}

/* ─────────────────────────────────────────────
   Small shared UI atoms (mirrors Employees page style)
───────────────────────────────────────────── */
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hues = [210, 160, 340, 30, 280, 195];
  const hue = hues[(name || '').charCodeAt(0) % hues.length];
  const sizes = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-[12px]' };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 font-sans ${sizes[size]}`}
      style={{ background: `hsl(${hue} 55% 88%)`, color: `hsl(${hue} 50% 35%)` }}
    >
      {initials}
    </span>
  );
}

function MetricCard({ icon, iconBg, label, value, sub }: { icon: React.ReactNode; iconBg: string; label: string; value: string; sub: string }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl px-5 py-4 flex items-center gap-3.5 shadow-card">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans truncate">{label}</p>
        <p className="text-xl font-bold text-ink-900 font-sans leading-tight">{value}</p>
        <p className="text-[10px] text-ink-400 font-sans mt-0.5">{sub}</p>
      </div>
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

/* ─────────────────────────────────────────────
   Donut chart (pure SVG, no chart lib dependency)
───────────────────────────────────────────── */
function ShiftDonut({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  const size = 140, stroke = 18, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative w-[140px] h-[140px] mx-auto">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
        {total > 0 && segments.map((seg) => {
          const frac = seg.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={seg.label}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-ink-900 font-sans leading-none">{total}</span>
        <span className="text-[10px] text-ink-400 font-sans mt-0.5">Total</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Create / Manage Shift modal — writes to company_shifts
───────────────────────────────────────────── */
function ShiftManagerModal({
  companyId, shifts, onClose, onChanged,
}: { companyId: string; shifts: Shift[]; onClose: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<'list' | 'new'>(shifts.length === 0 ? 'new' : 'list');
  const [form, setForm] = useState({ shift_name: '', start_time: '09:00', end_time: '18:00', grace_period_minutes: '15' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shift_name.trim()) { setError('Shift name is required.'); return; }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('company_shifts').insert({
      company_id: companyId,
      shift_name: form.shift_name.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
      grace_period_minutes: Number(form.grace_period_minutes) || 0,
    });
    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setForm({ shift_name: '', start_time: '09:00', end_time: '18:00', grace_period_minutes: '15' });
    onChanged();
    setTab('list');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900 font-sans">Shifts</p>
            <p className="text-[10px] text-ink-400 font-sans">Create and manage shift definitions</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 pt-3 flex gap-4 border-b border-[var(--border-subtle)]">
          {(['list', 'new'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2.5 text-xs font-semibold font-sans border-b-2 transition-colors ${tab === t ? 'border-brand text-brand' : 'border-transparent text-ink-400 hover:text-ink-600'}`}
            >
              {t === 'list' ? `All Shifts (${shifts.length})` : 'New Shift'}
            </button>
          ))}
        </div>

        {tab === 'list' ? (
          <div className="px-6 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {shifts.length === 0 ? (
              <p className="text-xs text-ink-400 font-sans italic py-6 text-center">No shifts created yet.</p>
            ) : shifts.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--border-subtle)]">
                <div>
                  <p className="text-xs font-semibold text-ink-900 font-sans">{s.shift_name}</p>
                  <p className="text-[10px] text-ink-400 font-sans">{formatShiftTime(s.start_time)} – {formatShiftTime(s.end_time)} · {s.grace_period_minutes}m grace</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">Shift Name</label>
              <input
                value={form.shift_name}
                onChange={(e) => setForm((f) => ({ ...f, shift_name: e.target.value }))}
                placeholder="e.g. General Shift"
                className="w-full text-sm font-sans text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">Start Time</label>
                <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="w-full text-sm font-sans text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">End Time</label>
                <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="w-full text-sm font-sans text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans">Grace Period (minutes)</label>
              <input type="number" value={form.grace_period_minutes} onChange={(e) => setForm((f) => ({ ...f, grace_period_minutes: e.target.value }))}
                className="w-full text-sm font-sans text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand" />
            </div>
            {error && <div className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg font-sans">{error}</div>}
            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold font-sans bg-brand hover:bg-brand-hover text-white rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Shift'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Bulk Assign modal — writes employees.assigned_shift_id
───────────────────────────────────────────── */
function BulkAssignModal({
  employeeIds, shifts, onClose, onAssigned,
}: { employeeIds: string[]; shifts: Shift[]; onClose: () => void; onAssigned: (shiftId: string) => void }) {
  const [shiftId, setShiftId] = useState(shifts[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!shiftId) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from('employees').update({ assigned_shift_id: shiftId }).in('id', employeeIds);
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    onAssigned(shiftId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-900 font-sans">Bulk Assign Shift</p>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-ink-600 font-sans">Assign a shift to {employeeIds.length} selected employee{employeeIds.length === 1 ? '' : 's'}.</p>
          {shifts.length === 0 ? (
            <p className="text-xs text-ink-400 font-sans italic">No shifts exist yet — create one first.</p>
          ) : (
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}
              className="w-full text-sm font-sans text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand">
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}
            </select>
          )}
          {error && <div className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg font-sans">{error}</div>}
          <button onClick={handleAssign} disabled={saving || shifts.length === 0}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold font-sans bg-brand hover:bg-brand-hover text-white rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Assigning…' : 'Assign Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function TeamSchedulePage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState('Administrator');
  const [companyId, setCompanyId] = useState<string>('');
  const [profileId, setProfileId] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [monthlyPayroll, setMonthlyPayroll] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly' | 'chart'>('daily');
  const [dept, setDept] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [lockedNote, setLockedNote] = useState<string | null>(null);

  const dateStr = toDateStr(selectedDate);
  const isToday = dateStr === toDateStr(new Date());

  const loadShiftsAndPayroll = useCallback(async (cId: string) => {
    const { data: shiftData } = await supabase.from('company_shifts').select('id, shift_name, start_time, end_time, grace_period_minutes').eq('company_id', cId);
    setShifts(shiftData || []);

    const { data: branchData } = await supabase.from('branches').select('id, branch_name').eq('company_id', cId);
    setBranches(branchData || []);

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const { data: payrollData } = await supabase.from('payroll').select('gross_salary, month, created_at').eq('company_id', cId);
    const total = (payrollData || [])
      .filter((p: any) => p.month === ym || p.month === monthName || (p.created_at && p.created_at.startsWith(ym)))
      .reduce((sum: number, p: any) => sum + Number(p.gross_salary || 0), 0);
    setMonthlyPayroll(total);
  }, []);

  const loadAttendance = useCallback(async (cId: string, date: string) => {
    const { data } = await supabase.from('attendance')
      .select('id, employee_id, date, check_in, check_out, status, shift_id, is_late, minutes_late')
      .eq('company_id', cId)
      .eq('date', date);
    setAttendance(data || []);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('company_id, role, id, full_name').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/login'); return; }

      if (profile.full_name) setAdminName(profile.full_name.split(' ')[0]);
      setProfileId(profile.id);
      setCompanyId(profile.company_id);

      const { data: empCheck } = await supabase.from('employees').select('id, manager_id').eq('auth_user_id', user.id).single();
      const owner = !empCheck;
      setIsOwner(owner);

      const empQuery = supabase.from('employees')
        .select('id, employee_code, full_name, department, designation, monthly_salary, status, assigned_shift_id, shift_id, manager_id')
        .eq('company_id', profile.company_id);
      if (!owner) empQuery.eq('manager_id', profile.id);
      const { data: empData } = await empQuery.order('full_name');
      setEmployees(empData || []);

      await Promise.all([loadShiftsAndPayroll(profile.company_id), loadAttendance(profile.company_id, toDateStr(new Date()))]);
      setLoading(false);
    }
    load();
  }, [router, loadShiftsAndPayroll, loadAttendance]);

  useEffect(() => {
    if (companyId) loadAttendance(companyId, dateStr);
  }, [dateStr, companyId, loadAttendance]);

  const shiftById = useMemo(() => Object.fromEntries(shifts.map((s) => [s.id, s])), [shifts]);
  const attendanceByEmp = useMemo(() => Object.fromEntries(attendance.map((a) => [a.employee_id, a])), [attendance]);

  const rows = useMemo(() => {
    return employees.map((emp) => {
      const att = attendanceByEmp[emp.id];
      const resolvedShiftId = att?.shift_id || emp.assigned_shift_id || emp.shift_id || null;
      const shift = resolvedShiftId ? shiftById[resolvedShiftId] : null;
      return { emp, att, shift };
    });
  }, [employees, attendanceByEmp, shiftById]);

  const departments = useMemo(() => ['All', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))], [employees]);

  const filtered = useMemo(() => {
    return rows.filter(({ emp, shift }) => {
      if (dept !== 'All' && emp.department !== dept) return false;
      if (shiftFilter !== 'All' && shift?.id !== shiftFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!emp.full_name.toLowerCase().includes(q) && !(emp.employee_code || '').toLowerCase().includes(q) && !emp.department.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, dept, shiftFilter, search]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  /* ── Metrics ── */
  const totalEmployees = employees.length;
  const scheduledToday = rows.filter((r) => r.shift).length;
  const onShiftNow = attendance.filter((a) => a.check_in && !a.check_out).length;
  const presentCount = attendance.filter((a) => statusStyle(a.status).label === 'Present' || statusStyle(a.status).label === 'Late').length;
  const attendancePct = scheduledToday > 0 ? ((presentCount / scheduledToday) * 100).toFixed(1) : '0.0';

  /* ── Shift summary donut ── */
  const donutColors = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B'];
  const shiftCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { if (r.shift) counts[r.shift.shift_name] = (counts[r.shift.shift_name] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries.map(([label, value], i) => ({ label, value, color: donutColors[i % donutColors.length] }));
  }, [rows]);
  const shiftTotal = shiftCounts.reduce((s, x) => s + x.value, 0);

  const upcomingShifts = useMemo(() => {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return shifts
      .map((s) => {
        const [h, m] = s.start_time.split(':').map(Number);
        const startMinutes = h * 60 + m;
        const count = rows.filter((r) => r.shift?.id === s.id).length;
        return { s, startMinutes, count };
      })
      .filter((x) => !isToday || x.startMinutes >= nowMinutes)
      .sort((a, b) => a.startMinutes - b.startMinutes)
      .slice(0, 4);
  }, [shifts, rows, isToday]);

  const toggleSelect = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === paged.length ? [] : paged.map((r) => r.emp.id));

  const exportCsv = () => {
    const header = ['Employee', 'Code', 'Department', 'Shift', 'Check-in', 'Check-out', 'Status'];
    const lines = filtered.map(({ emp, att, shift }) => [
      emp.full_name, emp.employee_code || '', emp.department, shift?.shift_name || '',
      formatTime(att?.check_in || null) || '', formatTime(att?.check_out || null) || '', statusStyle(att?.status || null).label,
    ]);
    const csv = [header, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `team-schedule-${dateStr}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const initials = adminName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-[var(--surface-card-hover)] rounded-lg animate-pulse" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-[var(--surface-card-hover)] rounded-xl animate-pulse" />)}
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
          <p className="text-xs text-ink-400 font-sans mt-0.5">Attendance &amp; Shifts <ChevronRight className="w-3 h-3 inline -mt-0.5" /> Team Schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search employees, shifts, attendance…"
              className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400"
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

      {/* ── Page header ── */}
      <div className="px-6 lg:px-8 pt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 font-sans">Team Schedule</h2>
          <p className="text-sm text-ink-400 font-sans mt-0.5">Manage shifts, schedules and attendance for your team.</p>
        </div>
        <button
          onClick={() => setShowShiftModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold font-sans rounded-lg transition-colors shadow-sm border border-[#2563EB] cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Shift
        </button>
      </div>

      {/* ── Metric cards ── */}
      <div className="px-6 lg:px-8 pt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard icon={<Users className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" label="Total Employees" value={String(totalEmployees)} sub="Across organization" />
        <MetricCard icon={<Calendar className="w-5 h-5 text-emerald-600" />} iconBg="bg-emerald-50" label="Scheduled Today" value={String(scheduledToday)} sub="Employees" />
        <MetricCard icon={<Clock className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50" label="On Shift Now" value={String(onShiftNow)} sub="Active" />
        <MetricCard icon={<Activity className="w-5 h-5 text-violet-600" />} iconBg="bg-violet-50" label="Attendance Today" value={`${attendancePct}%`} sub="Average" />
        <MetricCard icon={<Wallet className="w-5 h-5 text-teal-600" />} iconBg="bg-teal-50" label="Monthly Payroll" value={formatINR(monthlyPayroll)} sub="Gross payroll" />
      </div>

      {/* ── Body: table + right rail ── */}
      <div className="px-6 lg:px-8 py-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="min-w-0 space-y-4">

          {/* View tabs */}
          <div className="flex items-center gap-5 border-b border-[var(--border-subtle)]">
            {([
              ['daily', 'Daily View'], ['weekly', 'Weekly View'], ['monthly', 'Monthly View'], ['chart', 'Shift Chart'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => (key === 'daily' ? setView(key) : setLockedNote(label))}
                className={`pb-2.5 text-sm font-sans font-medium border-b-2 transition-colors ${view === key ? 'border-brand text-brand font-semibold' : 'border-transparent text-ink-400 hover:text-ink-600'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-ink-400" />
              <span className="text-xs font-sans text-ink-900 px-1 whitespace-nowrap">
                {selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' })}
              </span>
              <button onClick={() => setSelectedDate((d) => new Date(d.getTime() - 86400000))} className="p-0.5 text-ink-400 hover:text-ink-900"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button onClick={() => setSelectedDate((d) => new Date(d.getTime() + 86400000))} className="p-0.5 text-ink-400 hover:text-ink-900"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>

            <select value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }}
              className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 focus:outline-none">
              {departments.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
            </select>

            <select value={shiftFilter} onChange={(e) => { setShiftFilter(e.target.value); setPage(1); }}
              className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 focus:outline-none">
              <option value="All">All Shifts</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}
            </select>

            <button onClick={() => setLockedNote('Location filter')} className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 flex items-center gap-1">
              All Locations <ChevronDown className="w-3 h-3" />
            </button>
            <button onClick={() => setLockedNote('More filters')} className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filters
            </button>

            <button onClick={exportCsv} className="ml-auto text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600 flex items-center gap-1.5 hover:bg-[var(--surface-card-hover)]">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          {/* Table */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900 font-sans">Employee Schedule ({filtered.length})</p>
              {selectedIds.length > 0 && (
                <button onClick={() => setShowBulkAssign(true)} className="text-xs font-sans font-semibold text-brand hover:text-brand-hover">
                  Assign shift to {selectedIds.length} selected
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center px-6">
                <Calendar className="w-8 h-8 text-ink-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-ink-900 font-sans">No schedules yet</p>
                <p className="text-xs text-ink-400 font-sans mt-1 max-w-xs mx-auto">
                  Create shifts and assign employees to start managing your team&apos;s schedule.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button onClick={() => setShowShiftModal(true)} className="px-3.5 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold font-sans rounded-lg">Create Shift</button>
                  <button onClick={() => router.push('/admin')} className="px-3.5 py-2 border border-[var(--border-subtle)] text-ink-600 text-xs font-semibold font-sans rounded-lg hover:bg-[var(--surface-card-hover)]">Go to Employees</button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-ink-400 font-sans border-b border-[var(--border-subtle)]">
                      <th className="px-5 py-2.5 w-8"><input type="checkbox" checked={selectedIds.length === paged.length && paged.length > 0} onChange={toggleSelectAll} /></th>
                      <th className="px-2 py-2.5">Employee</th>
                      <th className="px-2 py-2.5">Department</th>
                      <th className="px-2 py-2.5">Shift</th>
                      <th className="px-2 py-2.5">Check-in</th>
                      <th className="px-2 py-2.5">Check-out</th>
                      <th className="px-2 py-2.5">Break</th>
                      <th className="px-2 py-2.5">Status</th>
                      <th className="px-2 py-2.5">Attendance</th>
                      <th className="px-2 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {paged.map(({ emp, att, shift }) => {
                      const st = statusStyle(att?.status || null);
                      const checkInLate = att?.is_late && att?.minutes_late ? `Late ${att.minutes_late}m` : 'On time';
                      return (
                        <tr key={emp.id} className="hover:bg-[var(--surface-canvas)] transition-colors text-sm font-sans">
                          <td className="px-5 py-3"><input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleSelect(emp.id)} /></td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={emp.full_name} size="sm" />
                              <div>
                                <p className="font-semibold text-ink-900 leading-tight">{emp.full_name}</p>
                                <p className="text-[10px] text-ink-400">{emp.employee_code || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-ink-600">{emp.department || '—'}</td>
                          <td className="px-2 py-3">
                            {shift ? (
                              <div>
                                <p className="text-ink-900">{shift.shift_name}</p>
                                <p className="text-[10px] text-ink-400">{formatShiftTime(shift.start_time)} – {formatShiftTime(shift.end_time)}</p>
                              </div>
                            ) : <span className="text-ink-400 italic text-xs">Unassigned</span>}
                          </td>
                          <td className="px-2 py-3">
                            {att?.check_in ? (
                              <div>
                                <p className="text-ink-900">{formatTime(att.check_in)}</p>
                                <p className={`text-[10px] ${att.is_late ? 'text-orange-500' : 'text-emerald-600'}`}>{checkInLate}</p>
                              </div>
                            ) : <span className="text-rose-500 text-xs">Absent</span>}
                          </td>
                          <td className="px-2 py-3">
                            {att?.check_out ? (
                              <div>
                                <p className="text-ink-900">{formatTime(att.check_out)}</p>
                                <p className="text-[10px] text-emerald-600">On time</p>
                              </div>
                            ) : <span className="text-ink-400 text-xs">—</span>}
                          </td>
                          <td className="px-2 py-3 text-ink-400 text-xs">—</td>
                          <td className="px-2 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border font-sans ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-2 py-3 text-ink-600">{att ? (st.label === 'Present' ? '100%' : st.label === 'Absent' ? '0%' : '—') : '—'}</td>
                          <td className="px-2 py-3">
                            <button onClick={() => setLockedNote('Row actions')} className="text-ink-400 hover:text-ink-900"><MoreVertical className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-ink-400">
                <span>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} schedules</span>
                <div className="flex items-center gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <span className="text-ink-900 font-semibold">{page}</span> / {totalPages}
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right rail ── */}
        <div className="space-y-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink-900 font-sans">Shift Summary</p>
            </div>
            {shiftTotal === 0 ? (
              <p className="text-xs text-ink-400 font-sans italic text-center py-6">No shifts assigned yet.</p>
            ) : (
              <>
                <ShiftDonut segments={shiftCounts} total={shiftTotal} />
                <div className="mt-4 space-y-1.5">
                  {shiftCounts.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-xs font-sans">
                      <span className="flex items-center gap-1.5 text-ink-600"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                      <span className="text-ink-900 font-medium">{s.value} ({((s.value / shiftTotal) * 100).toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Upcoming Shifts</p>
            {upcomingShifts.length === 0 ? (
              <p className="text-xs text-ink-400 font-sans italic">Nothing scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map(({ s, count }) => (
                  <div key={s.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Clock className="w-3.5 h-3.5 text-blue-600" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-900 font-sans truncate">{s.shift_name}</p>
                      <p className="text-[10px] text-ink-400 font-sans">{formatShiftTime(s.start_time)} – {formatShiftTime(s.end_time)}</p>
                    </div>
                    <span className="text-xs font-semibold text-ink-600 font-sans">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <p className="text-sm font-semibold text-ink-900 font-sans mb-3">Quick Actions</p>
            <div className="space-y-0.5">
              {[
                { label: 'Create Shift', icon: ListPlus, action: () => setShowShiftModal(true) },
                { label: 'Manage Shifts', icon: Users2, action: () => setShowShiftModal(true) },
                { label: 'Bulk Assign', icon: UserCheck, action: () => (selectedIds.length > 0 ? setShowBulkAssign(true) : setLockedNote('Select employees in the table first')) },
                { label: 'Attendance Report', icon: FileBarChart, action: () => setLockedNote('Attendance Report') },
                { label: 'Import from Excel', icon: UploadCloud, action: () => setLockedNote('Import from Excel') },
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

      {showShiftModal && companyId && (
        <ShiftManagerModal
          companyId={companyId}
          shifts={shifts}
          onClose={() => setShowShiftModal(false)}
          onChanged={() => loadShiftsAndPayroll(companyId)}
        />
      )}

      {showBulkAssign && (
        <BulkAssignModal
          employeeIds={selectedIds}
          shifts={shifts}
          onClose={() => setShowBulkAssign(false)}
          onAssigned={(shiftId) => {
            setEmployees((prev) => prev.map((e) => (selectedIds.includes(e.id) ? { ...e, assigned_shift_id: shiftId } : e)));
            setSelectedIds([]);
          }}
        />
      )}

      {lockedNote && <LockedFeatureNote title={lockedNote} onClose={() => setLockedNote(null)} />}
    </div>
  );
}