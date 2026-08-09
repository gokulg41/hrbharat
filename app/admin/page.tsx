"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { onboardEmployeeAction, updateCompanyGeofenceAction, createCompanyShiftAction, assignEmployeeShiftAction } from '@/lib/actions';
import AdminTabsView from './tabs-view';

import {
  UserPlus,
  TrendingUp,
  PieChart,
  Sliders,
  MapPin,
  X,
  ShieldAlert,
  Building2,
  Cpu,
  Users,
  Settings,
  Activity,
  Briefcase,
  DollarSign,
  Calendar,
  Layers,
  Search,
  Lock,
  RefreshCw,
  Terminal,
  ChevronRight,
  Circle,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Design tokens
───────────────────────────────────────────── */
const C = {
  bg: 'var(--surface-canvas)',
  surface: 'var(--surface-card)',
  surfaceHover: 'var(--surface-card-hover)',
  border: 'var(--border-subtle)',
  borderLight: 'var(--border-subtle)',
  text: 'var(--ink-900)',
  muted: 'var(--ink-600)',
  faint: 'var(--ink-400)',
  input: 'var(--surface-card)',
};

/* ─────────────────────────────────────────────
   Tiny helpers
───────────────────────────────────────────── */
function Avatar({ name }: { name: string }) {
  const initials = (name || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hues = [210, 160, 340, 30, 280, 195];
  const hue = hues[(name || '').charCodeAt(0) % hues.length];
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-semibold shrink-0"
      style={{ background: `hsl(${hue} 55% 88%)`, color: `hsl(${hue} 50% 35%)` }}
    >
      {initials}
    </span>
  );
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    gray: 'bg-surface-card-hover text-ink-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-700',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400 font-sans mb-3">
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      {children}
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-600 font-sans mb-1">
      {children}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full text-sm font-sans text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400 ${props.className ?? ''}`}
    />
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[var(--border-subtle)]" />;
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function PremiumAdminUnifiedDashboard() {
  const [currentSection, setCurrentSection] = useState<'ops' | 'security' | 'logs'>('ops');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [empCodeInput, setEmpCodeInput] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [geoLat, setGeoLat] = useState('28.613939');
  const [geoLng, setGeoLng] = useState('77.209021');
  const [geoRadius, setGeoRadius] = useState('100');
  const [allowedIpInput, setAllowedIpInput] = useState('');
  const [updatingGeo, setUpdatingGeo] = useState(false);

  const [shifts, setShifts] = useState<any[]>([]);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('18:00');
  const [newShiftGrace, setNewShiftGrace] = useState('15');
  const [buildingShift, setBuildingShift] = useState(false);

  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [dailyTaskLogs, setDailyTaskLogs] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'roster' | 'leaves' | 'advances' | 'tasks' | 'compliance' | 'payroll' | 'logs'>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Enterprise Workspace');
  const [adminFirstName, setAdminFirstName] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editIfscCode, setEditIfscCode] = useState('');

  const handleUpdateWorkflowStatus = async (table: string, id: string, status: string) => {
    try {
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) throw error;
      if (companyId) await refreshOperationalData(companyId);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const refreshOperationalData = async (targetCompanyId: string) => {
    try {
      const [employeesRes, leavesRes, advancesRes, attendanceRes, tasksRes, shiftsRes, regularizationsRes, logsRes] = await Promise.all([
        supabase.from('employees').select('*, company_shifts(*)').eq('company_id', targetCompanyId).order('created_at', { ascending: false }),
        supabase.from('leave_requests').select('*').eq('company_id', targetCompanyId).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('advance_salary_requests').select('*').eq('company_id', targetCompanyId).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('company_id', targetCompanyId).order('created_at', { ascending: false }),
        supabase.from('daily_tasks').select('*').eq('company_id', targetCompanyId).order('created_at', { ascending: false }),
        supabase.from('company_shifts').select('*').eq('company_id', targetCompanyId).order('created_at', { ascending: false }),
        supabase.from('attendance_regularizations').select('*').eq('company_id', targetCompanyId).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('system_audit_logs').select('*').eq('company_id', targetCompanyId).order('created_at', { ascending: false }),
      ]);
      if (employeesRes.data) setEmployees(employeesRes.data);
      if (leavesRes.data) setLeaveRequests(leavesRes.data);
      if (advancesRes.data) setAdvanceRequests(advancesRes.data);
      if (attendanceRes.data) setTodayAttendance(attendanceRes.data);
      if (tasksRes.data) setDailyTaskLogs(tasksRes.data);
      if (shiftsRes.data) setShifts(shiftsRes.data);
      if (regularizationsRes.data) setRegularizations(regularizationsRes.data);
      if (logsRes.data) setSystemLogs(logsRes.data);
    } catch (err) {
      console.error('Dashboard sync failure:', err);
    }
  };

  useEffect(() => {
    async function loadAdminWorkspace() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_id, full_name').eq('id', user.id).single();
      if (profile?.full_name) setAdminFirstName(profile.full_name.split(' ')[0]);
      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        const { data: comp } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
        if (comp?.name) setCompanyName(comp.name);
        const { data: geoSettings } = await supabase.from('company_settings').select('*').eq('company_id', profile.company_id).single();
        if (geoSettings) {
          setGeoLat(geoSettings.latitude.toString());
          setGeoLng(geoSettings.longitude.toString());
          setGeoRadius(geoSettings.radius_meters.toString());
          if (geoSettings.allowed_ip) setAllowedIpInput(geoSettings.allowed_ip);
        }
        await refreshOperationalData(profile.company_id);
      }
      setLoading(false);
    }
    loadAdminWorkspace();
  }, []);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true);
    setStatusMessage(null);
    const payload = {
      companyId: String(companyId),
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      designation: designation.trim() || 'Staff',
      department: department.trim() || 'Operations',
      monthlySalary: Number(monthlySalary) || 0,
      employeeCode: empCodeInput.toUpperCase().trim(),
      bankAccount: bankAccount.trim(),
      ifscCode: ifscCode.toUpperCase().trim(),
      joiningDate,
    };
    try {
      const res = await onboardEmployeeAction(payload);
      if (res?.success) {
        setStatusMessage({ type: 'success', text: `Employee added. Temp password: ${res.tempPassword}` });
        await refreshOperationalData(companyId);
        setFullName(''); setEmail(''); setPhone(''); setDesignation(''); setDepartment('');
        setMonthlySalary(''); setEmpCodeInput(''); setBankAccount(''); setIfscCode('');
      } else {
        setStatusMessage({ type: 'error', text: res?.error ?? 'Failed to add employee.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error during submission.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newShiftName) return;
    setBuildingShift(true);
    const res = await createCompanyShiftAction({ companyId, shiftName: newShiftName, startTime: newShiftStart, endTime: newShiftEnd, gracePeriod: parseInt(newShiftGrace) || 0 });
    if (res.success) { setNewShiftName(''); await refreshOperationalData(companyId); }
    setBuildingShift(false);
  };

  const handleAllocateShiftMapping = async (employeeId: string, shiftId: string) => {
    if (!companyId) return;
    const res = await assignEmployeeShiftAction(employeeId, shiftId === 'NONE' ? null : shiftId);
    if (res.success) await refreshOperationalData(companyId);
  };

  const handleUpdateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setUpdatingGeo(true);
    const res = await updateCompanyGeofenceAction({ companyId, latitude: parseFloat(geoLat) || 0, longitude: parseFloat(geoLng) || 0, radiusMeters: parseInt(geoRadius) || 100, allowedIp: allowedIpInput });
    if (res.success) setStatusMessage({ type: 'success', text: 'Geofence updated successfully.' });
    setUpdatingGeo(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !editingEmployee) return;
    const { error } = await supabase.from('employees').update({
      full_name: editName.trim(),
      designation: editDesignation.trim() || null,
      department: editDepartment.trim() || 'Operations',
      monthly_salary: editSalary ? parseInt(editSalary) : 0,
      bank_account_number: editBankAccount.trim() || null,
      ifsc_code: editIfscCode.toUpperCase().trim() || null,
    }).eq('id', editingEmployee.id);
    if (!error) { setEditingEmployee(null); await refreshOperationalData(companyId); }
  };

  const startEditing = (emp: any) => {
    setEditingEmployee(emp);
    setEditName(emp.full_name);
    setEditDesignation(emp.designation || '');
    setEditDepartment(emp.department || '');
    setEditSalary(emp.monthly_salary || '');
    setEditBankAccount(emp.bank_account_number || '');
    setEditIfscCode(emp.ifsc_code || '');
  };

  const totalPayrollLiability = employees.reduce((sum, emp) => sum + (Number(emp.monthly_salary) || 0), 0);
  const deptCounts = employees.reduce((acc: any, emp) => { acc[emp.department || 'Operations'] = (acc[emp.department || 'Operations'] || 0) + 1; return acc; }, {});
  const currentAttendanceRate = employees.length > 0 ? Math.round((todayAttendance.length / employees.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-canvas)] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-sm bg-surface-card-hover animate-pulse" />
          <p className="text-sm text-ink-400 font-sans">Loading workspace…</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'ops', label: 'Operations', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-3.5 h-3.5" /> },
    { id: 'logs', label: 'Logs', icon: <Terminal className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] antialiased">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-[var(--surface-card)]/90 backdrop-blur border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-ink-900 font-sans leading-tight">
              {adminFirstName ? `Welcome back, ${adminFirstName}` : 'Welcome back'}
            </h1>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xs text-ink-400 font-sans mt-0.5">{companyName} · Admin Workspace</p>
        </div>

        {/* Nav tabs */}
        <nav className="flex gap-0.5 bg-[var(--surface-card-hover)] p-1 rounded-lg border border-[var(--border-subtle)]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentSection(item.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-sans font-medium cursor-pointer transition-all ${
                currentSection === item.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Status banner ── */}
      {statusMessage && (
        <div className={`mx-6 mt-4 px-4 py-3 rounded-lg border text-xs font-sans flex items-center gap-3 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="p-0.5 rounded hover:bg-black/5 cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">

        {/* ═══════════════════════════════
            SECTION: OPERATIONS
        ═══════════════════════════════ */}
        {currentSection === 'ops' && (
          <div className="space-y-6">

            {/* Metric strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Active Roster',
                  value: String(employees.length),
                  icon: <Users className="w-4 h-4" />,
                  iconBg: 'bg-teal-50',
                  iconColor: 'text-teal-700',
                  sub: employees.length === 0 ? 'No hires yet' : `${employees.length} on payroll`,
                },
                {
                  label: 'Monthly Payroll',
                  value: `₹${totalPayrollLiability.toLocaleString('en-IN')}`,
                  icon: <DollarSign className="w-4 h-4" />,
                  iconBg: 'bg-emerald-50',
                  iconColor: 'text-emerald-700',
                  sub: totalPayrollLiability === 0 ? 'Runs after roster is set' : 'Current cycle',
                },
                {
                  label: 'Pending Reviews',
                  value: String(leaveRequests.length + advanceRequests.length + regularizations.length),
                  icon: <Briefcase className="w-4 h-4" />,
                  iconBg: 'bg-amber-50',
                  iconColor: 'text-amber-700',
                  sub: leaveRequests.length + advanceRequests.length + regularizations.length > 0 ? 'Needs attention' : 'All caught up',
                },
                {
                  label: 'Attendance Rate',
                  value: employees.length === 0 ? '—' : `${currentAttendanceRate}%`,
                  icon: <Activity className="w-4 h-4" />,
                  iconBg: 'bg-brand-subtle',
                  iconColor: 'text-brand',
                  sub: employees.length === 0 ? 'Needs first check-in' : `${todayAttendance.length} present today`,
                },
              ].map((m) => (
                <div key={m.label} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl px-5 py-4 flex flex-col gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${m.iconBg} ${m.iconColor}`}>
                    {m.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-400 block mb-1">{m.label}</span>
                    <span className="text-2xl font-bold text-ink-900 font-sans tabular-nums leading-none block">{m.value}</span>
                    <span className="text-[11px] text-ink-400 font-sans block mt-1.5">{m.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main grid: onboarding form + tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Onboard form */}
              <Card className="lg:col-span-4">
                <div className="px-5 pt-5 pb-4">
                  <SectionLabel icon={<UserPlus className="w-3.5 h-3.5" />}>Onboard Employee</SectionLabel>
                  <p className="text-xs text-ink-600 font-sans -mt-1 mb-4">Add a new member to your workspace.</p>

                  <form onSubmit={handleOnboardSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div><FormLabel required>Emp Code</FormLabel><Input required value={empCodeInput} onChange={e => setEmpCodeInput(e.target.value)} placeholder="HRB-102" /></div>
                      <div><FormLabel required>Full Name</FormLabel><Input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Liam Sterling" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><FormLabel required>Email</FormLabel><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@co.com" /></div>
                      <div><FormLabel>Phone</FormLabel><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><FormLabel>Designation</FormLabel><Input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Engineer" /></div>
                      <div><FormLabel>Department</FormLabel><Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Engineering" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><FormLabel required>Joining Date</FormLabel><Input type="date" required value={joiningDate} onChange={e => setJoiningDate(e.target.value)} /></div>
                      <div><FormLabel>Gross Salary</FormLabel><Input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="₹ Monthly" /></div>
                    </div>

                    {/* Banking */}
                    <div className="bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] rounded-lg p-3 space-y-2">
                      <SectionLabel>Banking Details</SectionLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="Account No." />
                        <Input value={ifscCode} onChange={e => setIfscCode(e.target.value)} placeholder="IFSC Code" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-sans font-semibold py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Adding employee…' : 'Onboard Employee'}
                    </button>
                  </form>
                </div>
              </Card>

              {/* Tabs panel */}
              <Card className="lg:col-span-8 min-h-[600px] flex flex-col">
                <div className="flex flex-wrap gap-0.5 p-2 border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)]/60">
                  {[
                    { id: 'roster', label: 'Roster' },
                    { id: 'leaves', label: `Leaves (${leaveRequests.length})` },
                    { id: 'advances', label: `Advances (${advanceRequests.length})` },
                    { id: 'tasks', label: 'Tasks' },
                    { id: 'compliance', label: `Corrections (${regularizations.length})` },
                    { id: 'payroll', label: 'Payroll' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`text-[11px] font-sans font-medium px-3.5 py-2 rounded-md cursor-pointer transition-all ${
                        activeTab === t.id
                          ? 'bg-[var(--surface-card)] text-ink-900 border border-[var(--border-subtle)] shadow-sm'
                          : 'text-ink-600 hover:text-ink-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 flex flex-col">
                  <AdminTabsView
                    activeTab={activeTab}
                    employees={employees}
                    leaveRequests={leaveRequests}
                    advanceRequests={advanceRequests}
                    dailyTaskLogs={dailyTaskLogs}
                    regularizations={regularizations}
                    systemLogs={systemLogs}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    startEditing={startEditing}
                    handleUpdateWorkflowStatus={(table, id, status) => handleUpdateWorkflowStatus(table, id, status)}
                    refreshOperationalData={async () => await refreshOperationalData(companyId!)}
                  />
                </div>
              </Card>
            </div>

            {/* Shift management */}
            <Card>
              <div className="px-5 pt-5 pb-2">
                <SectionLabel icon={<Sliders className="w-3.5 h-3.5" />}>Shift Configuration & Assignments</SectionLabel>
                <p className="text-xs text-ink-600 font-sans -mt-1 mb-4">Define shift rules and assign them to individual employees.</p>
              </div>
              <Divider />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5">

                {/* Create shift form */}
                <form onSubmit={handleCreateShift} className="lg:col-span-4 bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] rounded-lg p-4 space-y-3">
                  <SectionLabel>New Shift</SectionLabel>
                  <Input required placeholder="Shift name" value={newShiftName} onChange={e => setNewShiftName(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <div><FormLabel>Start</FormLabel><Input type="time" required value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} /></div>
                    <div><FormLabel>End</FormLabel><Input type="time" required value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} /></div>
                  </div>
                  <div><FormLabel>Grace period (min)</FormLabel><Input type="number" required value={newShiftGrace} onChange={e => setNewShiftGrace(e.target.value)} /></div>
                  <button type="submit" disabled={buildingShift} className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-sans font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                    {buildingShift ? 'Saving…' : 'Save Shift'}
                  </button>
                </form>

                {/* Assign shifts */}
                <div className="lg:col-span-8 max-h-[220px] overflow-y-auto divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg">
                  {employees.length === 0 ? (
                    <p className="p-4 text-center text-xs text-ink-400 font-sans italic">No employees to assign.</p>
                  ) : employees.map((emp) => (
                    <div key={emp.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--surface-card-hover)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={emp.full_name} />
                        <div>
                          <p className="text-sm font-semibold text-ink-900 font-sans leading-snug">{emp.full_name}</p>
                          <p className="text-[11px] text-ink-400 font-sans">{emp.designation || 'Staff'} · {emp.department || 'Operations'}</p>
                        </div>
                      </div>
                      <select
                        defaultValue={emp.assigned_shift_id || 'NONE'}
                        onChange={e => handleAllocateShiftMapping(emp.id, e.target.value)}
                        className="text-xs font-sans text-ink-900 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                      >
                        <option value="NONE">Default policy</option>
                        {shifts.map(s => (
                          <option key={s.id} value={s.id}>{s.shift_name} [{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}]</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════
            SECTION: SECURITY / GEOFENCE
        ═══════════════════════════════ */}
        {currentSection === 'security' && (
          <Card>
            <div className="px-5 pt-5 pb-2">
              <SectionLabel icon={<MapPin className="w-3.5 h-3.5" />}>Geofence & IP Controls</SectionLabel>
              <p className="text-xs text-ink-600 font-sans -mt-1 mb-4">
                Set the spatial radius and network gateway that gate employee check-ins.
              </p>
            </div>
            <Divider />
            <div className="p-5">
              <form onSubmit={handleUpdateGeofence} className="bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] rounded-lg p-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div><FormLabel required>Latitude</FormLabel><Input type="number" step="any" required value={geoLat} onChange={e => setGeoLat(e.target.value)} /></div>
                <div><FormLabel required>Longitude</FormLabel><Input type="number" step="any" required value={geoLng} onChange={e => setGeoLng(e.target.value)} /></div>
                <div><FormLabel required>Radius (m)</FormLabel><Input type="number" required value={geoRadius} onChange={e => setGeoRadius(e.target.value)} /></div>
                <div><FormLabel>Allowed IP</FormLabel><Input value={allowedIpInput} onChange={e => setAllowedIpInput(e.target.value)} placeholder="192.168.1.1" /></div>
                <button type="submit" disabled={updatingGeo} className="h-[38px] w-full bg-brand hover:bg-brand-hover text-white text-xs font-sans font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                  {updatingGeo ? 'Saving…' : 'Save Boundaries'}
                </button>
              </form>
            </div>
          </Card>
        )}

        {/* ═══════════════════════════════
            SECTION: LOGS & TELEMETRY
        ═══════════════════════════════ */}
        {currentSection === 'logs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Attendance rate */}
              <Card>
                <div className="px-5 pt-5 pb-3">
                  <SectionLabel icon={<TrendingUp className="w-3.5 h-3.5" />}>Attendance Rate</SectionLabel>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-3xl font-bold text-ink-900 font-sans tabular-nums">{currentAttendanceRate}%</span>
                    <span className="text-xs text-ink-400 font-sans">{todayAttendance.length} / {employees.length} present</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${currentAttendanceRate}%` }} />
                  </div>
                </div>
                <Divider />
                <div className="grid grid-cols-2 divide-x divide-[var(--border-subtle)]">
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-400 mb-0.5">Total Employees</p>
                    <p className="text-xl font-bold text-ink-900 font-sans">{employees.length}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-400 mb-0.5">Monthly Payroll</p>
                    <p className="text-xl font-bold text-ink-900 font-sans">₹{totalPayrollLiability.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </Card>

              {/* Dept distribution */}
              <Card>
                <div className="px-5 pt-5 pb-3">
                  <SectionLabel icon={<PieChart className="w-3.5 h-3.5" />}>Department Distribution</SectionLabel>
                </div>
                <Divider />
                <div className="p-3 max-h-48 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                  {Object.entries(deptCounts).length === 0 ? (
                    <p className="px-2 py-4 text-xs text-ink-400 font-sans text-center italic">No departments defined yet.</p>
                  ) : Object.entries(deptCounts).map(([dept, count]: any) => (
                    <div key={dept} className="px-3 py-2.5 flex items-center justify-between hover:bg-[var(--surface-card-hover)] transition-colors">
                      <span className="text-sm text-ink-900 font-sans truncate">{dept}</span>
                      <Badge color="gray">{count} people</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Live attendance */}
            <Card>
              <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                <div>
                  <SectionLabel icon={<Cpu className="w-3.5 h-3.5" />}>Live Attendance</SectionLabel>
                </div>
                <Badge color="emerald">Live</Badge>
              </div>
              <Divider />
              {todayAttendance.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-400 font-sans italic">No check-ins recorded yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 p-4 max-h-48 overflow-y-auto">
                  {todayAttendance.map((log) => (
                    <div key={log.id} className="flex items-center justify-between bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={log.employee_name} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink-900 font-sans truncate">{log.employee_name}</p>
                          <p className="text-[10px] text-ink-400 font-sans">{log.employee_code}</p>
                        </div>
                      </div>
                      <Badge color="gray">{log.punch_in_time}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Audit trail */}
            <Card>
              <div className="px-5 pt-5 pb-2">
                <SectionLabel icon={<Layers className="w-3.5 h-3.5" />}>System Audit Trail</SectionLabel>
              </div>
              <Divider />
              {systemLogs.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-400 font-sans italic">No audit events logged yet.</p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
                  {systemLogs.map((log) => (
                    <div key={log.id} className="px-5 py-3 flex flex-col sm:flex-row sm:justify-between gap-1 hover:bg-[var(--surface-card-hover)] transition-colors">
                      <p className="text-sm text-ink-900 font-sans">
                        <span className="font-semibold text-ink-900">[{log.event_type || 'SYSTEM'}]</span>{' '}
                        {log.description}
                      </p>
                      <span className="text-[11px] text-ink-400 font-sans tabular-nums shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

      </main>

      {/* ── Edit employee modal ── */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-brand/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Edit Employee Profile</h3>
              <button onClick={() => setEditingEmployee(null)} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-[var(--surface-card-hover)] transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Divider />
            <form onSubmit={handleSaveEdit} className="px-5 py-4 space-y-3.5">
              <div><FormLabel required>Full Name</FormLabel><Input required value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><FormLabel>Designation</FormLabel><Input value={editDesignation} onChange={e => setEditDesignation(e.target.value)} /></div>
                <div><FormLabel>Department</FormLabel><Input value={editDepartment} onChange={e => setEditDepartment(e.target.value)} /></div>
              </div>
              <div><FormLabel>Monthly Salary (₹)</FormLabel><Input type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)} /></div>
              <div className="bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] rounded-lg p-3 space-y-2">
                <SectionLabel>Banking Details</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editBankAccount} onChange={e => setEditBankAccount(e.target.value)} placeholder="Account No." />
                  <Input value={editIfscCode} onChange={e => setEditIfscCode(e.target.value)} placeholder="IFSC Code" />
                </div>
              </div>
              <button type="submit" className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-sans font-semibold py-2.5 rounded-lg transition-colors cursor-pointer">
                Save Changes
              </button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}