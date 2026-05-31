"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Calendar, Check, X, AlertCircle, Clock, UserCheck } from 'lucide-react';

export default function IntegratedLeaveManagementEngine() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dynamic state parameters for filing a brand new time-off request right from the view
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('Casual');
  const [reason, setReason] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const fetchLeaveSystemState = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) return;

    // 1. Fetch historical and active request logs
    const { data: requestList } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    // 2. Fetch employee available balance charts
    const { data: balanceList } = await supabase
      .from('leave_balances')
      .select('*, employees(full_name, employee_code)')
      .eq('company_id', profile.company_id);

    setRequests(requestList || []);
    setBalances(balanceList || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaveSystemState();
  }, []);

  const handleCreateLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setModalSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single();

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    await supabase.from('leave_requests').insert({
      employee_id: user?.id,
      company_id: profile?.company_id,
      full_name: profile?.full_name,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      leave_type: leaveType,
      reason: reason,
      status: 'Pending'
    });

    setStartDate(''); setEndDate(''); setReason('');
    setShowModal(false);
    setModalSubmitting(false);
    fetchLeaveSystemState();
  };

  const handleUpdateStatus = async (requestId: string, employeeId: string, totalDays: number, nextStatus: 'Approved' | 'Rejected') => {
    setActionLoading(requestId);
    
    const { error: requestError } = await supabase
      .from('leave_requests')
      .update({ status: nextStatus })
      .eq('id', requestId);

    if (!requestError && nextStatus === 'Approved') {
      // Deduct the approved days atomically from the tracking ledger table row
      await supabase.rpc('decrement_leave_balance', { 
        emp_id: employeeId, 
        days_count: totalDays 
      });
    }

    setActionLoading(null);
    fetchLeaveSystemState();
  };

  if (loading) return <div className="p-6 text-xs text-slate-400 font-bold animate-pulse">SYNCHRONIZING ORGANIZATIONAL LEAVE MATRIX NODES...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Time-Off & Leave Engine</h2>
          <p className="text-xs text-slate-500 font-medium">Audit employee vacation balances, sick leaves, and pending absence requests</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-all">
          Request Time Off
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: ACTIVE LEAVE BALANCES LEDGER CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm lg:col-span-1 space-y-4">
          <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-3">
            <UserCheck className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Available Balances</h3>
          </div>

          {balances.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 text-center py-4">No active balances initialized.</p>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100">
              {balances.map((bal: any) => (
                <div key={bal.id} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-black text-slate-900">{bal.employees?.full_name || 'Staff'}</p>
                    <p className="text-[10px] text-slate-400 font-mono font-bold">{bal.employees?.employee_code || 'STAFF NODE'}</p>
                  </div>
                  <div className="text-right font-semibold text-slate-700">
                    <span className="text-teal-700 font-black text-sm">{bal.remaining_leaves}</span> <span className="text-[10px] text-slate-400 font-medium">days left</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INTERACTIVE REQUEST AUDIT QUEUE */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Time-Off Audit Log</h3>
            <p className="text-[11px] text-slate-400 font-medium">Manage pending leave requests submitted by team personnel</p>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center space-y-1">
              <Calendar className="w-5 h-5 text-slate-300" />
              <span>No time-off requests filed by staff members yet.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Duration & Type</th>
                    <th className="py-3 px-4">Reason Details</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-all font-medium">
                      <td className="py-3.5 px-4 font-black text-slate-900">{req.full_name}</td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded-md text-[10px]">{req.leave_type}</span>
                        <p className="text-slate-500 font-semibold text-[10px] pt-1">{req.start_date} to {req.end_date} ({req.total_days}d)</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={req.reason}>{req.reason || 'No context given'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          req.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                          req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'Pending' ? (
                          <div className="flex items-center justify-end space-x-1">
                            <button 
                              onClick={() => handleUpdateStatus(req.id, req.employee_id, req.total_days, 'Approved')}
                              disabled={actionLoading !== null}
                              className="text-emerald-600 hover:text-white p-1 rounded-lg hover:bg-emerald-600 border border-emerald-200 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(req.id, req.employee_id, req.total_days, 'Rejected')}
                              disabled={actionLoading !== null}
                              className="text-red-600 hover:text-white p-1 rounded-lg hover:bg-red-600 border border-red-200 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL POPUP DIALOG DRAWER FOR REQUEST FILING */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase">File Time-Off Request</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateLeaveRequest} className="space-y-3">
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Leave Type Category</label>
                <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:outline-none bg-slate-50">
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Earned">Earned Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Start Date</label>
                  <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-xs font-medium px-2 py-1.5 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">End Date</label>
                  <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-xs font-medium px-2 py-1.5 border border-slate-200 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Reason Narrative Context</label>
                <textarea required rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="State operational context here..." className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none" />
              </div>
              <button type="submit" disabled={modalSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm">
                {modalSubmitting ? 'Submitting Details...' : 'Submit Request File'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}