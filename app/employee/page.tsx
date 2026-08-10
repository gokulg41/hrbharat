"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import EmployeeMonitorFeed from './monitor-feed';

import {
  Calendar,
  Banknote,
  LogOut,
  FileText,
  FolderLock,
  Calculator,
  ShieldCheck,
  SlidersHorizontal,
  Landmark,
  ChevronRight,
  CheckSquare,
  Bell,
  Briefcase,
  CalendarCheck2,
  Palmtree,
  Wallet,
} from 'lucide-react';

export default function EmployeeTerminalDashboard() {
  const router = useRouter();

  const [employee, setEmployee] = useState<any>(null);
  const [companyName, setCompanyName] = useState('');
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [myAdvances, setMyAdvances] = useState<any[]>([]);
  const [myRegularizations, setMyRegularizations] = useState<any[]>([]);
  const [myPaySlips, setMyPaySlips] = useState<any[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<any>(null);
  const [eodText, setEodText] = useState('');

  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');

  const [regDate, setRegDate] = useState('');
  const [regInTime, setRegInTime] = useState('09:00');
  const [regOutTime, setRegOutTime] = useState('18:00');
  const [regReason, setRegReason] = useState('');

  const [accountPhone, setAccountPhone] = useState('');
  const [accountBankNum, setAccountBankNum] = useState('');
  const [accountIfscCode, setAccountIfscCode] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [submittingEod, setSubmittingEod] = useState(false);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPersonalRequestPipelines = async (empCode: string, compId: string, empId?: string) => {
    try {
      const [leavesRes, advancesRes, tasksRes, regularizationsRes, payrollRes, employeeFreshRes] = await Promise.all([
        supabase.from('leave_requests').select('*').eq('company_id', compId).eq('employee_id', empId ?? employee?.id).order('created_at', { ascending: false }),
        supabase.from('advance_salary_requests').select('*').eq('company_id', compId).eq('employee_id', empId ?? employee?.id).order('created_at', { ascending: false }),
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
        await fetchPersonalRequestPipelines(empRecord.employee_code, empRecord.company_id, empRecord.id);
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
    setStatusMessage(null); setSubmittingLeave(true);
    try {
      const { error } = await supabase.from('leave_requests').insert({
        company_id: employee.company_id, employee_id: employee.id,
        leave_type: leaveType, start_date: startDate, end_date: endDate,
        reason: leaveReason.trim(), status: 'Pending'
      });
      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Leave request submitted successfully.' });
      setStartDate(''); setEndDate(''); setLeaveReason('');
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id, employee.id);
    } catch (err: any) { setStatusMessage({ type: 'error', text: err.message }); }
    finally { setSubmittingLeave(false); }
  };

  const handleFilingAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !advanceAmount) return;
    setStatusMessage(null); setSubmittingAdvance(true);
    try {
      const { error } = await supabase.from('advance_salary_requests').insert({
        company_id: employee.company_id, employee_id: employee.id,
        requested_amount: parseInt(advanceAmount), reason: advanceReason.trim() || null, status: 'Pending'
      });
      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Advance salary request submitted successfully.' });
      setAdvanceAmount(''); setAdvanceReason('');
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id, employee.id);
    } catch (err: any) { setStatusMessage({ type: 'error', text: err.message }); }
    finally { setSubmittingAdvance(false); }
  };

  const handleFilingEod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !eodText.trim()) return;
    setStatusMessage(null); setSubmittingEod(true);
    try {
      if (assignedTasks) {
        const { error } = await supabase.from('daily_tasks').update({ eod_submission: eodText.trim(), submitted_at: new Date().toISOString() }).eq('id', assignedTasks.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_tasks').insert({
          company_id: employee.company_id, employee_code: employee.employee_code, employee_name: employee.full_name,
          task_priorities: ["General Operations"], eod_submission: eodText.trim(), submitted_at: new Date().toISOString()
        });
        if (error) throw error;
      }
      setStatusMessage({ type: 'success', text: 'Daily log submitted successfully.' });
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id, employee.id);
    } catch (err: any) { setStatusMessage({ type: 'error', text: err.message }); }
    finally { setSubmittingEod(false); }
  };

  const handleFilingRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !regDate || !regReason.trim()) return;
    setStatusMessage(null); setSubmittingReg(true);
    try {
      const { error } = await supabase.from('attendance_regularizations').insert({
        company_id: employee.company_id, employee_code: employee.employee_code, employee_name: employee.full_name,
        target_date: regDate, requested_punch_in: regInTime, requested_punch_out: regOutTime, justification: regReason.trim(),
        status: 'Pending'
      });
      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Attendance regularization request submitted.' });
      setRegDate(''); setRegReason('');
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id, employee.id);
    } catch (err: any) { setStatusMessage({ type: 'error', text: err.message }); }
    finally { setSubmittingReg(false); }
  };

  const handleUpdateAccountSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSavingAccount(true); setStatusMessage(null);
    try {
      const { error } = await supabase.from('employees').update({
        phone_number: accountPhone.trim() || null,
        bank_account_number: accountBankNum.trim() || null,
        ifsc_code: accountIfscCode.toUpperCase().trim() || null
      }).eq('id', employee.id);
      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Account settings updated successfully.' });
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id, employee.id);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally { setSavingAccount(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-canvas flex items-center justify-center">
        <p className="text-sm text-ink-600">Loading...</p>
      </div>
    );
  }

  // ── Shared design tokens ────────────
  const inputClass =
    "w-full text-sm px-3.5 py-2.5 border border-border-subtle rounded-lg bg-surface-card text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all";

  const labelClass =
    "block text-xs font-medium text-ink-600 mb-1.5 font-sans";

  const sectionTitleClass =
    "flex items-center gap-2 text-xs font-semibold text-ink-600 uppercase tracking-widest mb-4 font-sans";

  const notionBtn =
    "inline-flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors cursor-pointer";

  const notionBtnSmall =
    "inline-flex items-center gap-1 text-xs font-medium text-white bg-brand hover:bg-brand-hover disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors cursor-pointer";

  // Card-header accent button variants for the three coloured action cards
  const submitBtnBlue =
    "w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors cursor-pointer font-sans";
  const submitBtnGreen =
    "w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#15803D] hover:bg-[#116932] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors cursor-pointer font-sans";
  const submitBtnOrange =
    "w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#C2410C] hover:bg-[#9a3409] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors cursor-pointer font-sans";

  const cardClass = "bg-surface-card border border-border-subtle rounded-xl p-5 md:p-6 shadow-card";

  return (
    <div className="min-h-screen bg-surface-canvas font-sans text-ink-900">

      {/* ── TOP HEADER ── */}
      <header className="border-b border-border-subtle bg-surface-card sticky top-0 z-20">
        <div className="px-4 md:px-8 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">HB</span>
            </div>
            <span className="text-ink-400">/</span>
            <span className="font-semibold text-ink-900 truncate">Overview</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-status-danger text-white text-[9px] font-bold flex items-center justify-center">
                3
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 hover:bg-surface-card-hover px-3 py-2 rounded-lg transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-8 py-6 md:py-8 pb-16 space-y-6">

        {/* ── WELCOME ── */}
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-ink-900">
            Hello, {employee?.full_name || 'there'}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1.5 text-sm text-ink-600">
            {employee?.designation || 'Team Member'} <span className="mx-1 text-ink-400">·</span> {employee?.department || 'Operations'} <span className="mx-1 text-ink-400">·</span> {employee?.employee_code}
          </p>
        </div>

        {/* ── STATUS TOAST ── */}
        {statusMessage && (
          <div className={`text-sm px-4 py-2.5 rounded-lg ${
            statusMessage.type === 'success'
              ? 'bg-status-success-bg text-status-success'
              : 'bg-status-danger-bg text-status-danger'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* ── SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${cardClass} flex items-start gap-3.5`}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#F5F3FF', color: '#6D28D9' }}>
              <Briefcase className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-400 font-medium">Role</p>
              <p className="text-lg font-bold text-ink-900 truncate leading-snug">{employee?.designation || 'Employee'}</p>
              <p className="text-xs text-ink-600 truncate">{employee?.department || 'Operations'}</p>
            </div>
          </div>

          <div className={`${cardClass} flex items-start gap-3.5`}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
              <CalendarCheck2 className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-400 font-medium">Sick Leave</p>
              <p className="text-2xl font-bold text-ink-900 leading-snug">{employee?.sick_leave_balance ?? 12}</p>
              <p className="text-xs text-ink-600">days remaining</p>
            </div>
          </div>

          <div className={`${cardClass} flex items-start gap-3.5`}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
              <Palmtree className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-400 font-medium">Casual Leave</p>
              <p className="text-2xl font-bold text-ink-900 leading-snug">{employee?.casual_leave_balance ?? 12}</p>
              <p className="text-xs text-ink-600">days remaining</p>
            </div>
          </div>

          <div className={`${cardClass} flex items-start gap-3.5`}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
              <Wallet className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-400 font-medium">Paid Leave</p>
              <p className="text-2xl font-bold text-ink-900 leading-snug">{employee?.paid_leave_balance ?? 18}</p>
              <p className="text-xs text-ink-600">days remaining</p>
            </div>
          </div>
        </div>

        {/* ── MAIN GRID: forms (left) + recent activity (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">

            {/* LEAVE REQUEST */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-8 h-8 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-bold text-brand uppercase tracking-wide">Leave Request</h3>
              </div>
              <form onSubmit={handleFilingLeave} className="space-y-4">
                <div>
                  <label className={labelClass}>Leave Type</label>
                  <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className={`${inputClass} cursor-pointer`}>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>From</label>
                    <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>To</label>
                    <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Reason</label>
                  <input type="text" required value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Brief reason" className={inputClass} />
                </div>
                <button type="submit" disabled={submittingLeave} className={submitBtnBlue}>
                  {submittingLeave ? 'Submitting…' : 'Submit Request'}
                  {!submittingLeave && <ChevronRight className="w-4 h-4" />}
                </button>
              </form>
            </div>

            {/* ADVANCE SALARY */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
                  <Banknote className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: '#15803D' }}>Advance Salary</h3>
              </div>
              <form onSubmit={handleFilingAdvance} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Amount (INR)</label>
                    <input type="number" required max={employee?.monthly_salary} value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="0" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Reason</label>
                    <input type="text" value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} placeholder="Optional justification" className={inputClass} />
                  </div>
                </div>
                <button type="submit" disabled={submittingAdvance} className={submitBtnGreen}>
                  {submittingAdvance ? 'Submitting…' : 'Submit Claim'}
                  {!submittingAdvance && <ChevronRight className="w-4 h-4" />}
                </button>
              </form>
            </div>

            {/* ATTENDANCE CORRECTION */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
                  <FolderLock className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C2410C' }}>Attendance Correction</h3>
              </div>
              <form onSubmit={handleFilingRegularization} className="space-y-4">
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" required value={regDate} onChange={e => setRegDate(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Check In</label>
                    <input type="time" required value={regInTime} onChange={e => setRegInTime(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Check Out</label>
                    <input type="time" required value={regOutTime} onChange={e => setRegOutTime(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Reason</label>
                  <input type="text" required value={regReason} onChange={e => setRegReason(e.target.value)} placeholder="Justification" className={inputClass} />
                </div>
                <button type="submit" disabled={submittingReg} className={submitBtnOrange}>
                  {submittingReg ? 'Submitting…' : 'Submit Correction'}
                  {!submittingReg && <ChevronRight className="w-4 h-4" />}
                </button>
              </form>
            </div>

            {/* ACCOUNT & BANKING */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-8 h-8 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-bold text-brand uppercase tracking-wide">Account &amp; Banking</h3>
              </div>
              <form onSubmit={handleUpdateAccountSettings} className="space-y-4">
                <div>
                  <label className={labelClass}>Mobile Number</label>
                  <input type="tel" value={accountPhone} onChange={e => setAccountPhone(e.target.value)} placeholder="+91 98000 00000" className={inputClass} />
                </div>
                <div className="p-4 bg-surface-card-hover rounded-lg border border-border-subtle space-y-3">
                  <p className="text-[11px] font-bold text-ink-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" /> Bank Details
                  </p>
                  <input type="text" value={accountBankNum} onChange={e => setAccountBankNum(e.target.value)} placeholder="Account number" className={inputClass} />
                  <input type="text" value={accountIfscCode} onChange={e => setAccountIfscCode(e.target.value)} placeholder="IFSC code" className={inputClass} />
                </div>
                <button type="submit" disabled={savingAccount} className={submitBtnBlue}>
                  {savingAccount ? 'Saving…' : 'Save Details'}
                  {!savingAccount && <ChevronRight className="w-4 h-4" />}
                </button>
              </form>
            </div>

          </div>

          {/* RECENT ACTIVITY */}
          <EmployeeMonitorFeed
            myLeaves={myLeaves}
            myAdvances={myAdvances}
            myRegularizations={myRegularizations}
          />
        </div>

        {/* ── SECONDARY SECTIONS (preserved functionality, not part of the reference layout) ── */}
        <div className="pt-2 space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border-subtle" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">More</span>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today's Tasks */}
            <div className={cardClass}>
              <div className={sectionTitleClass}>
                <CheckSquare className="w-3.5 h-3.5" /> Today's Tasks
              </div>
              {assignedTasks && assignedTasks.task_priorities?.length > 0 ? (
                <ul className="space-y-1.5">
                  {assignedTasks.task_priorities.map((task: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-ink-900 hover:bg-surface-card-hover px-2 py-2 rounded-md transition-colors">
                      <span className="mt-0.5 w-4 h-4 rounded-sm border-2 border-border-subtle bg-surface-card shrink-0 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-ink-600">{idx + 1}</span>
                      </span>
                      {task}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 text-center rounded-md border border-dashed border-border-subtle">
                  <p className="text-sm text-ink-400">No tasks assigned for today</p>
                </div>
              )}
            </div>

            {/* EOD Report */}
            <div className={cardClass}>
              <div className={sectionTitleClass}>
                <FileText className="w-3.5 h-3.5" /> End of Day Report
              </div>
              <form onSubmit={handleFilingEod} className="space-y-3">
                <textarea
                  required
                  rows={5}
                  value={eodText}
                  onChange={e => setEodText(e.target.value)}
                  placeholder="What did you complete today? Add any blockers or notes..."
                  className="w-full text-sm px-3 py-2.5 border border-border-subtle rounded-md bg-surface-card text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all resize-none"
                />
                <div className="flex justify-end">
                  <button type="submit" disabled={submittingEod} className={notionBtnSmall}>
                    {submittingEod ? 'Submitting...' : 'Submit Report'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Pay Slips */}
          {myPaySlips.length > 0 && (
            <div className={cardClass}>
              <div className={sectionTitleClass}>
                <Calculator className="w-3.5 h-3.5" /> Salary Slips
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myPaySlips.map((slip) => (
                  <div key={slip.id} className="border border-border-subtle rounded-md px-4 py-4 hover:bg-surface-card-hover transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-ink-900">{slip.month_year}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-status-success bg-status-success-bg px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> Confirmed
                      </span>
                    </div>
                    <div className="space-y-1 text-xs border-t border-border-subtle pt-3">
                      <div className="flex justify-between"><span className="text-ink-600">Gross Salary</span><span className="font-medium text-ink-900">₹{Number(slip.gross_salary).toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span className="text-ink-600">EPF (12%)</span><span className="text-ink-600">−₹{Number(slip.epf_deduction).toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span className="text-ink-600">ESIC (0.75%)</span><span className="text-ink-600">−₹{Number(slip.esic_deduction).toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between pt-2 border-t border-border-subtle text-sm font-semibold text-ink-900">
                        <span>Net Take-Home</span><span>₹{Number(slip.net_take_home).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}