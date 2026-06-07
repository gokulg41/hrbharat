"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { commitMonthlyPayrollAction } from '@/lib/actions';
import { calculateIndianPayrollBreakdown } from '@/lib/payroll-math';
import {
  Search, Edit2, Mail, Phone, Key, Banknote,
  Download, Terminal, CheckCircle2, XCircle, Plus, X
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Design helpers (match page.tsx)
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
    gray:    'bg-stone-100 text-stone-500 border-stone-200',
    teal:    'bg-teal-50 text-teal-700 border-teal-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
    rose:    'bg-rose-50 text-rose-600 border-rose-100',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${map[color]}`}>
      {children}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-stone-400 font-sans italic">{text}</p>
    </div>
  );
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full text-sm font-sans text-stone-800 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-300 ${className}`}
    />
  );
}

function ApproveRejectButtons({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex gap-1 shrink-0">
      <button
        onClick={onApprove}
        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-colors cursor-pointer"
        title="Approve"
      >
        <CheckCircle2 className="w-4 h-4" />
      </button>
      <button
        onClick={onReject}
        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
        title="Reject"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
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
  refreshOperationalData,
}: TabsViewProps) {

  const [targetEmpCode, setTargetEmpCode] = useState('');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [taskArray, setTaskArray] = useState<string[]>([]);
  const [pushingTasks, setPushingTasks] = useState(false);

  const [targetMonth, setTargetMonth] = useState('May 2026');
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [payrollStatus, setPayrollStatus] = useState<string | null>(null);

  const [selectedLogType, setSelectedLogType] = useState('ALL');

  const addToTaskArray = () => {
    if (!newTaskInput.trim()) return;
    setTaskArray([...taskArray, newTaskInput.trim()]);
    setNewTaskInput('');
  };

  const handleAssignTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskArray.length === 0 || !targetEmpCode.trim()) return;
    setPushingTasks(true);
    const matchEmp = employees.find(
      (emp) => emp.employee_code.toLowerCase().trim() === targetEmpCode.toLowerCase().trim()
    );
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
      const { error } = await supabase.from('daily_tasks').insert({
        company_id: profile?.company_id,
        employee_code: targetEmpCode.toUpperCase().trim(),
        employee_name: matchEmp ? matchEmp.full_name : 'Unknown',
        task_priorities: taskArray,
      });
      if (error) throw error;
      setTaskArray([]); setTargetEmpCode('');
      await refreshOperationalData();
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
      const recordsToCommit = employees.map((emp) => {
        const math = calculateIndianPayrollBreakdown(emp.monthly_salary);
        return {
          company_id: profile?.company_id,
          employee_code: emp.employee_code,
          employee_name: emp.full_name,
          designation: emp.designation,
          department: emp.department,
          month_year: targetMonth,
          gross_salary: math.gross,
          epf_deduction: math.epf,
          esic_deduction: math.esic,
          prof_tax_deduction: math.profTax,
          net_take_home: math.netHome,
          status: 'paid',
        };
      });
      const res = await commitMonthlyPayrollAction(recordsToCommit);
      if (res.success) setPayrollStatus(`Payroll for ${targetMonth} processed successfully.`);
      else throw new Error(res.error);
    } catch (err: any) { setPayrollStatus(`Failed: ${err.message}`); }
    finally { setProcessingPayroll(false); }
  };

  const handleExportAuditLogsToCSV = (filteredLogs: any[]) => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Event Type', 'Actor', 'Description'];
    const rows = filteredLogs.map((log) => [
      `"${new Date(log.created_at).toLocaleString()}"`,
      `"${log.event_type}"`,
      `"${log.actor_name}"`,
      `"${log.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Audit_Trail_${targetMonth.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSystemLogs = systemLogs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedLogType === 'ALL' || log.event_type === selectedLogType;
    return matchesSearch && matchesCategory;
  });

  /* ── shared row wrapper ── */
  const rowCls = 'px-5 py-3.5 flex items-center gap-3 hover:bg-[#F0EAD9] transition-colors border-b border-[#E8E0CC] last:border-0';

  return (
    <div className="flex-1 bg-transparent text-stone-800 font-sans w-full">

      {/* ══════════════════════════════
          1. ROSTER
      ══════════════════════════════ */}
      {activeTab === 'roster' && (
        <div className="flex flex-col h-full">
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-[#E8E0CC]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter roster…"
                className="w-full text-sm font-sans text-stone-800 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-300"
              />
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <EmptyState text="No employees match your search." />
          ) : (
            <div className="overflow-y-auto max-h-[480px]">
              {filteredEmployees.map((emp) => (
                <div key={emp.id} className={`${rowCls} justify-between group relative`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={emp.full_name} />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-sm font-semibold text-stone-900">{emp.full_name}</span>
                        <Badge>{emp.employee_code}</Badge>
                        {emp.monthly_salary > 0 && (
                          <Badge color="emerald">₹{emp.monthly_salary.toLocaleString('en-IN')}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-stone-400">
                        <Key className="w-3 h-3" />
                        <span>Temp: <span className="font-medium text-stone-500">Temp@{emp.employee_code}</span></span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {emp.designation && <Badge color="teal">{emp.designation}</Badge>}
                        {emp.department && <Badge>{emp.department}</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-[11px] text-stone-400 shrink-0">
                    <button
                      onClick={() => startEditing(emp)}
                      className="mb-1 px-2.5 py-1 bg-stone-900 hover:bg-stone-700 text-stone-50 text-[10px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>
                    {emp.phone_number && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone_number}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          2. LEAVES
      ══════════════════════════════ */}
      {activeTab === 'leaves' && (
        <div className="overflow-y-auto max-h-[480px]">
          {leaveRequests.length === 0 ? (
            <EmptyState text="No pending leave requests." />
          ) : leaveRequests.map((req) => (
            <div key={req.id} className={`${rowCls} justify-between`}>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={req.employee_name} />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-stone-900">{req.employee_name}
                    <span className="ml-1.5"><Badge>{req.employee_code}</Badge></span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Badge color="amber">{req.leave_type}</Badge>
                    <span className="text-[11px] text-stone-400">{req.start_date} – {req.end_date}</span>
                  </div>
                </div>
              </div>
              <ApproveRejectButtons
                onApprove={async () => {
                  const { approveOrRejectLeaveWithBalanceAction } = await import('@/lib/actions');
                  const { data: { user } } = await supabase.auth.getUser();
                  const { data: prof } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
                  const res = await approveOrRejectLeaveWithBalanceAction(prof?.company_id, req.id, 'approved');
                  if (res.success) await refreshOperationalData(); else alert(res.error);
                }}
                onReject={() => handleUpdateWorkflowStatus('leave_requests', req.id, 'rejected')}
              />
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════
          3. ADVANCES
      ══════════════════════════════ */}
      {activeTab === 'advances' && (
        <div className="overflow-y-auto max-h-[480px]">
          {advanceRequests.length === 0 ? (
            <EmptyState text="No pending advance requests." />
          ) : advanceRequests.map((req) => (
            <div key={req.id} className={`${rowCls} justify-between`}>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={req.employee_name} />
                <div>
                  <p className="text-sm font-semibold text-stone-900">{req.employee_name}</p>
                  <p className="text-xs font-semibold text-rose-600 mt-0.5">
                    ₹{req.requested_amount.toLocaleString('en-IN')}
                  </p>
                  {req.reason && (
                    <p className="text-[11px] text-stone-400 italic mt-0.5 truncate max-w-xs">"{req.reason}"</p>
                  )}
                </div>
              </div>
              <ApproveRejectButtons
                onApprove={() => handleUpdateWorkflowStatus('advance_salary_requests', req.id, 'approved')}
                onReject={() => handleUpdateWorkflowStatus('advance_salary_requests', req.id, 'rejected')}
              />
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════
          4. TASKS
      ══════════════════════════════ */}
      {activeTab === 'tasks' && (
        <div className="p-5 space-y-5">
          {/* Assign form */}
          <form
            onSubmit={handleAssignTasks}
            className="bg-[#F0EAD9] border border-[#DDD5C0] rounded-lg p-4 space-y-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Assign Tasks</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                required
                placeholder="Employee code"
                value={targetEmpCode}
                onChange={(e) => setTargetEmpCode(e.target.value)}
              />
              <div className="col-span-2 flex gap-2">
                <Input
                  placeholder="Add a task…"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addToTaskArray}
                  className="shrink-0 w-9 h-9 flex items-center justify-center bg-stone-900 hover:bg-stone-700 text-stone-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {taskArray.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DDD5C0]">
                <div className="flex flex-wrap gap-1.5">
                  {taskArray.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-[#FDF8F0] border border-[#DDD5C0] text-stone-700 px-2 py-0.5 rounded-md">
                      {t}
                      <button type="button" onClick={() => setTaskArray(taskArray.filter((_, j) => j !== i))} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={pushingTasks}
                  className="text-xs font-semibold bg-stone-900 hover:bg-stone-700 text-stone-50 px-4 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {pushingTasks ? 'Assigning…' : 'Assign Tasks'}
                </button>
              </div>
            )}
          </form>

          {/* EOD submissions */}
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {dailyTaskLogs.filter((t) => t.eod_submission).map((log) => (
              <div key={log.id} className="p-3.5 bg-[#FDF8F0] border border-[#E8E0CC] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={log.employee_name} />
                    <span className="text-sm font-semibold text-stone-900">{log.employee_name}</span>
                    <Badge>{log.employee_code}</Badge>
                  </div>
                  <span className="text-[10px] text-stone-400 tabular-nums">
                    {log.submitted_at ? new Date(log.submitted_at).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <p className="text-[12px] text-stone-600 leading-relaxed pl-9 border-l-2 border-[#DDD5C0] ml-[34px] italic">
                  "{log.eod_submission}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          5. COMPLIANCE / CORRECTIONS
      ══════════════════════════════ */}
      {activeTab === 'compliance' && (
        <div className="overflow-y-auto max-h-[480px]">
          {regularizations.length === 0 ? (
            <EmptyState text="No pending corrections." />
          ) : regularizations.map((req) => (
            <div key={req.id} className={`${rowCls} justify-between`}>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={req.employee_name} />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-stone-900">{req.employee_name}</span>
                    <Badge>{req.employee_code}</Badge>
                  </div>
                  {req.justification && (
                    <p className="text-[11px] text-stone-400 italic truncate max-w-xs">"{req.justification}"</p>
                  )}
                  <p className="text-[11px] text-stone-400 font-sans tabular-nums">
                    {req.target_date} · {req.requested_punch_in?.slice(0, 5)} – {req.requested_punch_out?.slice(0, 5)}
                  </p>
                </div>
              </div>
              <ApproveRejectButtons
                onApprove={() => handleUpdateWorkflowStatus('attendance_regularizations', req.id, 'approved')}
                onReject={() => handleUpdateWorkflowStatus('attendance_regularizations', req.id, 'rejected')}
              />
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════
          6. PAYROLL
      ══════════════════════════════ */}
      {activeTab === 'payroll' && (
        <div className="p-5 space-y-4">
          {/* Controls */}
          <div className="flex flex-row items-center gap-3">
            <input
              type="text"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="w-32 shrink-0 text-sm font-sans text-stone-800 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
            <button
              onClick={handleProcessPayrollLedger}
              disabled={processingPayroll || employees.length === 0}
              className="flex items-center gap-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-700 text-stone-50 px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Banknote className="w-3.5 h-3.5" />
              {processingPayroll ? 'Processing…' : 'Disburse Payroll'}
            </button>
          </div>
          {payrollStatus && (
            <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-sans">
              {payrollStatus}
            </div>
          )}

          {/* Table */}
          <div className="border border-[#DDD5C0] rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-[#F0EAD9] border-b border-[#DDD5C0]">
                  {['Employee', 'Gross Salary', 'Net Take-Home'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0CC]">
                {employees.map((emp) => {
                  const breakdown = calculateIndianPayrollBreakdown(emp.monthly_salary);
                  return (
                    <tr key={emp.id} className="hover:bg-[#F0EAD9] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={emp.full_name} />
                          <div>
                            <p className="text-sm font-semibold text-stone-900">{emp.full_name}</p>
                            <p className="text-[10px] text-stone-400">{emp.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700 tabular-nums">
                        ₹{breakdown.gross.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-700 tabular-nums">
                        ₹{breakdown.netHome.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          7. LOGS
      ══════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="p-5 space-y-4">
          {/* Filters + export */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs…"
                className="w-full text-sm font-sans text-stone-800 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-300"
              />
            </div>
            <select
              value={selectedLogType}
              onChange={(e) => setSelectedLogType(e.target.value)}
              className="text-sm font-sans text-stone-700 bg-[#FAF5EB] border border-[#DDD5C0] rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All events</option>
              <option value="NODE_PROVISIONED">Provisioned</option>
              <option value="PERIMETER_MUTATED">Perimeters</option>
              <option value="PAYROLL_DISBURSED">Payroll</option>
              <option value="LEAVE_CLEARANCE_APPROVED">Leave Approved</option>
            </select>
            <button
              onClick={() => handleExportAuditLogsToCSV(filteredSystemLogs)}
              disabled={filteredSystemLogs.length === 0}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-[#F0EAD9] hover:bg-[#E8E0CC] border border-[#DDD5C0] px-3.5 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Log feed */}
          <div className="border border-[#DDD5C0] rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F0EAD9] border-b border-[#DDD5C0] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Audit trail</span>
            </div>
            {filteredSystemLogs.length === 0 ? (
              <EmptyState text="No events recorded yet." />
            ) : (
              <div className="divide-y divide-[#E8E0CC] max-h-[300px] overflow-y-auto">
                {filteredSystemLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 hover:bg-[#F0EAD9] transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <Badge>{log.event_type}</Badge>
                        <span className="text-[11px] text-stone-400">
                          by <span className="font-medium text-stone-600">{log.actor_name}</span>
                        </span>
                      </div>
                      <p className="text-sm text-stone-700">› {log.description}</p>
                    </div>
                    <span className="text-[10px] text-stone-400 tabular-nums shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
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