"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Banknote, 
  Briefcase, 
  IndianRupee, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  LogOut,
  User,
  CreditCard,
  Landmark,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';

export default function EmployeeTerminalDashboard() {
  const router = useRouter();
  
  // Terminal Identity & Data States
  const [employee, setEmployee] = useState<any>(null);
  const [companyName, setCompanyName] = useState('Enterprise Member Terminal');
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [myAdvances, setMyAdvances] = useState<any[]>([]);
  
  // NEW: Daily Tasks & EOD State Hooks
  const [assignedTasks, setAssignedTasks] = useState<any>(null);
  const [eodText, setEodText] = useState('');

  // Form Submission Inputs State
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');

  // Status Response Handlers
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPersonalRequestPipelines = async (empCode: string, compId: string) => {
    const [leavesRes, advancesRes, tasksRes] = await Promise.all([
      supabase.from('leave_requests').select('*').eq('company_id', compId).eq('employee_code', empCode).order('created_at', { ascending: false }),
      supabase.from('advance_salary_requests').select('*').eq('company_id', compId).eq('employee_code', empCode).order('created_at', { ascending: false }),
      // Fetch current active task node for today
      supabase.from('daily_tasks').select('*').eq('company_id', compId).eq('employee_code', empCode).order('created_at', { ascending: false }).limit(1).maybeSingle()
    ]);
    if (leavesRes.data) setMyLeaves(leavesRes.data);
    if (advancesRes.data) setMyAdvances(advancesRes.data);
    if (tasksRes.data) {
      setAssignedTasks(tasksRes.data);
      if (tasksRes.data.eod_submission) {
        setEodText(tasksRes.data.eod_submission);
      }
    }
  };

  useEffect(() => {
    async function verifyAndLoadTerminal() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: empRecord } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email?.toLowerCase().trim())
        .single();

      if (!empRecord) {
        setLoading(false);
        return;
      }

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

  const handleFilingLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !startDate || !endDate) return;

    setStatusMessage(null);
    setSubmittingAction(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          company_id: employee.company_id,
          employee_name: employee.full_name,
          employee_code: employee.employee_code,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          status: 'pending'
        });

      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Leave application locked into review queue.' });
      setStartDate(''); setEndDate('');
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Filing error.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleFilingAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !advanceAmount) return;

    setStatusMessage(null);
    setSubmittingAction(true);
    try {
      const { error } = await supabase
        .from('advance_salary_requests')
        .insert({
          company_id: employee.company_id,
          employee_name: employee.full_name,
          employee_code: employee.employee_code,
          requested_amount: parseInt(advanceAmount),
          reason: advanceReason.trim() || null,
          status: 'pending'
        });

      if (error) throw error;
      setStatusMessage({ type: 'success', text: 'Financial advance ticket dispatched successfully.' });
      setAdvanceAmount(''); setAdvanceReason('');
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Claim error.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  // NEW: Submit End-of-Day EOD Narrative
  const handleFilingEod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !eodText.trim()) return;

    setStatusMessage(null);
    setSubmittingAction(true);

    try {
      if (assignedTasks) {
        // If an administrative priority record row already exists, update it cleanly
        const { error } = await supabase
          .from('daily_tasks')
          .update({
            eod_submission: eodText.trim(),
            submitted_at: new Date().toISOString()
          })
          .eq('id', assignedTasks.id);

        if (error) throw error;
      } else {
        // If no explicit priority was pushed by the admin yet, create a raw entry
        const { error } = await supabase
          .from('daily_tasks')
          .insert({
            company_id: employee.company_id,
            employee_code: employee.employee_code,
            employee_name: employee.full_name,
            task_priorities: ["General Structural Operations"],
            eod_submission: eodText.trim(),
            submitted_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      setStatusMessage({ type: 'success', text: 'End-of-Day output verification logged cleanly to administration.' });
      await fetchPersonalRequestPipelines(employee.employee_code, employee.company_id);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to submit log entry.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/80">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100/80">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100/80 animate-pulse">Under Review</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-2">
          <Activity className="w-5 h-5 text-slate-900 animate-spin mx-auto" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Securing Member Environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] antialiased text-slate-800 font-sans selection:bg-slate-900 selection:text-white">
      
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black tracking-tight text-md shadow-sm">HB</div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">{employee.employee_code}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">{companyName}</h2>
            </div>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center space-x-2 px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer shadow-3xs">
            <LogOut className="w-3.5 h-3.5 text-slate-400" /> <span className="hidden sm:inline">Sign Out Terminal</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
        
        {statusMessage && (
          <div className={`p-4 text-xs font-bold rounded-2xl flex items-center space-x-2.5 border shadow-3xs ${statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
            <ShieldCheck className="w-4 h-4 shrink-0" /> <span>{statusMessage.text}</span>
          </div>
        )}

        {/* TOP STATISTICS DECK ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 border border-slate-200/70 rounded-2xl shadow-3xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Corporate Designation</span>
            <div className="text-lg font-black text-slate-900 tracking-tight mt-1">{employee.designation || 'Roster Specialist'}</div>
            <p className="text-[11px] text-slate-400 font-medium mt-2">Division: {employee.department || 'Operations'}</p>
          </div>
          <div className="bg-white p-6 border border-slate-200/70 rounded-2xl shadow-3xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Gross Remuneration</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">₹{Number(employee.monthly_salary || 0).toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-emerald-600 font-bold mt-2">Assured Monthly Credit Ledger</p>
          </div>
          <div className="bg-white p-6 border border-slate-200/70 rounded-2xl shadow-3xs sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Active Claims</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">{myLeaves.filter(l=>l.status==='pending').length + myAdvances.filter(a=>a.status==='pending').length} <span className="text-xs font-normal text-slate-400">Tickets</span></div>
            <p className="text-[11px] text-slate-400 font-medium mt-2">Aggregated compliance queues</p>
          </div>
        </div>

        {/* INTERACTIVE DAILY TASK ENGAGEMENT SECTION */}
        <div className="bg-white p-6 border border-slate-200/60 rounded-3xl shadow-3xs grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* ASSIGNED PRIORITIES VIEW */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <ClipboardList className="w-4 h-4 text-slate-900" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Today's Focus Track</h3>
            </div>
            
            {assignedTasks && assignedTasks.task_priorities?.length > 0 ? (
              <ul className="space-y-2.5">
                {assignedTasks.task_priorities.map((task: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-xl shadow-3xs">
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">{idx + 1}</span>
                    <span className="leading-normal">{task}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">No administrative tasks assigned for this slot</p>
              </div>
            )}
          </div>

          {/* EOD SUBMISSION TERMINATION AREA */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-slate-900" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">File End-of-Day Output Summary</h3>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Before checking out or closing down your dashboard node, write a concise log summary detailing all structural engineering checkpoints completed today.
            </p>

            <form onSubmit={handleFilingEod} className="space-y-3">
              <textarea 
                required 
                rows={4}
                value={eodText}
                onChange={e => setEodText(e.target.value)}
                placeholder="Type your daily output logs here..." 
                className="w-full text-xs font-bold p-3 border border-slate-200 rounded-xl bg-slate-50/40 focus:outline-none focus:bg-white focus:border-slate-900 transition-all resize-none leading-relaxed"
              />
              <button 
                type="submit" 
                disabled={submittingAction || !eodText.trim()}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-black px-6 py-2.5 rounded-xl tracking-wider uppercase shadow-3xs cursor-pointer transition-all"
              >
                {submittingAction ? 'Syncing Output Log...' : 'Commit Daily EOD Log'}
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEAVE & ADVANCE FORMS PANEL */}
          <div className="lg:col-span-5 space-y-8">
            {/* LEAVE FORM */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-3xs space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100"><Calendar className="w-4 h-4 text-slate-900" /> <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Request Absences Clearance</h3></div>
              <form onSubmit={handleFilingLeave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 block tracking-wide">Leave Category</label>
                  <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:border-slate-900"><option value="Casual Leave">Casual Leave (CL)</option><option value="Sick Leave">Sick Leave (SL)</option></select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none" />
                  <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none" />
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white text-xs font-black py-2.5 rounded-xl tracking-wider uppercase">District Leave</button>
              </form>
            </div>

            {/* ADVANCE FORM */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-3xs space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100"><Banknote className="w-4 h-4 text-slate-900" /> <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Request Salary Advance</h3></div>
              <form onSubmit={handleFilingAdvance} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-black">₹</span>
                  <input type="number" required max={employee.monthly_salary} value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="Amount (INR)" className="w-full text-xs font-bold pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:border-slate-900" />
                </div>
                <input type="text" value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} placeholder="Reason statement" className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none" />
                <button type="submit" className="w-full bg-slate-900 text-white text-xs font-black py-2.5 rounded-xl tracking-wider uppercase">File Capital Claim</button>
              </form>
            </div>
          </div>

          {/* APPLICATION MONITOR FEEDS CONTAINER */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/70 shadow-3xs overflow-hidden">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 font-black text-xs uppercase tracking-widest text-slate-900">Application Dispatch Monitor Feed</div>
            <div className="p-6 space-y-6">
              {/* LEAVES STATUS QUEUE */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Leave Applications</h4>
                {myLeaves.map(leave => (
                  <div key={leave.id} className="p-3 bg-slate-50/50 border rounded-xl flex items-center justify-between text-xs font-bold">
                    <div><p>{leave.leave_type}</p><p className="text-[9px] text-slate-400 font-mono">{leave.start_date} to {leave.end_date}</p></div>
                    {getStatusBadge(leave.status)}
                  </div>
                ))}
              </div>

              {/* ADVANCES STATUS QUEUE */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Capital Advances</h4>
                {myAdvances.map(adv => (
                  <div key={adv.id} className="p-3 bg-slate-50/50 border rounded-xl flex items-center justify-between text-xs font-bold">
                    <div><p>₹{adv.requested_amount.toLocaleString('en-IN')}</p><p className="text-[10px] text-slate-400 font-medium truncate max-w-xs">"{adv.reason || 'N/A'}"</p></div>
                    {getStatusBadge(adv.status)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}