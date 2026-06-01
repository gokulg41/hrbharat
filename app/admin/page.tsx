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
  Cpu
} from 'lucide-react';


export default function PremiumAdminUnifiedDashboard() {
  // Operational Pipeline States
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

  const [geoLat, setGeoLat] = useState<string>('28.613939');
  const [geoLng, setGeoLng] = useState<string>('77.209021');
  const [geoRadius, setGeoRadius] = useState<string>('100');
  const [allowedIpInput, setAllowedIpInput] = useState<string>('');
  const [updatingGeo, setUpdatingGeo] = useState<boolean>(false);

  const [shifts, setShifts] = useState<any[]>([]);
  const [newShiftName, setNewShiftName] = useState<string>('');
  const [newShiftStart, setNewShiftStart] = useState<string>('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState<string>('18:00');
  const [newShiftGrace, setNewShiftGrace] = useState<string>('15');
  const [buildingShift, setBuildingShift] = useState<boolean>(false);

  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [dailyTaskLogs, setDailyTaskLogs] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'roster' | 'leaves' | 'advances' | 'tasks' | 'compliance' | 'payroll' | 'logs'>('roster');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('Enterprise Workspace Node');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null); // NEW: tracks workspace load errors
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDesignation, setEditDesignation] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editSalary, setEditSalary] = useState<string>('');
  const [editBankAccount, setEditBankAccount] = useState<string>('');
  const [editIfscCode, setEditIfscCode] = useState<string>('');

  const handleUpdateWorkflowStatus = async (table: string, id: string, status: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ status: status })
        .eq('id', id);

      if (error) throw error;
      if (companyId) await refreshOperationalData(companyId);
    } catch (error) {
      console.error('Error updating workflow status:', error);
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
      console.error(err);
    }
  };

  useEffect(() => {
    async function loadAdminWorkspace() {
      // DEBUG: Check auth user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("[DEBUG] auth user:", user?.id, "| error:", userError);

      if (!user) {
        console.warn("[DEBUG] No authenticated user found. Aborting workspace load.");
        setInitError("No authenticated user session found. Please log in again.");
        setLoading(false);
        return;
      }

      // DEBUG: Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      console.log("[DEBUG] profile:", profile, "| error:", profileError);

      if (profileError) {
        console.error("[DEBUG] Profile fetch failed:", profileError.message);
        setInitError(`Profile fetch failed: ${profileError.message}`);
        setLoading(false);
        return;
      }

      if (!profile?.company_id) {
        console.warn("[DEBUG] Profile exists but company_id is null or missing.");
        setInitError("Your admin profile has no company assigned. Contact support.");
        setLoading(false);
        return;
      }

      // All good — set companyId and load data
      console.log("[DEBUG] company_id resolved:", profile.company_id);
      setCompanyId(profile.company_id);

      const { data: comp } = await supabase
        .from('companies')
        .select('name')
        .eq('id', profile.company_id)
        .single();

      if (comp?.name) setCompanyName(comp.name);

      const { data: geoSettings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (geoSettings) {
        setGeoLat(geoSettings.latitude.toString());
        setGeoLng(geoSettings.longitude.toString());
        setGeoRadius(geoSettings.radius_meters.toString());
        if (geoSettings.allowed_ip) setAllowedIpInput(geoSettings.allowed_ip);
      }

      await refreshOperationalData(profile.company_id);
      setLoading(false);
    }

    loadAdminWorkspace();
  }, []);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // DEBUG: Log companyId at submit time
    console.log("[DEBUG] handleOnboardSubmit fired | companyId:", companyId);

    if (!companyId) {
      setStatusMessage({ type: 'error', text: 'Company context not loaded. Refresh the page and try again.' });
      return;
    }

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
      bankAccount: String(bankAccount).trim() || null,
      ifscCode: String(ifscCode).toUpperCase().trim() || null,
      joiningDate: String(joiningDate)
    };

    // DEBUG: Log payload before dispatch
    console.log("[DEBUG] onboarding payload:", payload);

    try {
      const res = await onboardEmployeeAction(payload);

      // DEBUG: Log raw server action response
      console.log("[DEBUG] onboardEmployeeAction response:", res);
      
      if (!res) {
        setStatusMessage({ 
          type: 'error', 
          text: 'The server action dropped the payload mapping without responding.' 
        });
        return;
      }
      
      if (res.success) {
        setStatusMessage({ 
          type: 'success', 
          text: `Asset provisioned securely. Temporary Code Token: ${String(res.tempPassword)}` 
        });
        
        await refreshOperationalData(String(companyId));
        
        setFullName(''); 
        setEmail(''); 
        setPhone(''); 
        setDesignation(''); 
        setDepartment(''); 
        setMonthlySalary(''); 
        setEmpCodeInput(''); 
        setBankAccount(''); 
        setIfscCode('');
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: res.error ? String(res.error) : 'Administrative entry validation failure.' 
        });
      }
    } catch (err: any) {
      console.error("[DEBUG] onboardEmployeeAction threw:", err);
      setStatusMessage({ 
        type: 'error', 
        text: `Network handshake failure: ${err?.message ? String(err.message) : 'Connection dropped mid-transit.'}` 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newShiftName) return;
    setBuildingShift(true);
    const res = await createCompanyShiftAction({ companyId, shiftName: newShiftName, startTime: newShiftStart, endTime: newShiftEnd, gracePeriod: parseInt(newShiftGrace) });
    if (res.success) { setNewShiftName(''); await refreshOperationalData(companyId); }
    setBuildingShift(false);
  };

  const handleAllocateShiftMapping = async (employeeId: string, shiftId: string) => {
    if (!companyId) return;
    const target = shiftId === "NONE" ? null : shiftId;
    const res = await assignEmployeeShiftAction(employeeId, target);
    if (res.success) await refreshOperationalData(companyId);
  };

  const handleUpdateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setUpdatingGeo(true);
    const res = await updateCompanyGeofenceAction({ companyId, latitude: parseFloat(geoLat), longitude: parseFloat(geoLng), radiusMeters: parseInt(geoRadius), allowedIp: allowedIpInput });
    if (res.success) setStatusMessage({ type: 'success', text: 'Perimeter specifications locked securely.' });
    setUpdatingGeo(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !editingEmployee) return;
    const { error } = await supabase.from('employees').update({
      full_name: editName.trim(), designation: editDesignation.trim() || null, department: editDepartment.trim() || 'Operations',
      monthly_salary: editSalary ? parseInt(editSalary) : 0, bank_account_number: editBankAccount.trim() || null, ifsc_code: editIfscCode.toUpperCase().trim() || null
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

  if (loading) return (
    <div className="p-24 text-center font-mono text-xs text-neutral-400 animate-pulse">
      Synchronizing universal cluster configuration maps...
    </div>
  );

  // NEW: Show a clear error if workspace failed to initialize (no user / no companyId)
  if (initError) return (
    <div className="p-24 text-center font-mono text-xs text-red-400 space-y-2">
      <ShieldAlert className="w-6 h-6 mx-auto mb-3" />
      <p className="font-bold uppercase tracking-wider">Workspace Initialization Failed</p>
      <p>{initError}</p>
      <p className="text-slate-500 text-[10px] mt-4">Check browser console for [DEBUG] logs for more detail.</p>
    </div>
  );

  return (
    <div className="premium-canvas min-h-screen p-6 lg:p-12 space-y-8 max-w-[1600px] mx-auto bg-[#0B0F17]">
      
      {/* HEADER BANNER CARD */}
      <div className="premium-card p-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-neutral-400">
            <Building2 className="w-4 h-4 text-white" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">{companyName}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Workforce Engineering Dashboard</h1>
        </div>
        <div className="grid grid-cols-3 gap-4 font-mono text-xs text-white">
          <div className="bg-[#1C2641]/40 p-4 border border-white/[0.04] rounded-xl"><span className="text-[9px] text-slate-400 font-sans block uppercase font-bold tracking-wider">Headcount</span><span className="text-lg font-bold">{employees.length}</span></div>
          <div className="bg-[#1C2641]/40 p-4 border border-white/[0.04] rounded-xl"><span className="text-[9px] text-slate-400 font-sans block uppercase font-bold tracking-wider">Spend / Mo</span><span className="text-lg font-bold">₹{totalPayrollLiability.toLocaleString('en-IN')}</span></div>
          <div className="bg-[#1C2641]/40 p-4 border border-white/[0.04] rounded-xl"><span className="text-[9px] text-slate-400 font-sans block uppercase font-bold tracking-wider">Active Tasks</span><span className="text-lg font-bold">{leaveRequests.length + advanceRequests.length + regularizations.length}</span></div>
        </div>
      </div>

      {/* STATUS MESSAGE BANNER FEED */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border text-xs font-mono flex items-center space-x-2 ${statusMessage.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border-red-500/30 text-red-400'}`}>
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* METRIC GRIDS PLATFORMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="premium-card p-5 space-y-3">
          <div className="flex justify-between border-b border-white/[0.04] pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider"><span><TrendingUp className="w-3.5 h-3.5 inline mr-1" /> Presence Intensity Monitor</span><span className="font-mono text-white bg-[#131B2E] border border-white/[0.06] px-2 py-0.2 rounded">{currentAttendanceRate}%</span></div>
          <div className="w-full h-1.5 bg-[#070A10] rounded-full overflow-hidden flex"><div className="h-full bg-white" style={{ width: `${currentAttendanceRate}%` }} /></div>
        </div>
        <div className="premium-card p-5 space-y-2 text-[11px] font-bold uppercase text-slate-400">
          <span className="border-b border-white/[0.04] pb-2 block"><PieChart className="w-3.5 h-3.5 inline mr-1" /> Department Allocations</span>
          <div className="grid grid-cols-2 gap-2 font-mono text-[9px] pt-1">
            {Object.entries(deptCounts).map(([d, c]: any) => <div key={d} className="bg-[#070A10] p-1.5 border border-white/[0.04] rounded flex justify-between"><span>{d}</span><span className="text-white font-bold">{c} Staff</span></div>)}
          </div>
        </div>
      </div>

      {/* SHIFT SCHEDULER MATRIX FRAME */}
      <div className="premium-card p-6 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/[0.04] pb-2"><Sliders className="w-4 h-4" /><span>Shift Management Rules & Allocations</span></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleCreateShift} className="lg:col-span-4 bg-[#070A10] p-4 border border-white/[0.04] rounded-xl space-y-3">
            <input type="text" required placeholder="Shift Template Name" value={newShiftName} onChange={e => setNewShiftName(e.target.value)} className="premium-input" />
            <div className="grid grid-cols-2 gap-2">
              <input type="time" required value={newShiftStart} onChange={e => setNewShiftStart(e.target.value)} className="premium-input" />
              <input type="time" required value={newShiftEnd} onChange={e => setNewShiftEnd(e.target.value)} className="premium-input" />
            </div>
            <input type="number" required placeholder="Grace Period (Mins)" value={newShiftGrace} onChange={e => setNewShiftGrace(e.target.value)} className="premium-input" />
            <button type="submit" disabled={buildingShift} className="premium-button-matte w-full">{buildingShift ? 'Saving...' : 'Deploy Shift parameters'}</button>
          </form>
          <div className="lg:col-span-8 max-h-[195px] overflow-y-auto border border-white/[0.04] bg-[#070A10] rounded-xl divide-y divide-white/[0.04]">
            {employees.map(emp => (
              <div key={emp.id} className="p-3 flex items-center justify-between text-xs text-slate-300">
                <div><p className="font-bold text-white">{emp.full_name} <span className="text-slate-500 font-mono text-[10px]">({emp.employee_code})</span></p></div>
                <select defaultValue={emp.assigned_shift_id || "NONE"} onChange={e => handleAllocateShiftMapping(emp.id, e.target.value)} className="text-[11px] font-bold p-1.5 border border-white/[0.06] bg-[#131B2E] text-white rounded-lg focus:outline-none cursor-pointer">
                  <option value="NONE">General Timeline Policy</option>
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.shift_name} [{s.start_time.slice(0,5)}]</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CORE TWO COLUMN COMPONENT VIEWPORT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR FORM PANEL: COL SIZE 4 */}
        <div className="lg:col-span-4 premium-card p-6 space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-white/[0.04] pb-2"><UserPlus className="w-4 h-4 inline mr-1" /> Onboard Node Asset</span>
          <form onSubmit={handleOnboardSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2"><input type="text" required value={empCodeInput} onChange={e => setEmpCodeInput(e.target.value)} placeholder="Code *" className="premium-input" /><input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name *" className="premium-input" /></div>
            <div className="grid grid-cols-2 gap-2"><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email *" className="premium-input" /><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile" className="premium-input" /></div>
            <div className="grid grid-cols-2 gap-2"><input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Designation" className="premium-input" /><input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" className="premium-input" /></div>
            <div className="grid grid-cols-2 gap-2"><input type="date" required value={joiningDate} onChange={e => setJoiningDate(e.target.value)} className="premium-input text-slate-400" /><input type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="Gross Package" className="premium-input" /></div>
            <div className="bg-[#070A10] p-3 border border-white/[0.04] rounded-xl grid grid-cols-2 gap-2"><input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="Account Number" className="text-xs p-2 border border-white/[0.04] bg-[#131B2E] text-white rounded-lg w-full focus:outline-none" /><input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value)} placeholder="IFSC Routing Code" className="text-xs p-2 border border-white/[0.04] bg-[#131B2E] text-white rounded-lg w-full focus:outline-none" /></div>
            <button type="submit" disabled={submitting} className="premium-button-matte w-full">{submitting ? 'Processing...' : 'Authorize Node Entry'}</button>
          </form>
        </div>

        {/* WORKSPACE DIRECTORY PANEL CARDS TABS DECK: COL SIZE 8 */}
        <div className="lg:col-span-8 premium-card overflow-hidden flex flex-col min-h-[515px]">
          <div className="border-b border-white/[0.04] bg-[#070A10]/60 flex flex-wrap gap-1 p-2">
            {[
              { id: 'roster', label: 'Roster Pool' }, { id: 'leaves', label: `Absences (${leaveRequests.length})` }, { id: 'advances', label: `Advances (${advanceRequests.length})` },
              { id: 'tasks', label: 'Priority Matrix' }, { id: 'compliance', label: `Corrections (${regularizations.length})` }, { id: 'payroll', label: 'Payroll' }, { id: 'logs', label: 'Logs Trace' }
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl cursor-pointer transition-all ${activeTab === t.id ? 'bg-[#131B2E] border border-white/[0.06] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>{t.label}</button>
            ))}
          </div>
          <div className="flex-1 bg-transparent">
            <AdminTabsView activeTab={activeTab} employees={employees} leaveRequests={leaveRequests} advanceRequests={advanceRequests} dailyTaskLogs={dailyTaskLogs} regularizations={regularizations} systemLogs={systemLogs} searchQuery={searchQuery} setSearchQuery={setSearchQuery} startEditing={startEditing} handleUpdateWorkflowStatus={(table, id, status) => handleUpdateWorkflowStatus(table, id, status)} refreshOperationalData={async () => await refreshOperationalData(companyId!)} />
          </div>
        </div>

      </div>

      {/* TELEMETRY FEED AT LOWER SUB ROW DECK PANEL */}
      <div className="premium-card overflow-hidden">
        <div className="px-5 py-3.5 bg-[#070A10] border-b border-white/[0.04] text-[11px] font-bold uppercase tracking-wider text-slate-400 flex justify-between items-center"><span><Cpu className="w-4 h-4 inline mr-1 text-slate-500" /> Shift Presence Telemetry Streams</span><span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded animate-pulse">Sync Active</span></div>
        <div className="p-5">
          {todayAttendance.length === 0 ? <p className="text-center font-mono text-[10px] text-slate-500 italic py-4">No active connection logs traced inside current matrix frames.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[160px] overflow-y-auto pr-1 font-mono text-[11px]">
              {todayAttendance.map(log => <div key={log.id} className="p-3 border border-white/[0.04] rounded-xl flex justify-between bg-[#070A10]/40 text-slate-300"><span>{log.employee_name} ({log.employee_code})</span><span className="text-white font-bold">{log.punch_in_time}</span></div>)}
            </div>
          )}
        </div>
      </div>

      {/* PERIMETER SETTINGS POLICY LOCK SYSTEM PANEL */}
      <div className="premium-card p-5 space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-white/[0.04] block"><MapPin className="w-4 h-4 inline mr-1 text-slate-500" /> Security Mesh Coordinate Grid & IP Lock Configuration</span>
        <form onSubmit={handleUpdateGeofence} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <input type="number" step="any" required value={geoLat} onChange={e => setGeoLat(e.target.value)} className="premium-input" />
          <input type="number" step="any" required value={geoLng} onChange={e => setGeoLng(e.target.value)} className="premium-input" />
          <input type="number" required value={geoRadius} onChange={e => setGeoRadius(e.target.value)} className="premium-input" />
          <input type="text" value={allowedIpInput} onChange={e => setAllowedIpInput(e.target.value)} placeholder="IP Subnet Constraint" className="premium-input" />
          <button type="submit" className="premium-button-matte h-[41px]">Lock Rules</button>
        </form>
      </div>

      {/* STAFF UPDATE PORTAL MODAL DIALOG CONTAINER */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#131B2E] w-full max-w-md rounded-2xl border border-white/[0.06] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2"><h3 className="text-xs font-bold text-white uppercase tracking-wider">Modify Employee Profile</h3><button onClick={() => setEditingEmployee(null)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button></div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="premium-input" />
              <div className="grid grid-cols-2 gap-2"><input type="text" value={editDesignation} onChange={e => setEditDesignation(e.target.value)} className="premium-input" /><input type="text" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} className="premium-input" /></div>
              <input type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)} className="premium-input" />
              <div className="bg-[#070A10] p-3 border border-white/[0.04] rounded-xl grid grid-cols-2 gap-2"><input type="text" value={editBankAccount} onChange={e => setEditBankAccount(e.target.value)} className="text-xs p-2 border border-white/[0.04] bg-[#131B2E] text-white rounded-lg" /><input type="text" value={editIfscCode} onChange={e => setEditIfscCode(e.target.value)} className="text-xs p-2 border border-white/[0.04] bg-[#131B2E] text-white rounded-lg" /></div>
              <button type="submit" className="premium-button-matte w-full">Commit System Changes</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
