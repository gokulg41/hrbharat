"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Clock,
  Calendar,
  ClipboardList,
  FileText,
  IndianRupee,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  Download,
  MoreHorizontal,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  User,
  Building2,
  Loader2,
  Lock,
} from "lucide-react";
import PlanGate from "@/components/PlanGate";
import { usePlan } from "@/lib/usePlan";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: "present" | "absent" | "late" | "half_day";
  selfie_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
  profiles: { full_name: string; employee_id: string } | null;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { full_name: string; employee_id: string } | null;
}

interface AdvanceRequest {
  id: string;
  employee_id: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { full_name: string; employee_id: string } | null;
}

interface Task {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  created_at: string;
  profiles: { full_name: string; employee_id: string } | null;
}

interface RegularisationRequest {
  id: string;
  employee_id: string;
  date: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { full_name: string; employee_id: string } | null;
}

// ── AdminTabsView props (used by app/admin/page.tsx) ──────────────────────────

interface AdminTabsViewProps {
  activeTab: "roster" | "leaves" | "advances" | "tasks" | "compliance" | "payroll" | "logs";
  employees: any[];
  leaveRequests: any[];
  advanceRequests: any[];
  dailyTaskLogs: any[];
  regularizations: any[];
  systemLogs: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  startEditing: (emp: any) => void;
  handleUpdateWorkflowStatus: (table: string, id: string, status: string) => void;
  refreshOperationalData: () => Promise<void>;
}

// ── AdminTabsView — default export consumed by app/admin/page.tsx ─────────────

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
}: AdminTabsViewProps) {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleLeaveStatus(id: string, status: "approved" | "rejected") {
    await handleUpdateWorkflowStatus("leave_requests", id, status);
    showToast(`Leave ${status}`);
    await refreshOperationalData();
  }

  async function handleAdvanceStatus(id: string, status: "approved" | "rejected") {
    await handleUpdateWorkflowStatus("advance_salary_requests", id, status);
    showToast(`Advance ${status}`);
    await refreshOperationalData();
  }

  async function handleRegularizationStatus(id: string, status: "approved" | "rejected") {
    await handleUpdateWorkflowStatus("attendance_regularizations", id, status);
    showToast(`Correction ${status}`);
    await refreshOperationalData();
  }

  // ── Roster tab ───────────────────────────────────────────────────────────────
  if (activeTab === "roster") {
    const filtered = employees.filter((e) =>
      `${e.full_name} ${e.employee_code} ${e.department} ${e.designation}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
    return (
      <div className="space-y-4 p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
        </div>
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Department</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Salary</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Joined</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-stone-400">No employees found</td></tr>
              ) : filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{emp.full_name}</p>
                    <p className="text-stone-400">{emp.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <p>{emp.department || "—"}</p>
                    <p className="text-stone-400">{emp.designation || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-700 font-medium">
                    ₹{Number(emp.monthly_salary || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => startEditing(emp)}
                      className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ── Leaves tab ───────────────────────────────────────────────────────────────
  if (activeTab === "leaves") {
    return (
      <div className="space-y-4 p-4">
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Duration</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Reason</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {leaveRequests.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-stone-400">No pending leave requests</td></tr>
              ) : leaveRequests.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{r.employee_name}</p>
                    <p className="text-stone-400">{r.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600 capitalize">{r.leave_type}</td>
                  <td className="px-4 py-3 text-stone-500">
                    {r.start_date} → {r.end_date}
                  </td>
                  <td className="px-4 py-3 text-stone-500 max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleLeaveStatus(r.id, "approved")}
                        className="p-1 rounded hover:bg-emerald-50 text-stone-400 hover:text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleLeaveStatus(r.id, "rejected")}
                        className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ── Advances tab ─────────────────────────────────────────────────────────────
  if (activeTab === "advances") {
    return (
      <div className="space-y-4 p-4">
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Amount</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Reason</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Requested</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {advanceRequests.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-stone-400">No pending advance requests</td></tr>
              ) : advanceRequests.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{r.employee_name}</p>
                    <p className="text-stone-400">{r.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-900">
                    ₹{Number(r.requested_amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-stone-500 max-w-[180px] truncate">{r.reason}</td>
                  <td className="px-4 py-3 text-stone-400">
                    {new Date(r.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleAdvanceStatus(r.id, "approved")}
                        className="p-1 rounded hover:bg-emerald-50 text-stone-400 hover:text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleAdvanceStatus(r.id, "rejected")}
                        className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ── Tasks tab ────────────────────────────────────────────────────────────────
  if (activeTab === "tasks") {
    return (
      <div className="space-y-4 p-4">
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Tasks</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {dailyTaskLogs.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-stone-400">No task logs yet</td></tr>
              ) : dailyTaskLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{log.employee_name}</p>
                    <p className="text-stone-400">{log.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600 max-w-[300px]">
                    {log.task_priorities?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {log.task_priorities.map((t: string, i: number) => (
                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">{t}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-stone-400 italic">No tasks listed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-400">
                    {new Date(log.submitted_at || log.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Compliance (regularizations) tab ─────────────────────────────────────────
  if (activeTab === "compliance") {
    return (
      <div className="space-y-4 p-4">
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Requested Times</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Reason</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {regularizations.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-stone-400">No pending corrections</td></tr>
              ) : regularizations.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{r.employee_name}</p>
                    <p className="text-stone-400">{r.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {r.date ? new Date(r.date).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {r.requested_check_in || "—"} → {r.requested_check_out || "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-500 max-w-[180px] truncate">{r.reason}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRegularizationStatus(r.id, "approved")}
                        className="p-1 rounded hover:bg-emerald-50 text-stone-400 hover:text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleRegularizationStatus(r.id, "rejected")}
                        className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ── Payroll tab ──────────────────────────────────────────────────────────────
  if (activeTab === "payroll") {
    const total = employees.reduce((s, e) => s + (Number(e.monthly_salary) || 0), 0);
    return (
      <div className="space-y-4 p-4">
        <div className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-stone-500 font-medium">Total Monthly Liability</span>
          <span className="text-sm font-bold text-stone-900">₹{total.toLocaleString("en-IN")}</span>
        </div>
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Department</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Gross Salary</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">Bank Account</th>
                <th className="text-left px-4 py-2.5 font-medium text-stone-400">IFSC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {employees.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-stone-400">No employees on roster</td></tr>
              ) : employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{emp.full_name}</p>
                    <p className="text-stone-400">{emp.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{emp.department || "—"}</td>
                  <td className="px-4 py-3 font-medium text-stone-900">
                    ₹{Number(emp.monthly_salary || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-stone-500 font-mono">{emp.bank_account_number || "—"}</td>
                  <td className="px-4 py-3 text-stone-500 font-mono">{emp.ifsc_code || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Logs tab ─────────────────────────────────────────────────────────────────
  if (activeTab === "logs") {
    return (
      <div className="space-y-4 p-4">
        <div className="border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
          {systemLogs.length === 0 ? (
            <p className="text-center py-10 text-xs text-stone-400">No audit events logged yet</p>
          ) : systemLogs.map((log) => (
            <div key={log.id} className="px-4 py-3 flex justify-between gap-3 hover:bg-stone-50">
              <p className="text-xs text-stone-700">
                <span className="font-semibold text-stone-900">[{log.event_type || "SYSTEM"}]</span>{" "}
                {log.description}
              </p>
              <span className="text-[11px] text-stone-400 shrink-0 tabular-nums">
                {new Date(log.created_at).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "attendance", label: "Attendance", icon: Clock, feature: null },
  { id: "leaves", label: "Leaves", icon: Calendar, feature: null },
  { id: "regularisation", label: "Regularisation", icon: RefreshCw, feature: "attendanceRegularisation" },
  { id: "advances", label: "Advances", icon: IndianRupee, feature: "advanceSalary" },
  { id: "tasks", label: "Tasks", icon: ClipboardList, feature: "dailyTasks" },
  { id: "eod", label: "EOD Reports", icon: FileText, feature: "eodReports" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── WorkforceDeskTabsView — named export for the workforce desk page ───────────

export function WorkforceDeskTabsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam || "attendance");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  const { features, loading: planLoading } = usePlan();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("company_id").eq("id", user.id).single()
        .then(({ data }) => {
          if (data?.company_id) setCompanyId(data.company_id);
          setLoadingCompany(false);
        });
    });
  }, []);

  function switchTab(id: TabId) {
    setActiveTab(id);
    router.replace(`?tab=${id}`, { scroll: false });
  }

  useEffect(() => {
    if (planLoading) return;
    const tab = TABS.find((t) => t.id === activeTab);
    if (tab?.feature && !features[tab.feature as keyof typeof features]) {
      switchTab("attendance");
    }
  }, [planLoading, features, activeTab]);

  if (loadingCompany || planLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-[#37352f] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-[#37352f]">Workforce Desk</h1>
        <p className="text-sm text-[#9b9a97] mt-0.5">Manage attendance, leaves, advances, tasks & reports</p>
      </div>

      <div className="flex items-center gap-1 border-b border-[#e9e9e7] overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon, feature }) => {
          const isLocked = !!feature && !features[feature as keyof typeof features];
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => !isLocked && switchTab(id)}
              disabled={isLocked}
              title={isLocked ? `Upgrade to unlock ${label}` : undefined}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                isLocked
                  ? "border-transparent text-[#c1c0bb] cursor-not-allowed"
                  : isActive
                  ? "border-[#37352f] text-[#37352f]"
                  : "border-transparent text-[#9b9a97] hover:text-[#787774]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {isLocked && <Lock className="w-3 h-3 ml-0.5 text-[#c1c0bb]" />}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "attendance" && companyId && <AttendanceTab companyId={companyId} />}
        {activeTab === "leaves" && companyId && <LeavesTab companyId={companyId} />}
        {activeTab === "regularisation" && (
          <PlanGate feature="attendanceRegularisation">
            {companyId && <RegularisationTab companyId={companyId} />}
          </PlanGate>
        )}
        {activeTab === "advances" && (
          <PlanGate feature="advanceSalary">
            {companyId && <AdvancesTab companyId={companyId} />}
          </PlanGate>
        )}
        {activeTab === "tasks" && (
          <PlanGate feature="dailyTasks">
            {companyId && <TasksTab companyId={companyId} />}
          </PlanGate>
        )}
        {activeTab === "eod" && (
          <PlanGate feature="eodReports">
            {companyId && <EODTab companyId={companyId} />}
          </PlanGate>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

function AttendanceTab({ companyId }: { companyId: string }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("*, profiles(full_name, employee_id)")
      .eq("company_id", companyId)
      .eq("date", date)
      .order("check_in", { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }, [companyId, date]);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r =>
    r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.profiles?.employee_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-xs border border-[#e9e9e7] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#37352f]" />
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9b9a97]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#e9e9e7] rounded-md focus:outline-none focus:ring-1 focus:ring-[#37352f]" />
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-[#787774] border border-[#e9e9e7] px-3 py-1.5 rounded-md hover:bg-[#f7f6f3]">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <div className="border border-[#e9e9e7] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f6f3] border-b border-[#e9e9e7]">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Employee</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Check In</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Check Out</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-[#9b9a97]">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-[#9b9a97]">No records for this date</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-[#f7f6f3]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#37352f]">{r.profiles?.full_name}</p>
                  <p className="text-[#9b9a97]">{r.profiles?.employee_id}</p>
                </td>
                <td className="px-4 py-3 text-[#787774]">{r.check_in || "—"}</td>
                <td className="px-4 py-3 text-[#787774]">{r.check_out || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-[#9b9a97]">
                  {r.location_lat ? `${r.location_lat.toFixed(4)}, ${r.location_lng?.toFixed(4)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: LEAVES
// ─────────────────────────────────────────────────────────────────────────────

function LeavesTab({ companyId }: { companyId: string }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("leave_requests")
      .select("*, profiles(full_name, employee_id)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRequests(data || []);
    setLoading(false);
  }, [companyId, filter]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("leave_requests").update({ status }).eq("id", id);
    if (error) showToast("Failed to update", "error");
    else { showToast(`Leave ${status}`); load(); }
  }

  const filtered = requests.filter(r =>
    r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9b9a97]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#e9e9e7] rounded-md focus:outline-none focus:ring-1 focus:ring-[#37352f]" />
        </div>
        {(["all", "pending", "approved", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize ${
              filter === s ? "bg-[#37352f] text-white border-[#37352f]" : "border-[#e9e9e7] text-[#787774] hover:bg-[#f7f6f3]"
            }`}>{s}</button>
        ))}
      </div>
      <div className="border border-[#e9e9e7] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f6f3] border-b border-[#e9e9e7]">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Employee</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Type</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Duration</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Reason</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-[#9b9a97]">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-[#9b9a97]">No leave requests</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-[#f7f6f3]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#37352f]">{r.profiles?.full_name}</p>
                  <p className="text-[#9b9a97]">{r.profiles?.employee_id}</p>
                </td>
                <td className="px-4 py-3 text-[#787774] capitalize">{r.leave_type}</td>
                <td className="px-4 py-3 text-[#787774]">
                  {new Date(r.start_date).toLocaleDateString("en-IN")} → {new Date(r.end_date).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3 text-[#787774] max-w-[200px] truncate">{r.reason}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  {r.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateStatus(r.id, "approved")}
                        className="p-1 rounded hover:bg-[#edfbf3] text-[#9b9a97] hover:text-[#0f7b43]">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => updateStatus(r.id, "rejected")}
                        className="p-1 rounded hover:bg-[#fdecea] text-[#9b9a97] hover:text-[#e03e3e]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: REGULARISATION
// ─────────────────────────────────────────────────────────────────────────────

function RegularisationTab({ companyId }: { companyId: string }) {
  const [requests, setRequests] = useState<RegularisationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("regularisation_requests")
      .select("*, profiles(full_name, employee_id)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRequests(data || []);
    setLoading(false);
  }, [companyId, filter]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("regularisation_requests").update({ status }).eq("id", id);
    if (error) showToast("Failed to update", "error");
    else { showToast(`Regularisation ${status}`); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize ${
              filter === s ? "bg-[#37352f] text-white border-[#37352f]" : "border-[#e9e9e7] text-[#787774] hover:bg-[#f7f6f3]"
            }`}>{s}</button>
        ))}
      </div>
      <div className="border border-[#e9e9e7] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f6f3] border-b border-[#e9e9e7]">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Employee</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Date</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Requested Times</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Reason</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-[#9b9a97]">Loading…</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-[#9b9a97]">No regularisation requests</td></tr>
            ) : requests.map(r => (
              <tr key={r.id} className="hover:bg-[#f7f6f3]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#37352f]">{r.profiles?.full_name}</p>
                  <p className="text-[#9b9a97]">{r.profiles?.employee_id}</p>
                </td>
                <td className="px-4 py-3 text-[#787774]">{new Date(r.date).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 text-[#787774]">
                  {r.requested_check_in || "—"} → {r.requested_check_out || "—"}
                </td>
                <td className="px-4 py-3 text-[#787774] max-w-[180px] truncate">{r.reason}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  {r.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateStatus(r.id, "approved")}
                        className="p-1 rounded hover:bg-[#edfbf3] text-[#9b9a97] hover:text-[#0f7b43]">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => updateStatus(r.id, "rejected")}
                        className="p-1 rounded hover:bg-[#fdecea] text-[#9b9a97] hover:text-[#e03e3e]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ADVANCES
// ─────────────────────────────────────────────────────────────────────────────

function AdvancesTab({ companyId }: { companyId: string }) {
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("advance_requests")
      .select("*, profiles(full_name, employee_id)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRequests(data || []);
    setLoading(false);
  }, [companyId, filter]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("advance_requests").update({ status }).eq("id", id);
    if (error) showToast("Failed to update", "error");
    else { showToast(`Advance ${status}`); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize ${
              filter === s ? "bg-[#37352f] text-white border-[#37352f]" : "border-[#e9e9e7] text-[#787774] hover:bg-[#f7f6f3]"
            }`}>{s}</button>
        ))}
      </div>
      <div className="border border-[#e9e9e7] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f6f3] border-b border-[#e9e9e7]">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Employee</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Amount</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Reason</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Requested</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-[#9b9a97]">Loading…</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-[#9b9a97]">No advance requests</td></tr>
            ) : requests.map(r => (
              <tr key={r.id} className="hover:bg-[#f7f6f3]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#37352f]">{r.profiles?.full_name}</p>
                  <p className="text-[#9b9a97]">{r.profiles?.employee_id}</p>
                </td>
                <td className="px-4 py-3 font-medium text-[#37352f]">₹{r.amount.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-[#787774] max-w-[180px] truncate">{r.reason}</td>
                <td className="px-4 py-3 text-[#9b9a97]">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  {r.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateStatus(r.id, "approved")}
                        className="p-1 rounded hover:bg-[#edfbf3] text-[#9b9a97] hover:text-[#0f7b43]">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => updateStatus(r.id, "rejected")}
                        className="p-1 rounded hover:bg-[#fdecea] text-[#9b9a97] hover:text-[#e03e3e]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: TASKS
// ─────────────────────────────────────────────────────────────────────────────

function TasksTab({ companyId }: { companyId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("tasks")
      .select("*, profiles(full_name, employee_id)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setTasks(data || []);
    setLoading(false);
  }, [companyId, filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase.from("employees").select("id, full_name").eq("company_id", companyId).eq("status", "active")
      .then(({ data }) => setEmployees(data || []));
  }, [companyId]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) showToast("Failed to delete", "error");
    else { showToast("Task deleted"); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {(["all", "pending", "in_progress", "completed"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors capitalize ${
                filter === s ? "bg-[#37352f] text-white border-[#37352f]" : "border-[#e9e9e7] text-[#787774] hover:bg-[#f7f6f3]"
              }`}>{s.replace("_", " ")}</button>
          ))}
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#37352f] px-3 py-1.5 rounded-md hover:bg-[#2d2c28]">
          <Plus className="w-3.5 h-3.5" /> Assign Task
        </button>
      </div>
      <div className="border border-[#e9e9e7] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f6f3] border-b border-[#e9e9e7]">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Task</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Assigned To</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Priority</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Due Date</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-[#9b9a97]">Loading…</td></tr>
            ) : tasks.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-[#9b9a97]">No tasks found</td></tr>
            ) : tasks.map(t => (
              <tr key={t.id} className="hover:bg-[#f7f6f3]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#37352f]">{t.title}</p>
                  {t.description && <p className="text-[#9b9a97] truncate max-w-[200px]">{t.description}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="text-[#787774]">{t.profiles?.full_name}</p>
                  <p className="text-[#9b9a97]">{t.profiles?.employee_id}</p>
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3 text-[#787774]">
                  {t.due_date ? new Date(t.due_date).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteTask(t.id)}
                    className="p-1 rounded hover:bg-[#fdecea] text-[#9b9a97] hover:text-[#e03e3e]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAddModal && (
        <AddTaskModal
          companyId={companyId}
          employees={employees}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { load(); showToast("Task assigned"); setShowAddModal(false); }}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: EOD REPORTS
// ─────────────────────────────────────────────────────────────────────────────

function EODTab({ companyId }: { companyId: string }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("eod_reports")
      .select("*, profiles(full_name, employee_id)")
      .eq("company_id", companyId)
      .eq("date", date)
      .order("created_at", { ascending: false });
    setReports(data || []);
    setLoading(false);
  }, [companyId, date]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-xs border border-[#e9e9e7] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#37352f]" />
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-[#787774] border border-[#e9e9e7] px-3 py-1.5 rounded-md hover:bg-[#f7f6f3]">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <div className="border border-[#e9e9e7] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#f7f6f3] border-b border-[#e9e9e7]">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Employee</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Summary</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Submitted</th>
              <th className="text-left px-4 py-2.5 font-medium text-[#9b9a97]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9e9e7]">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-[#9b9a97]">Loading…</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-[#9b9a97]">No EOD reports for this date</td></tr>
            ) : reports.map(r => (
              <tr key={r.id} className="hover:bg-[#f7f6f3]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#37352f]">{r.profiles?.full_name}</p>
                  <p className="text-[#9b9a97]">{r.profiles?.employee_id}</p>
                </td>
                <td className="px-4 py-3 text-[#787774] max-w-[250px] truncate">{r.summary}</td>
                <td className="px-4 py-3 text-[#9b9a97]">
                  {new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(r)}
                    className="p-1 rounded hover:bg-[#f7f6f3] text-[#9b9a97] hover:text-[#37352f]">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#e9e9e7] w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#37352f]">EOD Report</p>
              <button onClick={() => setSelected(null)} className="text-[#9b9a97] hover:text-[#37352f]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p><span className="text-[#9b9a97]">Employee:</span> <span className="text-[#37352f] font-medium">{selected.profiles?.full_name}</span></p>
              <p><span className="text-[#9b9a97]">Date:</span> <span className="text-[#787774]">{new Date(selected.date).toLocaleDateString("en-IN")}</span></p>
              <div>
                <p className="text-[#9b9a97] mb-1">Summary:</p>
                <p className="text-[#37352f] leading-relaxed bg-[#f7f6f3] rounded p-3">{selected.summary}</p>
              </div>
              {selected.tasks_completed && (
                <div>
                  <p className="text-[#9b9a97] mb-1">Tasks Completed:</p>
                  <p className="text-[#787774] leading-relaxed">{selected.tasks_completed}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODALS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function AddTaskModal({ companyId, employees, onClose, onSaved }: {
  companyId: string;
  employees: { id: string; full_name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    employee_id: "",
    title: "",
    description: "",
    due_date: "",
    priority: "medium" as "low" | "medium" | "high",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!form.employee_id || !form.title) { setError("Employee and title are required"); return; }
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      ...form,
      company_id: companyId,
      status: "pending",
    });
    if (error) { setError(error.message); setSaving(false); }
    else onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#e9e9e7] w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#37352f]">Assign Task</p>
          <button onClick={onClose} className="text-[#9b9a97] hover:text-[#37352f]"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#787774] mb-1">Employee *</label>
            <select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
              className="w-full text-xs border border-[#e9e9e7] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#37352f]">
              <option value="">Select employee…</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#787774] mb-1">Task Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full text-xs border border-[#e9e9e7] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#37352f]" />
          </div>
          <div>
            <label className="block text-xs text-[#787774] mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} className="w-full text-xs border border-[#e9e9e7] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#37352f] resize-none" />
          </div>
          <div>
            <label className="block text-xs text-[#787774] mb-1">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              className="w-full text-xs border border-[#e9e9e7] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#37352f]" />
          </div>
          <div>
            <label className="block text-xs text-[#787774] mb-1">Priority</label>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as any }))}
              className="w-full text-xs border border-[#e9e9e7] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#37352f]">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-[#e03e3e]">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 text-xs py-2 border border-[#e9e9e7] rounded-md hover:bg-[#f7f6f3]">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-xs py-2 bg-[#37352f] text-white rounded-md hover:bg-[#2d2c28] disabled:opacity-40">
            {saving ? "Saving…" : "Assign Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    present: "bg-[#edfbf3] text-[#0f7b43]",
    approved: "bg-[#edfbf3] text-[#0f7b43]",
    completed: "bg-[#edfbf3] text-[#0f7b43]",
    pending: "bg-[#fff8e6] text-[#c67c00]",
    in_progress: "bg-[#e8f4fd] text-[#2eaadc]",
    late: "bg-[#fff8e6] text-[#c67c00]",
    half_day: "bg-[#f0e8fd] text-[#9b59b6]",
    absent: "bg-[#fdecea] text-[#e03e3e]",
    rejected: "bg-[#fdecea] text-[#e03e3e]",
    inactive: "bg-[#f7f6f3] text-[#9b9a97]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${map[status] || "bg-[#f7f6f3] text-[#9b9a97]"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    high: "bg-[#fdecea] text-[#e03e3e]",
    medium: "bg-[#fff8e6] text-[#c67c00]",
    low: "bg-[#f7f6f3] text-[#9b9a97]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${map[priority] || "bg-[#f7f6f3] text-[#9b9a97]"}`}>
      {priority}
    </span>
  );
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-md text-sm shadow-lg ${
      type === "success" ? "bg-[#0f7b43] text-white" : "bg-[#e03e3e] text-white"
    }`}>
      {type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}
