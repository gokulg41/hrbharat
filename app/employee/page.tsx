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
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
          <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">Loading</p>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    );
  }

  const inputClass = "w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300";
  const labelClass = "block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5";
  const cardClass = "bg-white border border-gray-100 rounded-xl p-5 space-y-4";
  const sectionTitleClass = "text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-gray-100";

  return (
    <div className="min-h-screen bg-gray-50/50" data-theme="light">

      {/* TOP NAV */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center">
              <span className="text-white text-[10px] font-bold tracking-tight">HB</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div>
              <p className="text-xs font-semibold text-gray-900">{employee?.full_name || 'Employee'}</p>
              <p className="text-[10px] text-gray-400">{companyName} · {employee?.employee_code}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* STATUS MESSAGE */}
        {statusMessage && (
          <div className={`px-4 py-3 rounded-lg text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* STATS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={cardClass}>
            <p className={labelClass}>Role</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{employee?.designation || 'Consultant'}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{employee?.department || 'Operations'}</p>
          </div>
          <div className={cardClass}>
            <p className={labelClass}>Sick Leave</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{employee?.sick_leave_balance ?? 12}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">days remaining</p>
          </div>
          <div className={cardClass}>
            <p className={labelClass}>Casual Leave</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{employee?.casual_leave_balance ?? 12}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">days remaining</p>
          </div>
          <div className={cardClass}>
            <p className={labelClass}>Paid Leave</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{employee?.paid_leave_balance ?? 18}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">days remaining</p>
          </div>
        </div>

        {/* TASKS + EOD */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tasks */}
          <div className="space-y-4">
            <p className={sectionTitleClass}><ClipboardList className="w-3.5 h-3.5" /> Today's Tasks</p>
            {assignedTasks && assignedTasks.task_priorities?.length > 0 ? (
              <ul className="space-y-2">
                {assignedTasks.task_priorities.map((task: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 bg-gray-50 border border-gray-100 px-3 py-2.5 rounded-lg">
                    <span className="w-4 h-4 rounded bg-gray-900 text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                    {task}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center border border-dashed border-gray-200 rounded-lg">
                <p className="text-[11px] text-gray-400">No tasks assigned for today</p>
              </div>
            )}
          </div>

          {/* EOD */}
          <div className="space-y-4">
            <p className={sectionTitleClass}><FileText className="w-3.5 h-3.5" /> End of Day Report</p>
            <form onSubmit={handleFilingEod} className="space-y-3">
              <textarea
                required
                rows={4}
                value={eodText}
                onChange={e => setEodText(e.target.value)}
                placeholder="Summarize what you completed today..."
                className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 transition-colors resize-none placeholder:text-gray-300"
              />
              <button
                type="submit"
                disabled={submittingEod}
                className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                {submittingEod ? 'Submitting...' : 'Submit Report'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

        {/* PAY SLIPS */}
        {myPaySlips.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
            <p className={sectionTitleClass}><Calculator className="w-3.5 h-3.5" /> Salary Slips</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPaySlips.map((slip) => (
                <div key={slip.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">{slip.month_year}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Confirmed
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs">
                    <div className="flex justify-between text-gray-500"><span>Gross Salary</span><span className="font-medium text-gray-900">₹{Number(slip.gross_salary).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-gray-400"><span>EPF (12%)</span><span>−₹{Number(slip.epf_deduction).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-gray-400"><span>ESIC (0.75%)</span><span>−₹{Number(slip.esic_deduction).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-100 text-sm font-semibold text-gray-900"><span>Net Take-Home</span><span>₹{Number(slip.net_take_home).toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FORMS + FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4">

            {/* LEAVE REQUEST */}
            <div className={cardClass}>
              <p className={sectionTitleClass}><Calendar className="w-3.5 h-3.5" /> Leave Request</p>
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
                <button type="submit" disabled={submittingLeave} className="w-full text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40 py-2.5 rounded-lg transition-colors cursor-pointer">
                  {submittingLeave ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>

            {/* ADVANCE SALARY */}
            <div className={cardClass}>
              <p className={sectionTitleClass}><Banknote className="w-3.5 h-3.5" /> Advance Salary</p>
              <form onSubmit={handleFilingAdvance} className="space-y-3">
                <div>
                  <label className={labelClass}>Amount (INR)</label>
                  <input type="number" required max={employee?.monthly_salary} value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Reason</label>
                  <input type="text" value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} placeholder="Optional justification" className={inputClass} />
                </div>
                <button type="submit" disabled={submittingAdvance} className="w-full text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40 py-2.5 rounded-lg transition-colors cursor-pointer">
                  {submittingAdvance ? 'Submitting...' : 'Submit Claim'}
                </button>
              </form>
            </div>

            {/* REGULARIZATION */}
            <div className={cardClass}>
              <p className={sectionTitleClass}><FolderLock className="w-3.5 h-3.5" /> Attendance Correction</p>
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
                <button type="submit" disabled={submittingReg} className="w-full text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40 py-2.5 rounded-lg transition-colors cursor-pointer">
                  {submittingReg ? 'Submitting...' : 'Submit Correction'}
                </button>
              </form>
            </div>

            {/* ACCOUNT SETTINGS */}
            <div className={cardClass}>
              <p className={sectionTitleClass}><SlidersHorizontal className="w-3.5 h-3.5" /> Account & Banking</p>
              <form onSubmit={handleUpdateAccountSettings} className="space-y-3">
                <div>
                  <label className={labelClass}>Mobile Number</label>
                  <input type="tel" value={accountPhone} onChange={e => setAccountPhone(e.target.value)} placeholder="+91 98000 00000" className={inputClass} />
                </div>
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Landmark className="w-3 h-3" /> Bank Details
                  </p>
                  <input type="text" value={accountBankNum} onChange={e => setAccountBankNum(e.target.value)} placeholder="Account number" className={inputClass} />
                  <input type="text" value={accountIfscCode} onChange={e => setAccountIfscCode(e.target.value)} placeholder="IFSC code" className={inputClass} />
                </div>
                <button type="submit" disabled={savingAccount} className="w-full text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40 py-2.5 rounded-lg transition-colors cursor-pointer">
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