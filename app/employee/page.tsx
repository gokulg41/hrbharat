"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import EmployeeMonitorFeed from './monitor-feed';

import { 
  Calendar, 
  Clock, 
  Banknote, 
  Briefcase, 
  Activity,
  LogOut,
  FileText,
  ArrowRight,
  ClipboardList,
  FolderLock,
  Calculator,
  ShieldCheck,
  User,
  SlidersHorizontal,
  Landmark,
  CreditCard
} from 'lucide-react';

export default function EmployeeTerminalDashboard() {
  const router = useRouter();
  
  // Terminal Identity & Data States
  const [employee, setEmployee] = useState<any>(null);
  const [companyName, setCompanyName] = useState('Enterprise Member Terminal');
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [myAdvances, setMyAdvances] = useState<any[]>([]);
  const [myRegularizations, setMyRegularizations] = useState<any[]>([]);
  const [myPaySlips, setMyPaySlips] = useState<any[]>([]);
  
  // Daily Tasks & End-of-Day Output State Hooks
  const [assignedTasks, setAssignedTasks] = useState<any>(null);
  const [eodText, setEodText] = useState('');

  // Form Submission Inputs State
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');

  // Attendance Regularization Inputs State
  const [regDate, setRegDate] = useState('');
  const [regInTime, setRegInTime] = useState('09:00');
  const [regOutTime, setRegOutTime] = useState('18:00');
  const [regReason, setRegReason] = useState('');

  // ACCOUNT PROFILE INTERACTIVE SETTINGS STATES
  const [accountPhone, setAccountPhone] = useState('');
  const [accountBankNum, setAccountBankNum] = useState('');
  const [accountIfscCode, setAccountIfscCode] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  // Status Response Handlers
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPersonalRequestPipelines = async (empCode: string, compId: string) => {
    try {
      const [leavesRes, advancesRes, tasksRes, regularizationsRes, payrollRes, employeeFreshRes] = await Promise.all([
        supabase.from('leave_requests').select('*').eq('company_id', compId).eq('employee_code', empCode).order('created_at', { ascending: false }),
        supabase.from('advance_salary_requests').select('*').eq('company_id', compId).eq('employee_code', empCode).order('created_at', { ascending: false }),
        supabase.from('daily_tasks').select('*').eq('company_id', compId).eq('employee_code', empCode).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('attendance_regularizations').select('*').eq('company_id', compId).eq('employee_code', empCode).order('created_at', { ascending: false }),
        supabase.from('payroll_ledger').select('*').eq('company_id', compId).eq('employee_code', empCode).order('created_at', { ascending: false }),
        supabase.from('employees').select('*, company_shifts(*)').eq('company_id', compId).eq('employee_code', empCode).single()
      ]);

      if (leavesRes.data) setMyLeaves(leavesRes.data);
      if (advancesRes.data) setMyAdvances(advancesRes.data);
      if (regularizationsRes.data) setMyRegularizations(regularizationsRes.data);
      if (payrollRes.data) setMyPaySlips(payrollRes.data);
      if (employeeFreshRes.data) {
        setEmployee(employeeFreshRes.data);
        setAccountPhone(employeeFreshRes.data.phone_number || '');
        setAccountBankNum(employeeFreshRes.data.bank_account_number || '');
        setAccountIfscCode(employeeFreshRes.data.ifsc_code || '');
      }
      if (tasksRes.data) {
        setAssignedTasks(tasksRes.data);
        if (tasksRes.data.eod_submission) setEodText(tasksRes.data.eod_submission);
      }
    } catch (err) {
      console.error("Data pipeline load exception:", err);
    }
  };

  useEffect(() => {
    async function verifyAndLoadTerminal() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: empRecord } = await supabase.from('employees').select('*, company_shifts(*)').eq('email', user.email?.toLowerCase().trim()).single();
      if (!empRecord) { setLoading(false); return; }

      setEmployee(empRecord);
      if (empRecord.company_id) {
        const { data: comp } = await supabase.from('companies').select('name').eq('id', empRecord.company_id).single();
        if (comp?.name) setCompanyName(comp.name);
        await fetchPersonalRequestPipelines(empRecord.employee_code, empRecord.company_id);
      }
      setLoading(false);
    }
    verifyAndLoadTerminal();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleFilingLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !startDate || !endDate) return;
    setStatusMessage(null); setSubmittingAction(true);
    try {
      const { error } = await supabase.from('leave_requests').insert({
        company_id: employee.company_id, employee_name: employee.full_name, employee_code: employee.employee_code,
        leave_type: leaveType, start_date: startDate, end_date: endDate, status: 'pending'
      });
      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Leave application committed to the review queue successfully.' });
      setStartDate(''); setEndDate('');
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id);
    } catch (err: any) { setStatusMessage({ type: 'error', text: err.message }); }
    finally { setSubmittingAction(false); }
  };

  const handleFilingAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !advanceAmount) return;
    setStatusMessage(null); setSubmittingAction(true);
    try {
      const { error } = await supabase.from('advance_salary_requests').insert({
        company_id: employee.company_id, employee_name: employee.full_name, employee_code: employee.employee_code,
        requested_amount: parseInt(advanceAmount), reason: advanceReason.trim() || null, status: 'pending'
      });
      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Advance capital request ticket successfully provisioned.' });
      setAdvanceAmount(''); setAdvanceReason('');
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id);
    } catch (err: any) { setStatusMessage({ type: 'error', text: err.message }); }
    finally { setSubmittingAction(false); }
  };

  const handleFilingEod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !eodText.trim()) return;
    setStatusMessage(null); setSubmittingAction(true);
    try {
      if (assignedTasks) {
        const { error } = await supabase.from('daily_tasks').update({ eod_submission: eodText.trim(), submitted_at: new Date().toISOString() }).eq('id', assignedTasks.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_tasks').insert({
          company_id: employee.company_id, employee_code: employee.employee_code, employee_name: employee.full_name,
          task_priorities: ["General Operations Core Mapping"], eod_submission: eodText.trim(), submitted_at: new Date().toISOString()
        });
        if (error) throw error;
      }
      setStatusMessage({ type: 'success', text: 'EOD shift output verification statement logged cleanly.' });
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id);
    } catch (err: any) { setStatusMessage({ type: 'error', text: err.message }); }
    finally { setSubmittingAction(false); }
  };

  const handleFilingRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !regDate || !regReason.trim()) return;
    setStatusMessage(null); setSubmittingAction(true);
    try {
      const { error } = await supabase.from('attendance_regularizations').insert({
        company_id: employee.company_id, employee_code: employee.employee_code, employee_name: employee.full_name,
        target_date: regDate, requested_punch_in: regInTime, requested_punch_out: regOutTime, justification: regReason.trim(),
        status: 'pending'
      });
      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Attendance correction regularization request committed for review.' });
      setRegDate(''); setRegReason('');
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id);
    } catch (err: any) { setStatusMessage({ type: 'error', text: err.message }); }
    finally { setSubmittingAction(false); }
  };

  const handleUpdateAccountSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSavingAccount(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          phone_number: accountPhone.trim() || null,
          bank_account_number: accountBankNum.trim() || null,
          ifsc_code: accountIfscCode.toUpperCase().trim() || null
        })
        .eq('id', employee.id);

      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Account settings & disbursement routing ledger parameterized safely!' });
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Profile sync connection timeout fault.' });
    } finally {
      setSavingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase animate-pulse">Syncing User Context Terminal Node...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#111111] font-sans antialiased selection:bg-neutral-900 selection:text-white p-3 lg:p-6 space-y-6">
      
      {/* ENTERPRISE TOP NAV BAR */}
      <header className="bg-white border border-[#EEEEEE] sticky top-3 z-40 backdrop-blur-md rounded-xl max-w-7xl mx-auto h-20 flex items-center justify-between px-6 shadow-[0_2px_12px_-5px_rgba(0,0,0,0.02)]">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-neutral-900 text-white font-bold flex items-center justify-center rounded-xl text-sm tracking-tight">HB</div>
          <div>
            <p className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
              {employee?.employee_code} • Current Shift Rule: <span className="text-[#111111] font-black underline decoration-neutral-300 decoration-wavy">{employee?.company_shifts?.shift_name || 'Standard Context'}</span>
            </p>
            <h2 className="text-xs font-bold text-neutral-500 tracking-tight">{companyName}</h2>
          </div>
        </div>
        <button onClick={handleLogout} className="inline-flex items-center space-x-2 px-3 py-2 border border-[#EEEEEE] hover:border-neutral-300 rounded-lg text-xs font-bold text-neutral-600 hover:bg-neutral-50 cursor-pointer transition-all"><LogOut className="w-3.5 h-3.5 text-neutral-400" /> <span>Disconnect</span></button>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        {statusMessage && <div className={`p-4 text-xs font-bold rounded-xl bg-white border border-[#EEEEEE] shadow-2xs ${statusMessage.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{statusMessage.text}</div>}

        {/* DYNAMIC LEAVE BALANCE WALLETS GRID CONTAINER */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 border border-[#EEEEEE] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.008)] relative overflow-hidden">
            <span className="text-[9px] font-bold text-neutral-400 uppercase block mb-1 font-sans tracking-wider">Designation</span>
            <div className="text-xs font-bold text-neutral-900 truncate">{employee?.designation || 'Consultant'}</div>
            <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">{employee?.department || 'Operations'}</p>
          </div>
          <div className="bg-white p-5 border border-[#EEEEEE] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.008)]">
            <span className="text-[9px] font-bold text-neutral-400 uppercase block mb-1 font-sans tracking-wider">Sick Wallet</span>
            <div className="text-lg font-black font-mono text-neutral-900">{employee?.sick_leave_balance ?? 12} <span className="text-[10px] font-sans text-neutral-400 font-bold">Days Left</span></div>
          </div>
          <div className="bg-white p-5 border border-[#EEEEEE] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.008)]">
            <span className="text-[9px] font-bold text-neutral-400 uppercase block mb-1 font-sans tracking-wider">Casual Wallet</span>
            <div className="text-lg font-black font-mono text-neutral-900">{employee?.casual_leave_balance ?? 12} <span className="text-[10px] font-sans text-neutral-400 font-bold">Days Left</span></div>
          </div>
          <div className="bg-white p-5 border border-[#EEEEEE] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.008)]">
            <span className="text-[9px] font-bold text-neutral-400 uppercase block mb-1 font-sans tracking-wider">Paid Wallet</span>
            <div className="text-lg font-black font-mono text-neutral-900">{employee?.paid_leave_balance ?? 18} <span className="text-[10px] font-sans text-neutral-400 font-bold">Days Left</span></div>
          </div>
        </div>

        {/* INTERACTIVE WORK OVERVIEW PANEL */}
        <div className="bg-white p-6 border border-[#EEEEEE] rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.01)] grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 pb-2 border-b border-[#EEEEEE] block flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-neutral-400" /> Shift Objectives Matrix</span>
            {assignedTasks && assignedTasks.task_priorities?.length > 0 ? (
              <ul className="space-y-2">
                {assignedTasks.task_priorities.map((task: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-xs font-semibold text-neutral-700 bg-[#FCFCFC] border border-[#EEEEEE] p-3 rounded-xl shadow-3xs"><span className="w-4 h-4 rounded bg-neutral-900 text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{idx + 1}</span>{task}</li>
                ))}
              </ul>
            ) : <p className="text-[11px] text-neutral-400 font-bold uppercase py-4 text-center border border-dashed rounded-xl bg-[#FAF9F6]/40">No core priorities dispatched for this loop</p>}
          </div>

          <div className="md:col-span-7 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 pb-2 border-b border-[#EEEEEE] block flex items-center gap-1.5"><FileText className="w-4 h-4 text-neutral-400" /> File End-of-Day Output Summary</span>
            <form onSubmit={handleFilingEod} className="space-y-3">
              <textarea required rows={3} value={eodText} onChange={e => setEodText(e.target.value)} placeholder="Describe all technical checkpoints closed across this session timeline..." className="w-full text-xs p-3 border border-neutral-200 bg-[#FCFCFC] rounded-xl focus:outline-none focus:bg-white focus:border-neutral-900 transition-all resize-none shadow-3xs leading-relaxed" />
              <button type="submit" disabled={submittingAction} className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-5 py-2 rounded-xl uppercase tracking-wider cursor-pointer transition-colors block ml-auto shadow-2xs">Commit Daily Output Log</button>
            </form>
          </div>
        </div>

        {/* PAY SLIP DISBURSEMENT HISTORIC LEDGER */}
        {myPaySlips.length > 0 && (
          <div className="bg-white p-6 border border-[#EEEEEE] rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.01)] space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block border-b border-[#EEEEEE] pb-2 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-neutral-400" /> Disbursed Salary Slips Ledger
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPaySlips.map((slip) => (
                <div key={slip.id} className="p-4 border border-[#EEEEEE] rounded-xl bg-[#FCFCFC] font-mono text-xs font-medium text-neutral-500 space-y-2 shadow-3xs">
                  <div className="flex justify-between items-center font-sans"><span className="text-neutral-900 font-bold">{slip.month_year}</span><span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2 py-0.5 rounded flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Confirmed</span></div>
                  <div className="border-t border-dashed border-neutral-200 pt-2 space-y-1">
                    <div className="flex justify-between"><span>Gross Monthly Salary:</span><span className="text-neutral-900 font-bold">₹{Number(slip.gross_salary).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-neutral-400"><span>Statutory EPF (12%):</span><span>-₹{Number(slip.epf_deduction).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-neutral-400"><span>Statutory ESIC (0.75%):</span><span>-₹{Number(slip.esic_deduction).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between border-t border-neutral-200 pt-1.5 text-neutral-900 font-sans font-black text-sm"><span>Net Take-Home:</span><span>₹{Number(slip.net_take_home).toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FORMS PACK AT LOWER CONTAINER LAYOUT PANEL ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-6">
            
            {/* ABSENCE application */}
            <div className="bg-white p-5 border border-[#EEEEEE] rounded-xl shadow-2xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block border-b pb-2 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-neutral-400" /> Request Absence Clearance</span>
              <form onSubmit={handleFilingLeave} className="space-y-3">
                <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full text-xs font-semibold px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none bg-[#FCFCFC] cursor-pointer"><option value="Casual Leave">Casual Leave (CL)</option><option value="Sick Leave">Sick Leave (SL)</option><option value="Paid Leave">Paid Leave (PL)</option></select>
                <div className="grid grid-cols-2 gap-3"><input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs font-semibold px-3 py-2 border border-neutral-200 bg-[#FCFCFC] rounded-xl text-neutral-600 focus:outline-none" /><input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs font-semibold px-3 py-2 border border-neutral-200 bg-[#FCFCFC] rounded-xl text-neutral-600 focus:outline-none" /></div>
                <button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-colors cursor-pointer shadow-3xs">Dispatch Absence Ticket</button>
              </form>
            </div>

            {/* CAPITAL ADVANCE */}
            <div className="bg-white p-5 border border-[#EEEEEE] rounded-xl shadow-2xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block border-b pb-2 flex items-center gap-1.5"><Banknote className="w-4 h-4 text-neutral-400" /> Request Capital Advance</span>
              <form onSubmit={handleFilingAdvance} className="space-y-3">
                <input type="number" required max={employee?.monthly_salary} value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="Amount (INR)" className="w-full text-xs font-semibold px-3 py-2.5 border border-neutral-200 rounded-xl bg-[#FCFCFC] focus:outline-none" />
                <input type="text" value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} placeholder="Provide short justification reasoning context" className="w-full text-xs font-semibold px-3 py-2.5 border border-neutral-200 rounded-xl bg-[#FCFCFC] focus:outline-none" />
                <button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-colors cursor-pointer shadow-3xs">File Advance salary Claim</button>
              </form>
            </div>

            {/* REGULARIZATION FORM CONTAINER BOX */}
            <div className="bg-white p-5 border border-[#EEEEEE] rounded-xl shadow-2xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block border-b pb-2 flex items-center gap-1.5"><FolderLock className="w-4 h-4 text-neutral-400" /> Request Attendance Regularization</span>
              <form onSubmit={handleFilingRegularization} className="space-y-3">
                <input type="date" required value={regDate} onChange={e => setRegDate(e.target.value)} className="w-full text-xs font-semibold px-3 py-2 border border-neutral-200 bg-[#FCFCFC] rounded-xl text-neutral-600 focus:outline-none" />
                <div className="grid grid-cols-2 gap-3"><input type="time" required value={regInTime} onChange={e => setRegInTime(e.target.value)} className="text-xs font-semibold p-2 border border-neutral-200 bg-[#FCFCFC] rounded-xl" /><input type="time" required value={regOutTime} onChange={e => setRegOutTime(e.target.value)} className="text-xs font-semibold p-2 border border-neutral-200 bg-[#FCFCFC] rounded-xl" /></div>
                <input type="text" required value={regReason} onChange={e => setRegReason(e.target.value)} placeholder="Filing justification statement details..." className="w-full text-xs font-semibold px-3 py-2 border border-neutral-200 rounded-xl bg-[#FCFCFC] focus:outline-none" />
                <button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-colors cursor-pointer shadow-3xs">File Correction Claim</button>
              </form>
            </div>

            {/* NEW MODULE CORE ADDITION: INTERACTIVE ACCOUNT SETTINGS & BANKING GATEWAY PROFILE SUB-FORM */}
            <div className="bg-white p-5 border border-[#EEEEEE] rounded-xl shadow-2xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block border-b pb-2 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-neutral-400" /> Account Settings & Bank Details
              </span>
              <form onSubmit={handleUpdateAccountSettings} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wide">Personal Mobile Contact</label>
                  <input type="tel" value={accountPhone} onChange={e => setAccountPhone(e.target.value)} placeholder="+91 99000 12345" className="w-full text-xs font-semibold px-3 py-2 border border-neutral-200 rounded-xl bg-[#FCFCFC] focus:outline-none" />
                </div>
                <div className="bg-[#FAF9F6]/60 p-3.5 border border-[#EEEEEE] rounded-xl space-y-2.5">
                  <span className="text-[9px] font-bold text-neutral-400 block uppercase tracking-wider flex items-center gap-1"><Landmark className="w-3 h-3" /> Disbursement Routing Account</span>
                  <div className="space-y-2">
                    <input type="text" value={accountBankNum} onChange={e => setAccountBankNum(e.target.value)} placeholder="Bank Account Number Ledger" className="w-full text-xs font-bold px-2.5 py-1.5 border border-neutral-200 bg-white rounded-lg focus:outline-none" />
                    <input type="text" value={accountIfscCode} onChange={e => setAccountIfscCode(e.target.value)} placeholder="IFSC Routing Branch Code" className="w-full text-xs font-bold px-2.5 py-1.5 border border-neutral-200 bg-white rounded-lg focus:outline-none" />
                  </div>
                </div>
                <button type="submit" disabled={savingAccount} className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-colors shadow-3xs cursor-pointer">
                  {savingAccount ? 'Syncing Vault...' : 'Save Account Settings'}
                </button>
              </form>
            </div>

          </div>

          {/* HISTORICAL WORKFLOW MONITOR FEED DELAY */}
          <EmployeeMonitorFeed 
            myLeaves={myLeaves} 
            myAdvances={myAdvances} 
            myRegularizations={myRegularizations} 
          />

        </div>

      </main>
    </div>
  );
}