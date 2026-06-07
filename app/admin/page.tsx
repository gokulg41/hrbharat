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
  bg: '#F5F0E8',
  surface: '#FDF8F0',
  surfaceHover: '#F0EAD9',
  border: '#DDD5C0',
  borderLight: '#E8E0CC',
  text: '#1C1917',
  muted: '#78716C',
  faint: '#A8A29E',
  input: '#FAF5EB',
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
    gray: 'bg-stone-100 text-stone-500',
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
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400 font-sans mb-3">
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{icon}</span>}
      {children}
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500 font-sans mb-1">
      {children}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full text-sm font-sans text-stone-800 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-300 ${props.className ?? ''}`}
    />
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[#E8E0CC]" />;
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
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
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
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-sm bg-stone-200 animate-pulse" />
          <p className="text-sm text-stone-400 font-sans">Loading workspace…</p>
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
    <div className="min-h-screen bg-[#F5F0E8] font-['Georgia',_serif] antialiased">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-[#FDF8F0]/90 backdrop-blur border-b border-[#DDD5C0] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-stone-100" />
          </div>
          <div>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
              {companyName}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </p>
            <h1 className="text-sm font-semibold text-stone-900 leading-tight">Admin Workspace</h1>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex gap-0.5 bg-[#F0EAD9] p-1 rounded-lg border border-[#DDD5C0]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentSection(item.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-sans font-medium cursor-pointer transition-all ${
                currentSection === item.id
                  ? 'bg-[#FDF8F0] text-stone-900 shadow-sm border border-[#DDD5C0]'
                  : 'text-stone-500 hover:text-stone-800'
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#DDD5C0] rounded-xl overflow-hidden border border-[#DDD5C0]">
              {[
                { label: 'Active Roster', value: String(employees.length), icon: <Users className="w-3.5 h-3.5" />, accent: 'text-teal-600' },
                { label: 'Monthly Payroll', value: `₹${totalPayrollLiability.toLocaleString('en-IN')}`, icon: <DollarSign className="w-3.5 h-3.5" />, accent: 'text-emerald-600' },
                { label: 'Pending Reviews', value: String(leaveRequests.length + advanceRequests.length + regularizations.length), icon: <Briefcase className="w-3.5 h-3.5" />, accent: leaveRequests.length + advanceRequests.length + regularizations.length > 0 ? 'text-amber-600' : 'text-stone-400' },
                { label: 'Attendance Rate', value: `${currentAttendanceRate}%`, icon: <Activity className="w-3.5 h-3.5" />, accent: 'text-stone-500' },
              ].map((m) => (
                <div key={m.label} className="bg-[#FDF8F0] px-5 py-5 flex flex-col gap-2">
                  <div className={`flex items-center gap-1.5 font-sans ${m.accent}`}>
                    {m.icon}
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">{m.label}</span>
                  </div>
                  <span className="text-2xl font-bold text-stone-900 font-sans tabular-nums leading-none">{m.value}</span>
                </div>
              ))}
            </div>

            {/* Main grid: onboarding form + tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Onboard form */}
              <Card className="lg:col-span-4">
                <div className="px-5 pt-5 pb-4">
                  <SectionLabel icon={<UserPlus className="w-3.5 h-3.5" />}>Onboard Employee</SectionLabel>
                  <p className="text-xs text-stone-500 font-sans -mt-1 mb-4">Add a new member to your workspace.</p>

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
                    <div className="bg-[#F0EAD9] border border-[#DDD5C0] rounded-lg p-3 space-y-2">
                      <SectionLabel>Banking Details</SectionLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="Account No." />
                        <Input value={ifscCode} onChange={e => setIfscCode(e.target.value)} placeholder="IFSC Code" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-sans font-semibold py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Adding employee…' : 'Onboard Employee'}
                    </button>
                  </form>
                </div>
              </Card>

              {/* Tabs panel */}
              <Card className="lg:col-span-8 min-h-[600px] flex flex-col">
                <div className="flex flex-wrap gap-0.5 p-2 border-b border-[#E8E0CC] bg-[#F5F0E8]/60">
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
                          ? 'bg-[#FDF8F0] text-stone-900 border border-[#DDD5C0] shadow-sm'
                          : 'text-stone-500 hover:text-stone-800'
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
                <p className="text-xs text-stone-500 font-sans -mt-1 mb-4">Define shift rules and assign them to individual employees.</p>
              </div>
              <Divider />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5">

                {/* Create shift form */}
                <form onSubmit={handleCreateShift} className="lg:col-span-4 bg-[#F0EAD9] border border-[#DDD5C0] rounded-lg p-4 space-y-3">
                  <SectionLabel>New Shift</SectionLabel>
                  <Input required placeholder="Shift name" value={newShiftName} onChange={e => setNewShiftName(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <div><FormLabel>Start</FormLabel><Input type="time" required value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} /></div>
                    <div><FormLabel>End</FormLabel><Input type="time" required value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} /></div>
                  </div>
                  <div><FormLabel>Grace period (min)</FormLabel><Input type="number" required value={newShiftGrace} onChange={e => setNewShiftGrace(e.target.value)} /></div>
                  <button type="submit" disabled={buildingShift} className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-sans font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                    {buildingShift ? 'Saving…' : 'Save Shift'}
                  </button>
                </form>

                {/* Assign shifts */}
                <div className="lg:col-span-8 max-h-[220px] overflow-y-auto divide-y divide-[#E8E0CC] border border-[#DDD5C0] rounded-lg">
                  {employees.length === 0 ? (
                    <p className="p-4 text-center text-xs text-stone-400 font-sans italic">No employees to assign.</p>
                  ) : employees.map((emp) => (
                    <div key={emp.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F0EAD9] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={emp.full_name} />
                        <div>
                          <p className="text-sm font-semibold text-stone-900 font-sans leading-snug">{emp.full_name}</p>
                          <p className="text-[11px] text-stone-400 font-sans">{emp.designation || 'Staff'} · {emp.department || 'Operations'}</p>
                        </div>
                      </div>
                      <select
                        defaultValue={emp.assigned_shift_id || 'NONE'}
                        onChange={e => handleAllocateShiftMapping(emp.id, e.target.value)}
                        className="text-xs font-sans text-stone-700 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
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
              <p className="text-xs text-stone-500 font-sans -mt-1 mb-4">
                Set the spatial radius and network gateway that gate employee check-ins.
              </p>
            </div>
            <Divider />
            <div className="p-5">
              <form onSubmit={handleUpdateGeofence} className="bg-[#F0EAD9] border border-[#DDD5C0] rounded-lg p-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div><FormLabel required>Latitude</FormLabel><Input type="number" step="any" required value={geoLat} onChange={e => setGeoLat(e.target.value)} /></div>
                <div><FormLabel required>Longitude</FormLabel><Input type="number" step="any" required value={geoLng} onChange={e => setGeoLng(e.target.value)} /></div>
                <div><FormLabel required>Radius (m)</FormLabel><Input type="number" required value={geoRadius} onChange={e => setGeoRadius(e.target.value)} /></div>
                <div><FormLabel>Allowed IP</FormLabel><Input value={allowedIpInput} onChange={e => setAllowedIpInput(e.target.value)} placeholder="192.168.1.1" /></div>
                <button type="submit" disabled={updatingGeo} className="h-[38px] w-full bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-sans font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50">
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
                    <span className="text-3xl font-bold text-stone-900 font-sans tabular-nums">{currentAttendanceRate}%</span>
                    <span className="text-xs text-stone-400 font-sans">{todayAttendance.length} / {employees.length} present</span>
                  </div>
                  <div className="w-full h-2 bg-[#E8E0CC] rounded-full overflow-hidden">
                    <div className="h-full bg-stone-700 rounded-full transition-all duration-500" style={{ width: `${currentAttendanceRate}%` }} />
                  </div>
                </div>
                <Divider />
                <div className="grid grid-cols-2 divide-x divide-[#E8E0CC]">
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-stone-400 mb-0.5">Total Employees</p>
                    <p className="text-xl font-bold text-stone-900 font-sans">{employees.length}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-stone-400 mb-0.5">Monthly Payroll</p>
                    <p className="text-xl font-bold text-stone-900 font-sans">₹{totalPayrollLiability.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </Card>

              {/* Dept distribution */}
              <Card>
                <div className="px-5 pt-5 pb-3">
                  <SectionLabel icon={<PieChart className="w-3.5 h-3.5" />}>Department Distribution</SectionLabel>
                </div>
                <Divider />
                <div className="p-3 max-h-48 overflow-y-auto divide-y divide-[#E8E0CC]">
                  {Object.entries(deptCounts).length === 0 ? (
                    <p className="px-2 py-4 text-xs text-stone-400 font-sans text-center italic">No departments defined yet.</p>
                  ) : Object.entries(deptCounts).map(([dept, count]: any) => (
                    <div key={dept} className="px-3 py-2.5 flex items-center justify-between hover:bg-[#F0EAD9] transition-colors">
                      <span className="text-sm text-stone-700 font-sans truncate">{dept}</span>
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
                <p className="px-5 py-8 text-center text-sm text-stone-400 font-sans italic">No check-ins recorded yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 p-4 max-h-48 overflow-y-auto">
                  {todayAttendance.map((log) => (
                    <div key={log.id} className="flex items-center justify-between bg-[#F0EAD9] border border-[#DDD5C0] rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={log.employee_name} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-900 font-sans truncate">{log.employee_name}</p>
                          <p className="text-[10px] text-stone-400 font-sans">{log.employee_code}</p>
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
                <p className="px-5 py-8 text-center text-sm text-stone-400 font-sans italic">No audit events logged yet.</p>
              ) : (
                <div className="divide-y divide-[#E8E0CC] max-h-72 overflow-y-auto">
                  {systemLogs.map((log) => (
                    <div key={log.id} className="px-5 py-3 flex flex-col sm:flex-row sm:justify-between gap-1 hover:bg-[#F0EAD9] transition-colors">
                      <p className="text-sm text-stone-700 font-sans">
                        <span className="font-semibold text-stone-900">[{log.event_type || 'SYSTEM'}]</span>{' '}
                        {log.description}
                      </p>
                      <span className="text-[11px] text-stone-400 font-sans tabular-nums shrink-0">
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
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">Edit Employee Profile</h3>
              <button onClick={() => setEditingEmployee(null)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-[#F0EAD9] transition-colors cursor-pointer">
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
              <div className="bg-[#F0EAD9] border border-[#DDD5C0] rounded-lg p-3 space-y-2">
                <SectionLabel>Banking Details</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editBankAccount} onChange={e => setEditBankAccount(e.target.value)} placeholder="Account No." />
                  <Input value={editIfscCode} onChange={e => setEditIfscCode(e.target.value)} placeholder="IFSC Code" />
                </div>
              </div>
              <button type="submit" className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-sans font-semibold py-2.5 rounded-lg transition-colors cursor-pointer">
                Save Changes
              </button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}