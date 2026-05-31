"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { commitMonthlyPayrollAction } from '@/lib/actions';
import { calculateIndianPayrollBreakdown } from '@/lib/payroll-math';
import { Search, Edit2, Mail, Phone, CreditCard, CheckCircle2, XCircle, Key, Banknote, Download, Terminal } from 'lucide-react';

interface TabsViewProps {
  activeTab: 'roster' | 'leaves' | 'advances' | 'tasks' | 'compliance' | 'payroll' | 'logs';
  employees: any[];
  leaveRequests: any[];
  advanceRequests: any[];
  dailyTaskLogs: any[];
  regularizations: any[];
  systemLogs: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  startEditing: (emp: any) => void;
  handleUpdateWorkflowStatus: (table: any, id: string, status: string) => Promise<void>;
  refreshOperationalData: () => Promise<void>;
}

export default function AdminTabsView({
  activeTab,
  employees,
  leaveRequests,
  advanceRequests,
  dailyTaskLogs,
  regularizations,
  systemLogs,
  searchQuery,
  setSearchQuery,
  startEditing,
  handleUpdateWorkflowStatus,
  refreshOperationalData
}: TabsViewProps) {
  
  // Tasks states
  const [targetEmpCode, setTargetEmpCode] = useState<string>('');
  const [newTaskInput, setNewTaskInput] = useState<string>('');
  const [taskArray, setTaskArray] = useState<string[]>([]);
  const [pushingTasks, setPushingTasks] = useState<boolean>(false);

  // Payroll states
  const [targetMonth, setTargetMonth] = useState<string>('May 2026');
  const [processingPayroll, setProcessingPayroll] = useState<boolean>(false);
  const [payrollStatus, setPayrollStatus] = useState<string | null>(null);

  // Logs Filter states
  const [selectedLogType, setSelectedLogType] = useState<string>('ALL');

  const addToTaskArray = () => {
    if (!newTaskInput.trim()) return;
    setTaskArray([...taskArray, newTaskInput.trim()]);
    setNewTaskInput('');
  };

  const handleAssignTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskArray.length === 0 || !targetEmpCode.trim()) return;
    setPushingTasks(true);
    const matchEmp = employees.find(emp => emp.employee_code.toLowerCase().trim() === targetEmpCode.toLowerCase().trim());
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
      const { error } = await supabase.from('daily_tasks').insert({
        company_id: profile?.company_id, employee_code: targetEmpCode.toUpperCase().trim(), employee_name: matchEmp ? matchEmp.full_name : 'Roster Asset Group', task_priorities: taskArray,
      });
      if (error) throw error;
      setTaskArray([]); setTargetEmpCode(''); await refreshOperationalData();
    } catch (err: any) { alert(`Error: ${err.message}`); }
    finally { setPushingTasks(false); }
  };

  const handleProcessPayrollLedger = async () => {
    if (employees.length === 0) return;
    setProcessingPayroll(true);
    setPayrollStatus(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
      const recordsToCommit = employees.map(emp => {
        const math = calculateIndianPayrollBreakdown(emp.monthly_salary);
        return {
          company_id: profile?.company_id, employee_code: emp.employee_code, employee_name: emp.full_name,
          designation: emp.designation, department: emp.department, month_year: targetMonth,
          gross_salary: math.gross, epf_deduction: math.epf, esic_deduction: math.esic, prof_tax_deduction: math.profTax, net_take_home: math.netHome, status: 'paid'
        };
      });
      const res = await commitMonthlyPayrollAction(recordsToCommit);
      if (res.success) setPayrollStatus(`Payroll metrics for cycle [ ${targetMonth} ] processed!`);
      else throw new Error(res.error);
    } catch (err: any) { setPayrollStatus(`Aborted: ${err.message}`); }
    finally { setProcessingPayroll(false); }
  };

  const handleExportAuditLogsToCSV = (filteredLogs: any[]) => {
    if (filteredLogs.length === 0) return;
    const headers = ["Timestamp", "Event Code Type", "Responsible Actor", "Description Statement Trace"];
    const rows = filteredLogs.map(log => [
      `"${new Date(log.created_at).toLocaleString()}"`,
      `"${log.event_type}"`,
      `"${log.actor_name}"`,
      `"${log.description.replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Trail_${targetMonth.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSystemLogs = systemLogs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.actor_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedLogType === 'ALL' || log.event_type === selectedLogType;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 bg-transparent text-white w-full">
      
      {/* 1. ROSTER VIEW */}
      {activeTab === 'roster' && (
        <div className="space-y-4 w-full">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3.5 text-slate-500 w-3.5 h-3.5" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter roster index records..." className="w-full text-xs font-semibold pl-10 pr-4 py-3 border border-white/[0.04] rounded-xl bg-[#070A10]/40 text-white focus:outline-none focus:border-white/[0.2] transition-all" />
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-500 uppercase font-mono tracking-widest">No matching assets found</div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 w-full">
              {filteredEmployees.map((emp) => (
                <div key={emp.id} className="p-4 bg-[#070A10]/30 border border-white/[0.04] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative group hover:border-white/[0.1] transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{emp.full_name}</span>
                      <span className="text-[10px] font-mono font-bold bg-[#131B2E] border border-white/[0.04] text-slate-400 px-1.5 py-0.2 rounded">{emp.employee_code}</span>
                      {emp.monthly_salary > 0 && <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-1.5 rounded">₹{emp.monthly_salary.toLocaleString('en-IN')}</span>}
                    </div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-medium text-slate-500 font-mono">
                      <Key className="w-3 h-3 text-slate-600" />
                      <span>Temp Key: <span className="text-slate-300 font-semibold">Temp@{emp.employee_code}</span></span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {emp.designation && <span className="text-[9px] font-medium bg-[#131B2E] px-2 py-0.5 rounded border border-white/[0.02] text-slate-400">{emp.designation}</span>}
                      {emp.department && <span className="text-[9px] font-medium bg-[#131B2E] px-2 py-0.5 rounded border border-white/[0.02] text-slate-400">{emp.department}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end text-[10px] text-slate-400 font-mono space-y-0.5">
                    <button onClick={() => startEditing(emp)} className="absolute top-4 right-4 px-2 py-1 bg-white text-black font-sans font-bold text-[9px] rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-sm">Modify</button>
                    <span className="flex items-center"><Mail className="w-3 h-3 mr-1.5 text-slate-600" /> {emp.email}</span>
                    {emp.phone_number && <span className="flex items-center"><Phone className="w-3 h-3 mr-1.5 text-slate-600" /> {emp.phone_number}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. LEAVES */}
      {activeTab === 'leaves' && (
        <div className="space-y-3 w-full">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-500 font-mono uppercase tracking-widest">Zero active clearance flags</div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto w-full">
              {leaveRequests.map((req) => (
                <div key={req.id} className="p-4 bg-[#070A10]/30 border border-white/[0.04] rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white">{req.employee_name} ({req.employee_code})</span>
                    <p className="text-[10px] text-slate-400">{req.leave_type} | <span className="font-mono text-slate-500">{req.start_date} to {req.end_date}</span></p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={async () => {
                      const { approveOrRejectLeaveWithBalanceAction } = await import('@/lib/actions');
                      const { data: { user } } = await supabase.auth.getUser();
                      const { data: prof } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
                      const res = await approveOrRejectLeaveWithBalanceAction(prof?.company_id, req.id, 'approved');
                      if (res.success) await refreshOperationalData(); else alert(res.error);
                    }} className="p-2 bg-[#131B2E] hover:bg-white hover:text-black border border-white/[0.04] rounded-xl transition-all cursor-pointer"><CheckCircle2 className="w-4 h-4" /></button>
                    <button onClick={() => handleUpdateWorkflowStatus('leave_requests', req.id, 'rejected')} className="p-2 bg-[#131B2E] hover:bg-white hover:text-black border border-white/[0.04] rounded-xl transition-all cursor-pointer"><XCircle className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. ADVANCES */}
      {activeTab === 'advances' && (
        <div className="space-y-3 w-full">
          {advanceRequests.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-500 font-mono uppercase tracking-widest">Zero active advance claims</div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto w-full">
              {advanceRequests.map((req) => (
                <div key={req.id} className="p-4 bg-[#070A10]/30 border border-white/[0.04] rounded-xl flex items-center justify-between gap-4">
                  <div><span className="text-xs font-bold text-white">{req.employee_name}</span><p className="text-xs font-bold text-rose-400 font-mono mt-0.5">Claim: ₹{req.requested_amount.toLocaleString('en-IN')}</p></div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => handleUpdateWorkflowStatus('advance_salary_requests', req.id, 'approved')} className="p-2 bg-[#131B2E] hover:bg-white hover:text-black border border-white/[0.04] rounded-xl transition-all cursor-pointer"><CheckCircle2 className="w-4 h-4" /></button>
                    <button onClick={() => handleUpdateWorkflowStatus('advance_salary_requests', req.id, 'rejected')} className="p-2 bg-[#131B2E] hover:bg-white hover:text-black border border-white/[0.04] rounded-xl transition-all cursor-pointer"><XCircle className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TASKS MATRIX */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 w-full">
          <form onSubmit={handleAssignTasks} className="bg-[#070A10]/40 p-4 border border-white/[0.04] rounded-xl space-y-3 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="text" required placeholder="Asset ID Code" value={targetEmpCode} onChange={e => setTargetEmpCode(e.target.value)} className="text-xs font-medium p-2 border border-white/[0.04] bg-[#131B2E] text-white rounded-lg focus:outline-none" />
              <div className="col-span-1 sm:col-span-2 flex gap-2">
                <input type="text" placeholder="Specify objective description criteria..." value={newTaskInput} onChange={e => setNewTaskInput(e.target.value)} className="w-full text-xs font-medium p-2 border border-white/[0.04] bg-[#131B2E] text-white rounded-lg focus:outline-none" />
                <button type="button" onClick={addToTaskArray} className="bg-white text-black px-3.5 rounded-lg font-bold cursor-pointer hover:bg-slate-200 transition-colors">+</button>
              </div>
            </div>
            {taskArray.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2 items-center justify-between border-t border-white/[0.04] w-full">
                <div className="flex flex-wrap gap-1">
                  {taskArray.map((t, i) => <span key={i} className="text-[10px] font-mono font-bold bg-[#131B2E] px-2 py-0.5 rounded text-slate-300">Obj {i+1}: {t}</span>)}
                </div>
                <button type="submit" disabled={pushingTasks} className="text-[10px] font-bold uppercase bg-white text-black px-4 py-1.5 rounded-lg tracking-wide shadow-sm cursor-pointer">{pushingTasks ? 'Deploying...' : 'Lock Priorities'}</button>
              </div>
            )}
          </form>
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto w-full">
            {dailyTaskLogs.filter(t => t.eod_submission).map(log => (
              <div key={log.id} className="p-3 bg-[#070A10]/20 border border-white/[0.04] rounded-xl space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500"><span className="font-sans font-bold text-white">{log.employee_name} ({log.employee_code})</span><span>{log.submitted_at ? new Date(log.submitted_at).toLocaleTimeString() : 'N/A'}</span></div>
                <p className="text-xs text-slate-400 bg-[#070A10]/40 p-2 border border-dashed border-white/[0.04] rounded-lg">"{log.eod_submission}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. COMPLIANCE ADJUSTMENTS */}
      {activeTab === 'compliance' && (
        <div className="space-y-3 max-h-[380px] overflow-y-auto w-full">
          {regularizations.length === 0 ? (
            <p className="text-center py-16 text-xs font-mono text-slate-500 uppercase tracking-widest">Zero adjustments filed</p>
          ) : (
            regularizations.map(req => (
              <div key={req.id} className="p-4 bg-[#070A10]/30 border border-white/[0.04] rounded-xl flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-white">{req.employee_name} <span className="text-slate-500 font-mono text-[10px]">({req.employee_code})</span></p>
                  <p className="text-slate-400 text-[10px]">Reason: <span className="italic text-slate-300">"{req.justification}"</span></p>
                  <p className="text-[10px] font-mono font-bold text-slate-500">Fix Date: {req.target_date} | Stamp: {req.requested_punch_in.slice(0,5)} to {req.requested_punch_out.slice(0,5)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => handleUpdateWorkflowStatus('attendance_regularizations', req.id, 'approved')} className="p-2 bg-[#131B2E] hover:bg-white hover:text-black border border-white/[0.04] rounded-xl cursor-pointer transition-all"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></button>
                  <button onClick={() => handleUpdateWorkflowStatus('attendance_regularizations', req.id, 'rejected')} className="p-2 bg-[#131B2E] hover:bg-white hover:text-black border border-white/[0.04] rounded-xl cursor-pointer transition-all"><XCircle className="w-4 h-4 text-rose-400" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 6. PAYROLL ENGINE SYSTEM SPREADSHEET */}
      {activeTab === 'payroll' && (
        <div className="space-y-4 w-full">
          <div className="bg-[#070A10]/30 p-4 border border-white/[0.04] rounded-xl flex items-center justify-between gap-4 shadow-sm w-full">
            <div className="flex items-center gap-2">
              <input type="text" value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="text-xs font-bold px-3 py-1.5 border border-white/[0.04] rounded-xl bg-[#131B2E] text-white w-32 focus:outline-none" />
              <button onClick={handleProcessPayrollLedger} disabled={processingPayroll || employees.length === 0} className="bg-white text-black text-xs font-bold px-4 py-1.5 rounded-xl uppercase tracking-wider hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"><Banknote className="w-4 h-4" /> <span>{processingPayroll ? 'Authorizing...' : 'Disburse Payroll'}</span></button>
            </div>
          </div>
          {payrollStatus && <div className="p-3 text-xs font-medium bg-[#131B2E] border border-white/[0.04] text-slate-300 rounded-xl">{payrollStatus}</div>}
          <div className="border border-white/[0.04] rounded-xl overflow-hidden bg-[#070A10]/20 overflow-x-auto max-h-[260px] w-full">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-[#070A10]/60 text-slate-500 font-bold text-[9px] tracking-widest uppercase border-b border-white/[0.04]">
                  <th className="p-3.5">Staff Asset</th>
                  <th className="p-3.5">Gross Wage</th>
                  <th className="p-3.5 text-right">Net Take-Home</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs font-medium font-mono text-slate-300">
                {employees.map(emp => {
                  const breakdown = calculateIndianPayrollBreakdown(emp.monthly_salary);
                  return (
                    <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-sans font-bold text-white">{emp.full_name}<div className="text-[10px] text-slate-500 font-mono mt-0.5">{emp.employee_code}</div></td>
                      <td className="p-3.5">₹{breakdown.gross.toLocaleString('en-IN')}</td>
                      <td className="p-3.5 text-right font-sans font-bold text-emerald-400">₹{breakdown.netHome.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. CONTINUOUS LOGS TELEMETRY CONSOLE STREAM */}
      {activeTab === 'logs' && (
        <div className="space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#070A10]/30 p-4 border border-white/[0.04] rounded-xl shadow-sm w-full">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter streaming traces..." className="text-[11px] font-medium px-3 py-1.5 border border-white/[0.04] rounded-xl bg-[#131B2E] text-white focus:outline-none w-full sm:w-48" />
              <select value={selectedLogType} onChange={e => setSelectedLogType(e.target.value)} className="text-[11px] font-bold uppercase bg-[#131B2E] text-white border border-white/[0.04] px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer">
                <option value="ALL">All Vectors</option>
                <option value="NODE_PROVISIONED">Provisioned</option>
                <option value="PERIMETER_MUTATED">Perimeters</option>
                <option value="PAYROLL_DISBURSED">Payroll</option>
                <option value="LEAVE_CLEARANCE_APPROVED">Leave Approve</option>
              </select>
            </div>
            <button onClick={() => handleExportAuditLogsToCSV(filteredSystemLogs)} disabled={filteredSystemLogs.length === 0} className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm w-full sm:w-auto"><Download className="w-3.5 h-3.5" /> <span>Export Trail CSV</span></button>
          </div>

          <div className="bg-[#070A10] rounded-xl p-4 border border-white/[0.04] shadow-xl space-y-3 overflow-hidden max-h-[300px] overflow-y-auto w-full">
            <div className="flex items-center space-x-2 border-b border-white/[0.02] pb-2 text-slate-600 font-mono text-[9px] font-bold uppercase tracking-widest"><Terminal className="w-3.5 h-3.5 text-slate-500" /> <span>Continuous Track Stream Core traces console</span></div>
            {filteredSystemLogs.length === 0 ? (
              <p className="text-center font-mono text-slate-600 text-[10px] py-12 uppercase tracking-widest">No structural audit trails footprint recorded</p>
            ) : (
              <div className="space-y-2.5 font-mono text-[11px] leading-relaxed w-full">
                {filteredSystemLogs.map(log => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-slate-300 border-b border-white/[0.02] pb-2 hover:text-white transition-colors w-full">
                    <div className="space-y-0.5">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#131B2E] border border-white/[0.04] text-slate-300 uppercase tracking-wide">[{log.event_type}]</span>
                        <span className="text-slate-500 font-sans text-[10px]">Node Actor: <span className="text-slate-400 font-bold font-mono">{log.actor_name}</span></span>
                      </div>
                      <p className="text-slate-400 pl-1">{"\u003e\u003e\u003e"} {log.description}</p>
                    </div>
                    <span className="text-slate-600 text-[10px] shrink-0 pt-0.5 select-none">[{new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19)}]</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}