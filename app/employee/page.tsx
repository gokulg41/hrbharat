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
  ClipboardList,
  FolderLock,
  Calculator,
  ShieldCheck,
  SlidersHorizontal,
  Landmark,
  ChevronRight,
  User,
  CheckSquare,
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#9b9a97]">Loading...</p>
      </div>
    );
  }

  // ── Notion-style design tokens ─────────────────────────────────────────
  // Background: #ffffff  Surface: #f7f6f3  Border: #e9e9e7
  // Text primary: #37352f  Text secondary: #787774  Text muted: #9b9a97
  // Accent: #2eaadc (Notion blue)  Hover bg: #f1f1ef

  const inputClass =
    "w-full text-sm px-2 py-1.5 border border-[#e9e9e7] rounded-md bg-white text-[#37352f] placeholder:text-[#c1c0bb] focus:outline-none focus:ring-2 focus:ring-[#2eaadc]/30 focus:border-[#2eaadc] transition-all";

  const labelClass =
    "block text-xs font-medium text-[#787774] mb-1";

  const sectionTitleClass =
    "flex items-center gap-2 text-xs font-semibold text-[#9b9a97] uppercase tracking-widest mb-4";

  const notionBtn =
    "inline-flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-[#37352f] hover:bg-[#2d2c28] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors cursor-pointer";

  const notionBtnSmall =
    "inline-flex items-center gap-1 text-xs font-medium text-white bg-[#37352f] hover:bg-[#2d2c28] disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors cursor-pointer";

  return (
    <div className="min-h-screen bg-white font-sans text-[#37352f]">

      {/* ── SIDEBAR-STYLE TOP BAR ── */}
      <header className="border-b border-[#e9e9e7] bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-8 h-12 flex items-center justify-between">
          {/* Breadcrumb-style identity */}
          <div className="flex items-center gap-1.5 text-sm text-[#787774]">
            <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">HB</span>
            </div>
            <span className="text-[#c1c0bb]">/</span>
            <span className="font-medium text-[#37352f]">{companyName || 'Workspace'}</span>
            <span className="text-[#c1c0bb]">/</span>
            <span className="text-[#787774]">{employee?.full_name || 'Employee'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[#9b9a97] hover:text-[#37352f] hover:bg-[#f1f1ef] px-2 py-1 rounded transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10 space-y-10">

        {/* ── PAGE TITLE ── */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#37352f]">
            {employee?.full_name || 'Employee Portal'}
          </h1>
          <p className="mt-1 text-sm text-[#9b9a97]">
            {employee?.designation || 'Team Member'} · {employee?.department || 'Operations'} · {employee?.employee_code}
          </p>
        </div>

        {/* ── STATUS TOAST ── */}
        {statusMessage && (
          <div className={`text-sm px-4 py-2.5 rounded-md border ${
            statusMessage.type === 'success'
              ? 'bg-[#edfbf3] border-[#b7ebcf] text-[#0f7b43]'
              : 'bg-[#fdecea] border-[#f5c0bb] text-[#d44c47]'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* ── STAT CALLOUTS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#e9e9e7] rounded-lg overflow-hidden border border-[#e9e9e7]">
          {[
            { label: 'Role', value: employee?.designation || 'Consultant', sub: employee?.department || 'Operations', big: false },
            { label: 'Sick Leave', value: employee?.sick_leave_balance ?? 12, sub: 'days remaining', big: true },
            { label: 'Casual Leave', value: employee?.casual_leave_balance ?? 12, sub: 'days remaining', big: true },
            { label: 'Paid Leave', value: employee?.paid_leave_balance ?? 18, sub: 'days remaining', big: true },
          ].map((stat, i) => (
            <div key={i} className="bg-white px-5 py-4">
              <p className="text-xs text-[#9b9a97] mb-1">{stat.label}</p>
              <p className={`font-semibold text-[#37352f] truncate ${stat.big ? 'text-2xl' : 'text-sm'}`}>{stat.value}</p>
              <p className="text-xs text-[#c1c0bb] mt-0.5 truncate">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* ── DIVIDER ── */}
        <hr className="border-[#e9e9e7]" />

        {/* ── TASKS + EOD ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Today's Tasks */}
          <div>
            <div className={sectionTitleClass}>
              <CheckSquare className="w-3.5 h-3.5" /> Today's Tasks
            </div>
            {assignedTasks && assignedTasks.task_priorities?.length > 0 ? (
              <ul className="space-y-1.5">
                {assignedTasks.task_priorities.map((task: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-[#37352f] hover:bg-[#f7f6f3] px-2 py-2 rounded-md transition-colors">
                    <span className="mt-0.5 w-4 h-4 rounded-sm border-2 border-[#e9e9e7] bg-white shrink-0 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-[#9b9a97]">{idx + 1}</span>
                    </span>
                    {task}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center rounded-md border border-dashed border-[#e9e9e7]">
                <p className="text-sm text-[#c1c0bb]">No tasks assigned for today</p>
              </div>
            )}
          </div>

          {/* EOD Report */}
          <div>
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
                className="w-full text-sm px-3 py-2.5 border border-[#e9e9e7] rounded-md bg-white text-[#37352f] placeholder:text-[#c1c0bb] focus:outline-none focus:ring-2 focus:ring-[#2eaadc]/30 focus:border-[#2eaadc] transition-all resize-none"
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

        <hr className="border-[#e9e9e7]" />

        {/* ── PAY SLIPS ── */}
        {myPaySlips.length > 0 && (
          <div>
            <div className={sectionTitleClass}>
              <Calculator className="w-3.5 h-3.5" /> Salary Slips
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myPaySlips.map((slip) => (
                <div key={slip.id} className="border border-[#e9e9e7] rounded-md px-4 py-4 hover:bg-[#f7f6f3] transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-[#37352f]">{slip.month_year}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0f7b43] bg-[#edfbf3] border border-[#b7ebcf] px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Confirmed
                    </span>
                  </div>
                  <div className="space-y-1 text-xs border-t border-[#e9e9e7] pt-3">
                    <div className="flex justify-between"><span className="text-[#787774]">Gross Salary</span><span className="font-medium text-[#37352f]">₹{Number(slip.gross_salary).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span className="text-[#9b9a97]">EPF (12%)</span><span className="text-[#9b9a97]">−₹{Number(slip.epf_deduction).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span className="text-[#9b9a97]">ESIC (0.75%)</span><span className="text-[#9b9a97]">−₹{Number(slip.esic_deduction).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between pt-2 border-t border-[#e9e9e7] text-sm font-semibold text-[#37352f]">
                      <span>Net Take-Home</span><span>₹{Number(slip.net_take_home).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <hr className="border-[#e9e9e7]" />

        {/* ── FORMS + FEED GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-8">

            {/* LEAVE REQUEST */}
            <div>
              <div className={sectionTitleClass}>
                <Calendar className="w-3.5 h-3.5" /> Leave Request
              </div>
              <form onSubmit={handleFilingLeave} className="space-y-3">
                <div>
                  <label className={labelClass}>Leave Type</label>
                  <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className={inputClass}>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                <button type="submit" disabled={submittingLeave} className={`w-full ${notionBtn}`}>
                  {submittingLeave ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>

            {/* ADVANCE SALARY */}
            <div>
              <div className={sectionTitleClass}>
                <Banknote className="w-3.5 h-3.5" /> Advance Salary
              </div>
              <form onSubmit={handleFilingAdvance} className="space-y-3">
                <div>
                  <label className={labelClass}>Amount (INR)</label>
                  <input type="number" required max={employee?.monthly_salary} value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Reason</label>
                  <input type="text" value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} placeholder="Optional justification" className={inputClass} />
                </div>
                <button type="submit" disabled={submittingAdvance} className={`w-full ${notionBtn}`}>
                  {submittingAdvance ? 'Submitting...' : 'Submit Claim'}
                </button>
              </form>
            </div>

            {/* REGULARIZATION */}
            <div>
              <div className={sectionTitleClass}>
                <FolderLock className="w-3.5 h-3.5" /> Attendance Correction
              </div>
              <form onSubmit={handleFilingRegularization} className="space-y-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" required value={regDate} onChange={e => setRegDate(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                <button type="submit" disabled={submittingReg} className={`w-full ${notionBtn}`}>
                  {submittingReg ? 'Submitting...' : 'Submit Correction'}
                </button>
              </form>
            </div>

            {/* ACCOUNT SETTINGS */}
            <div>
              <div className={sectionTitleClass}>
                <SlidersHorizontal className="w-3.5 h-3.5" /> Account & Banking
              </div>
              <form onSubmit={handleUpdateAccountSettings} className="space-y-3">
                <div>
                  <label className={labelClass}>Mobile Number</label>
                  <input type="tel" value={accountPhone} onChange={e => setAccountPhone(e.target.value)} placeholder="+91 98000 00000" className={inputClass} />
                </div>
                <div className="p-3 bg-[#f7f6f3] rounded-md border border-[#e9e9e7] space-y-2">
                  <p className="text-[10px] font-semibold text-[#9b9a97] uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3 h-3" /> Bank Details
                  </p>
                  <input type="text" value={accountBankNum} onChange={e => setAccountBankNum(e.target.value)} placeholder="Account number" className={inputClass} />
                  <input type="text" value={accountIfscCode} onChange={e => setAccountIfscCode(e.target.value)} placeholder="IFSC code" className={inputClass} />
                </div>
                <button type="submit" disabled={savingAccount} className={`w-full ${notionBtn}`}>
                  {savingAccount ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </div>

          </div>

          {/* MONITOR FEED */}
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