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
  Terminal
} from 'lucide-react';

export default function PremiumAdminUnifiedDashboard() {
  // Navigation View Controller
  const [currentSection, setCurrentSection] = useState<'ops' | 'security' | 'logs'>('ops');

  // Employee Form Inputs
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [monthlySalary, setMonthlySalary] = useState<string>('');
  const [empCodeInput, setEmpCodeInput] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [joiningDate, setJoiningDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Geofence & Network Settings
  const [geoLat, setGeoLat] = useState<string>('28.613939');
  const [geoLng, setGeoLng] = useState<string>('77.209021');
  const [geoRadius, setGeoRadius] = useState<string>('100');
  const [allowedIpInput, setAllowedIpInput] = useState<string>('');
  const [updatingGeo, setUpdatingGeo] = useState<boolean>(false);

  // Shift Planning States
  const [shifts, setShifts] = useState<any[]>([]);
  const [newShiftName, setNewShiftName] = useState<string>('');
  const [newShiftStart, setNewShiftStart] = useState<string>('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState<string>('18:00');
  const [newShiftGrace, setNewShiftGrace] = useState<string>('15');
  const [buildingShift, setBuildingShift] = useState<boolean>(false);

  // Core Data Lists
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [dailyTaskLogs, setDailyTaskLogs] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  // Layout View State
  const [activeTab, setActiveTab] = useState<'roster' | 'leaves' | 'advances' | 'tasks' | 'compliance' | 'payroll' | 'logs'>('roster');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('Enterprise Workspace Node');
  
  // Status & Global Interactivity Flags
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Edit Overlay Hooks
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDesignation, setEditDesignation] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editSalary, setEditSalary] = useState<string>('');
  const [editBankAccount, setEditBankAccount] = useState<string>('');
  const [editIfscCode, setEditIfscCode] = useState<string>('');

  /**
   * Updates workflow operational state targets inside database rows
   */
  const handleUpdateWorkflowStatus = async (table: string, id: string, status: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ status: status })
        .eq('id', id);

      if (error) throw error;
      
      if (companyId) {
        await refreshOperationalData(companyId);
      }
    } catch (error) {
      console.error('Error updating status context:', error);
    }
  };

  /**
   * Syncs and updates all dashboard tables asynchronously
   */
  const refreshOperationalData = async (targetCompanyId: string) => {
    try {
      const [employeesRes, leavesRes, advancesRes, attendanceRes, tasksRes, shiftsRes, regularizationsRes, logsRes] = await Promise.all([
        supabase.from('employees').select('*, company_shifts(*)').eq('company_id', targetCompanyId).order('created_at', { ascending: false }),
        supabase.from('leave_requests').select('*').eq('company_id', targetCompanyId).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('advance_salary_requests').select('*').eq('company_id', targetCompanyId).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('company_id', targetCompanyId).order('created_at', { ascending: false }),
        supabase.from('daily_tasks').select('*').eq('company_id', targetCompanyId).order('created_at', { ascending: false }),
        supabase.from('company_shifts').select('*').eq('company_id', targetCompanyId).order('created_at', { ascending: false }),
        supabase.from('attendance_regularizations').select('*').eq('company_id', targetCompanyId).eq('status', 'pending').order('created_at', {ascending: false }),
        supabase.from('system_audit_logs').select('*').eq('company_id', targetCompanyId).order('created_at', { ascending: false })
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
      console.error("Dashboard background sync failure:", err);
    }
  };

  /**
   * Lifecycle mount engine configuration
   */
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

  /**
   * Handles onboarding submission securely
   */
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSubmitting(true); 
    setStatusMessage(null);

    const payload = {
      companyId: String(companyId),
      fullName: String(fullName).trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone).trim(),
      designation: String(designation).trim() || 'Staff Consultant',
      department: String(department).trim() || 'Operations',
      monthlySalary: Number(monthlySalary) || 0,
      employeeCode: String(empCodeInput).toUpperCase().trim(),
      bankAccount: String(bankAccount).trim(),
      ifscCode: String(ifscCode).toUpperCase().trim(),
      joiningDate: String(joiningDate)
    };
    
    try {
      const res = await onboardEmployeeAction(payload);
      if (res && res.success) {
        setStatusMessage({ 
          type: 'success', 
          text: `Employee provisioned successfully. Temporary Password: ${String(res.tempPassword)}` 
        });
        await refreshOperationalData(companyId);
        
        // Clear field entries
        setFullName(''); setEmail(''); setPhone(''); setDesignation(''); setDepartment(''); 
        setMonthlySalary(''); setEmpCodeInput(''); setBankAccount(''); setIfscCode('');
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: res?.error ? String(res.error) : 'Failed to save employee profile.' 
        });
      }
    } catch (err: any) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Network transit failure occurred during profile submission.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handles shift rules registration updates
   */
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newShiftName) return;
    setBuildingShift(true);
    const res = await createCompanyShiftAction({ 
      companyId, 
      shiftName: newShiftName, 
      startTime: newShiftStart, 
      endTime: newShiftEnd, 
      gracePeriod: parseInt(newShiftGrace) || 0 
    });
    if (res.success) { 
      setNewShiftName(''); 
      await refreshOperationalData(companyId); 
    }
    setBuildingShift(false);
  };

  /**
   * Dispatches explicit employee assignment shifts mutations
   */
  const handleAllocateShiftMapping = async (employeeId: string, shiftId: string) => {
    if (!companyId) return;
    const target = shiftId === "NONE" ? null : shiftId;
    const res = await assignEmployeeShiftAction(employeeId, target);
    if (res.success) await refreshOperationalData(companyId);
  };

  /**
   * Updates company global geofence settings profile arrays
   */
  const handleUpdateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setUpdatingGeo(true);
    const res = await updateCompanyGeofenceAction({ 
      companyId, 
      latitude: parseFloat(geoLat) || 0, 
      longitude: parseFloat(geoLng) || 0, 
      radiusMeters: parseInt(geoRadius) || 100, 
      allowedIp: allowedIpInput 
    });
    if (res.success) setStatusMessage({ type: 'success', text: 'Geofence boundaries updated successfully.' });
    setUpdatingGeo(false);
  };

  /**
   * Commits profile edits safely to back-end lookup targets
   */
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !editingEmployee) return;
    const { error } = await supabase.from('employees').update({
      full_name: editName.trim(), 
      designation: editDesignation.trim() || null, 
      department: editDepartment.trim() || 'Operations',
      monthly_salary: editSalary ? parseInt(editSalary) : 0, 
      bank_account_number: editBankAccount.trim() || null, 
      ifsc_code: editIfscCode.toUpperCase().trim() || null
    }).eq('id', editingEmployee.id);
    
    if (!error) { 
      setEditingEmployee(null); 
      await refreshOperationalData(companyId); 
    }
  };

  /**
   * Binds employee configuration states directly to local inputs
   */
  const startEditing = (emp: any) => {
    setEditingEmployee(emp);
    setEditName(emp.full_name);
    setEditDesignation(emp.designation || '');
    setEditDepartment(emp.department || '');
    setEditSalary(emp.monthly_salary || '');
    setEditBankAccount(emp.bank_account_number || '');
    setEditIfscCode(emp.ifsc_code || '');
  };

  // Metric Calculation Matrices
  const totalPayrollLiability = employees.reduce((sum, emp) => sum + (Number(emp.monthly_salary) || 0), 0);
  const deptCounts = employees.reduce((acc: any, emp) => { acc[emp.department || 'Operations'] = (acc[emp.department || 'Operations'] || 0) + 1; return acc; }, {});
  const currentAttendanceRate = employees.length > 0 ? Math.round((todayAttendance.length / employees.length) * 100) : 0;

  if (loading) return <div className="p-24 text-center font-mono text-xs text-neutral-400 animate-pulse">Syncing administration workspace data...</div>;

  return (
    <div className="min-h-screen premium-canvas flex flex-col antialiased selection:bg-white/10">
      
      {/* GLOBAL NAVIGATION CONTROL TOP SHELF BAR */}
      <header className="border-b border-white/[0.05] bg-[#0B0F17]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-3 self-start sm:self-center">
          <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-md">
            <Building2 className="w-4 h-4 text-[#070A10]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">{companyName}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-white">HRBharat Node Administration</h1>
          </div>
        </div>

        {/* WORKSPACE NAVIGATION LINK ROADS SWITCH */}
        <nav className="flex space-x-1 bg-[#131B2E] p-1 rounded-xl border border-white/[0.04] w-full sm:w-auto overflow-x-auto">
          <button onClick={() => setCurrentSection('ops')} className={`flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap flex-1 sm:flex-none ${currentSection === 'ops' ? 'bg-[#1C2641] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            <Users className="w-3.5 h-3.5" /> <span>Core Operations</span>
          </button>
          <button onClick={() => setCurrentSection('security')} className={`flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap flex-1 sm:flex-none ${currentSection === 'security' ? 'bg-[#1C2641] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            <Lock className="w-3.5 h-3.5" /> <span>Security Mesh</span>
          </button>
          <button onClick={() => setCurrentSection('logs')} className={`flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap flex-1 sm:flex-none ${currentSection === 'logs' ? 'bg-[#1C2641] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            <Terminal className="w-3.5 h-3.5" /> <span>Telemetry & Logs</span>
          </button>
        </nav>
      </header>

      {/* FEED NOTIFICATION SYSTEM BANNER STRIP */}
      {statusMessage && (
        <div className={`mx-6 mt-6 p-4 rounded-xl border text-xs font-mono flex items-center space-x-3 animate-fadeIn ${statusMessage.type === 'success' ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' : 'bg-red-950/30 border-red-500/20 text-red-400'}`}>
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <div className="flex-1 flex justify-between items-center">
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="p-0.5 hover:bg-white/5 rounded"><X className="w-3 h-3" /></button>
          </div>
        </div>
      )}

      {/* CORE MATRIX SECTION BLOCK CONTENT CONTAINER */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        
        {/* VIEW SEGMENT: CORE WORKFORCE MANAGEMENT */}
        {currentSection === 'ops' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* WORKFORCE PERFORMANCE NUMERICAL COUNTERS SHEET */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="premium-card rounded-xl p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">Active Roster Pool</span>
                  <p className="text-2xl font-bold text-white tracking-tight">{employees.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#131B2E] border border-white/[0.04] text-slate-300"><Users className="w-5 h-5" /></div>
              </div>

              <div className="premium-card rounded-xl p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">Monthly Payroll Liability</span>
                  <p className="text-2xl font-bold text-white tracking-tight">₹{totalPayrollLiability.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#131B2E] border border-white/[0.04] text-slate-300"><DollarSign className="w-5 h-5" /></div>
              </div>

              <div className="premium-card rounded-xl p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">Pending Review Updates</span>
                  <p className="text-2xl font-bold text-white tracking-tight">{leaveRequests.length + advanceRequests.length + regularizations.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#131B2E] border border-white/[0.04] text-slate-300"><Briefcase className="w-5 h-5" /></div>
              </div>

              <div className="premium-card rounded-xl p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">Today Attendance Rate</span>
                  <p className="text-2xl font-bold text-white tracking-tight">{currentAttendanceRate}%</p>
                </div>
                <div className="p-3 rounded-lg bg-[#131B2E] border border-white/[0.04] text-slate-300"><Activity className="w-5 h-5" /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* SIDEBAR ONBOARDING CONFIGURATION SUBMODULE CARD */}
              <div className="lg:col-span-4 premium-card rounded-2xl p-6 space-y-4">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-slate-400" /> Onboard New Employee
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1">Register new employee accounts directly into the database system context links.</p>
                </div>

                <form onSubmit={handleOnboardSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Emp Code *</label>
                      <input type="text" required value={empCodeInput} onChange={e => setEmpCodeInput(e.target.value)} placeholder="e.g. HRB-102" className="text-xs p-2.5 rounded-lg w-full premium-input" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Full Name *</label>
                      <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Liam Sterling" className="text-xs p-2.5 rounded-lg w-full premium-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Email *</label>
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@domain.com" className="text-xs p-2.5 rounded-lg w-full premium-input" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Mobile Phone</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." className="text-xs p-2.5 rounded-lg w-full premium-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Designation</label>
                      <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Systems Engineer" className="text-xs p-2.5 rounded-lg w-full premium-input" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Department</label>
                      <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering" className="text-xs p-2.5 rounded-lg w-full premium-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Joining Date *</label>
                      <input type="date" required value={joiningDate} onChange={e => setJoiningDate(e.target.value)} className="text-xs p-2.5 text-slate-300 rounded-lg w-full select-none premium-input" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Gross Salary</label>
                      <input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="₹ Monthly Amount" className="text-xs p-2.5 rounded-lg w-full premium-input" />
                    </div>
                  </div>

                  <div className="luxury-terminal p-4 rounded-xl space-y-3">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">Banking Information</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="Account Number" className="text-xs p-2.5 bg-[#131B2E] border border-white/[0.04] text-white rounded-lg w-full focus:outline-none" />
                      <input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value)} placeholder="IFSC Code" className="text-xs p-2.5 bg-[#131B2E] border border-white/[0.04] text-white rounded-lg w-full focus:outline-none" />
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="w-full premium-button-matte font-medium text-xs py-3 rounded-xl tracking-wide shadow-md">
                    {submitting ? 'Processing Submission...' : 'Onboard Employee Profile'}
                  </button>
                </form>
              </div>

              {/* CORE CENTRAL DIRECTORY DATA POOL TABS */}
              <div className="lg:col-span-8 premium-card rounded-2xl overflow-hidden min-h-[640px] flex flex-col">
                <div className="border-b border-white/[0.04] bg-[#070A10]/60 flex flex-wrap gap-1 p-2">
                  {[
                    { id: 'roster', label: 'Roster Pool' },
                    { id: 'leaves', label: `Absences (${leaveRequests.length})` },
                    { id: 'advances', label: `Advances (${advanceRequests.length})` },
                    { id: 'tasks', label: 'Priority Matrix' },
                    { id: 'compliance', label: `Corrections (${regularizations.length})` },
                    { id: 'payroll', label: 'Payroll Engine' }
                  ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer transition-all ${activeTab === t.id ? 'bg-[#131B2E] border border-white/[0.06] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
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
              </div>

            </div>

            {/* DYNAMIC COMPANY SHIFT ENGINE PARAMETERS MAP PANEL */}
            <div className="premium-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-white/[0.04] pb-3">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-400" /> Shift Configurations & Staff Allocations
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Define custom structural shift rules and map them directly into individual employee records.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Rule Setup Form Sheet */}
                <form onSubmit={handleCreateShift} className="lg:col-span-4 luxury-terminal p-4 rounded-xl space-y-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">Create Shift Configuration</span>
                  <input type="text" required placeholder="Shift Rule Name" value={newShiftName} onChange={e => setNewShiftName(e.target.value)} className="text-xs p-2.5 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg w-full focus:outline-none" />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[8px] font-mono uppercase text-slate-500 font-bold">Start Time</span>
                      <input type="time" required value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} className="text-xs p-2 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg w-full" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-mono uppercase text-slate-500 font-bold">End Time</span>
                      <input type="time" required value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} className="text-xs p-2 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg w-full" />
                    </div>
                  </div>

                  <input type="number" required placeholder="Grace Period (Minutes)" value={newShiftGrace} onChange={e => setNewShiftGrace(e.target.value)} className="text-xs p-2.5 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg w-full focus:outline-none" />
                  <button type="submit" disabled={buildingShift} className="w-full bg-[#1C2641] hover:bg-[#253359] text-white font-medium text-xs py-2.5 rounded-lg transition-all cursor-pointer">
                    {buildingShift ? 'Saving Configuration...' : 'Save Shift Settings'}
                  </button>
                </form>

                {/* Live Headcount Direct Allocator Grid Sheet */}
                <div className="lg:col-span-8 max-h-[220px] overflow-y-auto luxury-terminal rounded-xl divide-y divide-white/[0.04]">
                  {employees.length === 0 ? (
                    <p className="p-4 text-center font-mono text-[11px] text-slate-500 italic">No employees available to inherit shift rules.</p>
                  ) : (
                    employees.map(emp => (
                      <div key={emp.id} className="p-3.5 flex items-center justify-between text-xs text-slate-300 hover:bg-white/[0.01] transition-colors">
                        <div>
                          <p className="font-bold text-white">{emp.full_name} <span className="text-slate-500 font-mono text-[10px]">({emp.employee_code})</span></p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{emp.designation || 'Staff Consultant'} • <span className="text-[9px] font-mono text-slate-500">{emp.department || 'Operations'}</span></p>
                        </div>
                        <select defaultValue={emp.assigned_shift_id || "NONE"} onChange={e => handleAllocateShiftMapping(emp.id, e.target.value)} className="text-[11px] font-bold p-2 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg focus:outline-none cursor-pointer">
                          <option value="NONE">General Timeline Policy</option>
                          {shifts.map(s => <option key={s.id} value={s.id}>{s.shift_name} [{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}]</option>)}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW SEGMENT: GEOMETRIC SECURITY MESH BOUNDS */}
        {currentSection === 'security' && (
          <div className="premium-card rounded-2xl p-6 space-y-6 animate-fadeIn">
            <div className="border-b border-white/[0.04] pb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" /> Geofence Coordinate Matrix & IP Verification Controls
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">Configure precise real-world spatial radius bounds and office subnet gateways for checkout data validation processing loops.</p>
            </div>

            <form onSubmit={handleUpdateGeofence} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end luxury-terminal p-6 rounded-xl">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Office Latitude</span>
                <input type="number" step="any" required value={geoLat} onChange={e => setGeoLat(e.target.value)} className="text-xs p-2.5 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg w-full focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Office Longitude</span>
                <input type="number" step="any" required value={geoLng} onChange={e => setGeoLng(e.target.value)} className="text-xs p-2.5 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg w-full focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Validation Radius (Meters)</span>
                <input type="number" required value={geoRadius} onChange={e => setGeoRadius(e.target.value)} className="text-xs p-2.5 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg w-full focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Allowed IP Gateway (Optional)</span>
                <input type="text" value={allowedIpInput} onChange={e => setAllowedIpInput(e.target.value)} placeholder="e.g. 192.168.1.1" className="text-xs p-2.5 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg w-full focus:outline-none" />
              </div>
              <button type="submit" disabled={updatingGeo} className="w-full premium-button-matte font-medium text-xs h-[40px] rounded-lg tracking-wide shadow-md">
                {updatingGeo ? 'Syncing...' : 'Lock Boundaries'}
              </button>
            </form>
          </div>
        )}

        {/* VIEW SEGMENT: METRICS TELEMETRY LOGS ENGINE */}
        {currentSection === 'logs' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* CORE MONITOR INDICATORS ANALYSIS CONTAINER LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Live Attendance Rate Progress Matrix */}
              <div className="premium-card rounded-2xl p-6 space-y-4">
                <div className="flex justify-between border-b border-white/[0.04] pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Attendance Analytics Tracker</span>
                  <span className="font-mono text-white bg-[#131B2E] border border-white/[0.06] px-2 py-0.5 rounded">{currentAttendanceRate}%</span>
                </div>
                <div className="w-full h-2 bg-[#070A10] rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${currentAttendanceRate}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-4 font-mono text-xs text-white pt-2">
                  <div className="luxury-terminal p-3 rounded-xl">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-wider mb-0.5">Total Employee Headcount</span>
                    <span className="text-base font-bold">{employees.length} Active Profiles</span>
                  </div>
                  <div className="luxury-terminal p-3 rounded-xl">
                    <span className="text-[9px] text-slate-500 block font-bold uppercase tracking-wider mb-0.5">Gross Budget Liability / Mo</span>
                    <span className="text-base font-bold">₹{totalPayrollLiability.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Department Headcount Breakdown Configuration Panel */}
              <div className="premium-card rounded-2xl p-6 space-y-3 text-[11px] font-bold uppercase text-slate-400">
                <span className="border-b border-white/[0.04] pb-2 flex items-center gap-1.5"><PieChart className="w-3.5 h-3.5" /> Office Department Distribution</span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[9px] pt-1 max-h-[125px] overflow-y-auto">
                  {Object.entries(deptCounts).length === 0 ? (
                    <p className="text-slate-500 italic lowercase p-2">No functional departments defined yet.</p>
                  ) : (
                    Object.entries(deptCounts).map(([dept, count]: any) => (
                      <div key={dept} className="luxury-terminal p-2.5 rounded-lg flex justify-between items-center text-slate-300">
                        <span className="truncate max-w-[120px]">{dept}</span>
                        <span className="text-white font-bold bg-[#131B2E] px-1.5 py-0.5 border border-white/[0.04] rounded">{count} Headcount</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* LIVE TELEMETRY LOGS INFLUX FEED COMPONENT CONTAINER */}
            <div className="premium-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 bg-[#070A10] border-b border-white/[0.04] text-[11px] font-bold uppercase tracking-wider text-slate-400 flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Cpu className="w-4 h-4 text-slate-500" /> Active Shift Presence Records</span>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded animate-pulse">Live Tracking Matrix Active</span>
              </div>
              <div className="p-5">
                {todayAttendance.length === 0 ? (
                  <p className="text-center font-mono text-[10px] text-slate-500 italic py-4">No real-time attendance login events tracked inside current frames.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[180px] overflow-y-auto font-mono text-[11px]">
                    {todayAttendance.map(log => (
                      <div key={log.id} className="p-3 rounded-xl flex justify-between luxury-terminal text-slate-300 items-center">
                        <span className="truncate mr-2 font-medium text-white">{log.employee_name} <span className="text-slate-500 text-[10px]">({log.employee_code})</span></span>
                        <span className="text-slate-400 text-[10px] flex-shrink-0 bg-[#131B2E] border border-white/[0.04] px-1.5 py-0.5 rounded">{log.punch_in_time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* UNIFIED COMPREHENSIVE PLATFORM TRANSACTION AUDITS TRAIL BLOCK */}
            <div className="premium-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-500" /> System Activity Audit Trail Logs
                </h2>
                <span className="text-[9px] text-slate-500 font-mono">Real-time Activity Stream</span>
              </div>
              <div className="max-h-[260px] overflow-y-auto luxury-terminal rounded-xl divide-y divide-white/[0.04] font-mono text-[11px]">
                {systemLogs.length === 0 ? (
                  <p className="p-4 text-slate-500 text-center italic">No functional events or profile changes logged in this network session.</p>
                ) : (
                  systemLogs.map(log => (
                    <div key={log.id} className="p-3 flex flex-col sm:flex-row sm:justify-between gap-1 text-slate-400 hover:bg-white/[0.01] transition-colors">
                      <span className="text-slate-200"><span className="text-slate-500 font-bold">[{log.event_type || 'SYSTEM'}]</span> {log.description}</span>
                      <span className="text-[10px] text-slate-500 self-end sm:self-center">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FIXED WINDOW LIGHT-BOX MODAL PROFILE MODIFY OVERLAY SHEET */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="premium-card w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Update Employee Profile Details</h3>
              <button onClick={() => setEditingEmployee(null)} className="text-slate-400 hover:text-white cursor-pointer transition-colors p-1 hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-500">Employee Name</span>
                <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="text-xs p-2.5 rounded-lg w-full premium-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-500">Designation</span>
                  <input type="text" value={editDesignation} onChange={e => setEditDesignation(e.target.value)} className="text-xs p-2.5 rounded-lg w-full premium-input" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-500">Department</span>
                  <input type="text" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} className="text-xs p-2.5 rounded-lg w-full premium-input" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-500">Gross Monthly Salary (₹)</span>
                <input type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)} className="text-xs p-2.5 rounded-lg w-full premium-input" />
              </div>
              <div className="luxury-terminal p-3.5 rounded-xl space-y-2">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block">Edit Banking Routing Data</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={editBankAccount} onChange={e => setEditBankAccount(e.target.value)} placeholder="Account Number" className="text-xs p-2 bg-[#131B2E] border border-white/[0.04] text-white rounded-lg" />
                  <input type="text" value={editIfscCode} onChange={e => setEditIfscCode(e.target.value)} placeholder="IFSC Code" className="text-xs p-2 bg-[#131B2E] border border-white/[0.04] text-white rounded-lg" />
                </div>
              </div>
              <button type="submit" className="w-full premium-button-matte font-bold text-xs py-2.5 rounded-xl shadow-md">
                Commit Changes
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}