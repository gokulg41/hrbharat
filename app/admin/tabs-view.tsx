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
  UserPlus,
  Users,
  CheckCircle2,
  MoreVertical,
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
  onAddEmployee?: () => void;
}

// ── Employee data-shape helpers ────────────────────────────────────────────────
// NOTE (source verification): the `employees` rows are fetched with
// `select('*, company_shifts(*)')`, so any real column on the table — even one
// this UI hasn't referenced before — is already present on each `emp` object.
// No `status` / `employment_type` column has been referenced anywhere else in
// this codebase, so these two readers are defensive (same fallback pattern the
// file already uses for `emp.department || 'Operations'`): if the column
// exists in Supabase, it's honored; if not, everyone safely defaults to
// Active / Full-time rather than the UI inventing or hiding people.
function getEmpStatus(emp: any): "active" | "on_leave" | "inactive" {
  const raw = String(emp?.status || "active").toLowerCase().replace(/\s+/g, "_");
  if (raw === "on_leave" || raw === "leave" || raw === "onleave") return "on_leave";
  if (raw === "inactive" || raw === "terminated" || raw === "resigned" || raw === "offboarded") return "inactive";
  return "active";
}
function getEmploymentType(emp: any): string {
  return emp?.employment_type || "Full-time";
}
function initialsFor(name: string) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
const AVATAR_HUES = [210, 160, 340, 30, 280, 195];
function hueFor(name: string) {
  return AVATAR_HUES[(name || "").charCodeAt(0) % AVATAR_HUES.length];
}
function formatINR(n: number) {
  return `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
}
function formatJoinDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function downloadCSV(rows: any[], filename: string) {
  const headers = ["Employee ID", "Name", "Department", "Designation", "Status", "Employment Type", "Join Date", "Monthly Salary"];
  const lines = rows.map((e) => [
    e.employee_code || "",
    e.full_name || "",
    e.department || "Operations",
    e.designation || "Staff",
    getEmpStatus(e),
    getEmploymentType(e),
    e.joining_date ? new Date(e.joining_date).toISOString().split("T")[0] : "",
    Number(e.monthly_salary) || 0,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function StatusPillEmp({ status }: { status: "active" | "on_leave" | "inactive" }) {
  const map = {
    active: "bg-status-success-bg text-status-success",
    on_leave: "bg-status-warning-bg text-status-warning",
    inactive: "bg-surface-card-hover text-ink-400",
  } as const;
  const label = { active: "Active", on_leave: "On Leave", inactive: "Inactive" }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function EmpMetricCard({
  icon, iconBg, iconColor, label, value, sub, subColor = "text-ink-400",
}: { icon: React.ReactNode; iconBg: string; iconColor: string; label: string; value: string; sub: string; subColor?: string }) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl px-4 py-3.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mb-2.5 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <span className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-400 block mb-0.5">{label}</span>
      <span className="text-xl font-bold text-ink-900 font-sans tabular-nums leading-none block">{value}</span>
      <span className={`text-[10px] font-sans block mt-1 ${subColor}`}>{sub}</span>
    </div>
  );
}

function EmployeesRosterView({
  employees,
  searchQuery,
  setSearchQuery,
  startEditing,
  onAddEmployee,
}: {
  employees: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  startEditing: (emp: any) => void;
  onAddEmployee?: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "on_leave" | "inactive">("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<null | "recent" | "anniversary">(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);
  const [deptExpanded, setDeptExpanded] = useState(false);

  const total = employees.length;
  const now = new Date();

  const statusCounts = React.useMemo(() => {
    const c = { active: 0, on_leave: 0, inactive: 0 };
    employees.forEach((e) => { c[getEmpStatus(e)]++; });
    return c;
  }, [employees]);

  const deptCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach((e) => { const d = e.department || "Operations"; map[d] = (map[d] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [employees]);

  const allDepts = React.useMemo(() => deptCounts.map(([d]) => d), [deptCounts]);
  const allTypes = React.useMemo(() => Array.from(new Set(employees.map((e) => getEmploymentType(e)))).sort(), [employees]);

  const newHiresThisMonth = React.useMemo(() => employees.filter((e) => {
    const d = e.joining_date ? new Date(e.joining_date) : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length, [employees]);

  const newHiresLastMonth = React.useMemo(() => {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return employees.filter((e) => {
      const d = e.joining_date ? new Date(e.joining_date) : null;
      return d && d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    }).length;
  }, [employees]);

  const recentJoiners = React.useMemo(() => employees.filter((e) => {
    if (!e.joining_date) return false;
    const diffDays = (now.getTime() - new Date(e.joining_date).getTime()) / 86400000;
    return diffDays >= 0 && diffDays <= 30;
  }), [employees]);

  const workAnniversaries = React.useMemo(() => employees.filter((e) => {
    if (!e.joining_date) return false;
    const d = new Date(e.joining_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() < now.getFullYear();
  }), [employees]);

  const filtered = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return employees.filter((e) => {
      if (q && !`${e.full_name} ${e.employee_code} ${e.department} ${e.designation} ${e.phone || ""}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && getEmpStatus(e) !== statusFilter) return false;
      if (deptFilter !== "all" && (e.department || "Operations") !== deptFilter) return false;
      if (typeFilter !== "all" && getEmploymentType(e) !== typeFilter) return false;
      if (quickFilter === "recent" && !recentJoiners.includes(e)) return false;
      if (quickFilter === "anniversary" && !workAnniversaries.includes(e)) return false;
      return true;
    });
  }, [employees, searchQuery, statusFilter, deptFilter, typeFilter, quickFilter, recentJoiners, workAnniversaries]);

  React.useEffect(() => { setPage(1); }, [searchQuery, statusFilter, deptFilter, typeFilter, quickFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const allOnPageSelected = paginated.length > 0 && paginated.every((e) => selected.has(e.id));
  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) paginated.forEach((e) => next.delete(e.id));
      else paginated.forEach((e) => next.add(e.id));
      return next;
    });
  };
  const toggleSelectOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const donutDeg = React.useMemo(() => {
    if (total === 0) return { active: 0, onLeave: 0 };
    const activeDeg = (statusCounts.active / total) * 360;
    const leaveDeg = (statusCounts.on_leave / total) * 360;
    return { active: activeDeg, onLeave: leaveDeg };
  }, [statusCounts, total]);

  const maxDeptCount = deptCounts.length > 0 ? deptCounts[0][1] : 1;
  const visibleDepts = deptExpanded ? deptCounts : deptCounts.slice(0, 6);

  const statusTabs: { id: "all" | "active" | "on_leave" | "inactive"; label: string; count: number }[] = [
    { id: "all", label: "All Employees", count: total },
    { id: "active", label: "Active", count: statusCounts.active },
    { id: "on_leave", label: "On Leave", count: statusCounts.on_leave },
    { id: "inactive", label: "Inactive", count: statusCounts.inactive },
  ];

  // ── Zero-state: no employees onboarded at all ──
  if (total === 0) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-ink-900 font-sans">Employees</h2>
          <p className="text-xs text-ink-600 font-sans mt-0.5">Manage your organization&apos;s employees and their information.</p>
        </div>
        <div className="bg-surface-card border border-border-subtle rounded-xl flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-subtle flex items-center justify-center">
            <Users className="w-6 h-6 text-brand" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-ink-900 font-sans">No employees yet</p>
            <p className="text-xs text-ink-400 font-sans max-w-xs">Start building your workforce by adding your first employee.</p>
          </div>
          <button
            onClick={onAddEmployee}
            className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-sans font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Employee
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page title */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900 font-sans">Employees</h2>
          <p className="text-xs text-ink-600 font-sans mt-0.5">Manage your organization&apos;s employees and their information.</p>
        </div>
        <button
          onClick={onAddEmployee}
          className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-sans font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add Employee
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <EmpMetricCard
          icon={<Users className="w-4 h-4" />} iconBg="bg-brand-subtle" iconColor="text-brand"
          label="Total Employees" value={String(total)}
          sub={newHiresThisMonth > 0 ? `+${newHiresThisMonth} this month` : "On the roster"}
          subColor={newHiresThisMonth > 0 ? "text-status-success" : "text-ink-400"}
        />
        <EmpMetricCard
          icon={<CheckCircle2 className="w-4 h-4" />} iconBg="bg-status-success-bg" iconColor="text-status-success"
          label="Active Employees" value={String(statusCounts.active)}
          sub={`${total > 0 ? Math.round((statusCounts.active / total) * 100) : 0}% of total`}
        />
        <EmpMetricCard
          icon={<Calendar className="w-4 h-4" />} iconBg="bg-status-warning-bg" iconColor="text-status-warning"
          label="On Leave" value={String(statusCounts.on_leave)}
          sub="Today"
        />
        <EmpMetricCard
          icon={<Building2 className="w-4 h-4" />} iconBg="bg-brand-subtle" iconColor="text-brand"
          label="Departments" value={String(allDepts.length)}
          sub="Across organization"
        />
        <EmpMetricCard
          icon={<UserPlus className="w-4 h-4" />} iconBg="bg-status-success-bg" iconColor="text-status-success"
          label="New Hires" value={String(newHiresThisMonth)}
          sub={newHiresThisMonth >= newHiresLastMonth ? `↑ vs last month (${newHiresLastMonth})` : `↓ vs last month (${newHiresLastMonth})`}
          subColor={newHiresThisMonth >= newHiresLastMonth ? "text-status-success" : "text-ink-400"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        {/* ── Left: filters + tabs + table ── */}
        <div className="space-y-4 min-w-0">
          {/* Search + filters */}
          <div className="bg-surface-card border border-border-subtle rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, ID or phone…"
                className="w-full pl-9 pr-3 py-2 text-xs font-sans text-ink-900 bg-surface-card border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="text-xs font-sans text-ink-900 bg-surface-card border border-border-subtle rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer">
                <option value="all">All Departments</option>
                {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs font-sans text-ink-900 bg-surface-card border border-border-subtle rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer">
                <option value="all">All Types</option>
                {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="text-xs font-sans text-ink-900 bg-surface-card border border-border-subtle rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="flex-1" />
              <button
                onClick={() => downloadCSV(filtered, `employees-${new Date().toISOString().split("T")[0]}.csv`)}
                className="flex items-center gap-1.5 text-xs font-sans font-medium text-ink-600 bg-surface-card border border-border-subtle rounded-lg px-3 py-1.5 hover:bg-surface-card-hover transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button
                disabled
                title="More filters coming soon"
                className="flex items-center gap-1.5 text-xs font-sans font-medium text-ink-400 bg-surface-card border border-border-subtle rounded-lg px-3 py-1.5 opacity-60 cursor-not-allowed"
              >
                <Filter className="w-3.5 h-3.5" /> More Filters
              </button>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center justify-between bg-brand-subtle border border-border-subtle rounded-lg px-3 py-2">
                <span className="text-[11px] font-sans font-medium text-brand">{selected.size} selected</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadCSV(employees.filter((e) => selected.has(e.id)), `employees-selected-${new Date().toISOString().split("T")[0]}.csv`)}
                    className="text-[11px] font-sans font-semibold text-brand hover:text-brand-hover cursor-pointer"
                  >
                    Export selected
                  </button>
                  <button onClick={() => setSelected(new Set())} className="p-0.5 rounded hover:bg-black/5 cursor-pointer">
                    <X className="w-3 h-3 text-brand" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-surface-card-hover p-1 rounded-lg border border-border-subtle w-fit max-w-full overflow-x-auto">
            {statusTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id)}
                className={`text-[11px] font-sans font-medium px-3 py-1.5 rounded-md cursor-pointer transition-all whitespace-nowrap ${
                  statusFilter === t.id ? "bg-surface-card text-ink-900 border border-border-subtle shadow-sm" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {t.label} <span className="text-ink-400">({t.count})</span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-canvas border-b border-border-subtle">
                  <tr>
                    <th className="px-4 py-2.5 w-8">
                      <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} className="cursor-pointer" />
                    </th>
                    <th className="text-left px-2 py-2.5 font-medium text-ink-400">Employee</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ink-400">Employee ID</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ink-400">Department</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ink-400">Designation</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ink-400">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ink-400">Join Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-ink-400">Salary</th>
                    <th className="text-right px-4 py-2.5 font-medium text-ink-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
                          <div className="w-11 h-11 rounded-full bg-brand-subtle flex items-center justify-center">
                            <Search className="w-5 h-5 text-brand" />
                          </div>
                          <p className="text-sm font-semibold text-ink-900">No matching employees</p>
                          <p className="text-xs text-ink-400 max-w-xs">Try a different name, code, department, or clear your filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.map((emp) => {
                    const status = getEmpStatus(emp);
                    return (
                      <tr key={emp.id} className="hover:bg-surface-card-hover">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelectOne(emp.id)} className="cursor-pointer" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-semibold shrink-0"
                              style={{ background: `hsl(${hueFor(emp.full_name)} 55% 88%)`, color: `hsl(${hueFor(emp.full_name)} 50% 35%)` }}
                            >
                              {initialsFor(emp.full_name)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-ink-900 truncate">{emp.full_name}</p>
                              <p className="text-ink-400 truncate">{emp.email || `${(emp.full_name || "").toLowerCase().replace(/\s+/g, ".")}@${(emp.employee_code || "hrbharat").toLowerCase()}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-600 font-mono">{emp.employee_code || "—"}</td>
                        <td className="px-4 py-3 text-ink-600">{emp.department || "Operations"}</td>
                        <td className="px-4 py-3 text-ink-600">{emp.designation || "Staff"}</td>
                        <td className="px-4 py-3"><StatusPillEmp status={status} /></td>
                        <td className="px-4 py-3 text-ink-600">{formatJoinDate(emp.joining_date)}</td>
                        <td className="px-4 py-3 text-ink-900 font-medium">{formatINR(emp.monthly_salary)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                setOpenMenu(openMenu?.id === emp.id ? null : { id: emp.id, top: r.bottom + 4, left: r.right - 128 });
                              }}
                              className="p-1 rounded hover:bg-surface-card-hover text-ink-400 hover:text-ink-900 cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border-subtle">
                <span className="text-[11px] text-ink-400 font-sans">
                  Showing {(pageSafe - 1) * pageSize + 1} to {Math.min(pageSafe * pageSize, filtered.length)} of {filtered.length} employees
                </span>
                <div className="flex items-center gap-2">
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="text-[11px] font-sans text-ink-900 bg-surface-card border border-border-subtle rounded-lg px-2 py-1 cursor-pointer">
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageSafe === 1}
                    className="p-1.5 rounded-lg border border-border-subtle text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-sans text-ink-600 px-1">{pageSafe} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageSafe === totalPages}
                    className="p-1.5 rounded-lg border border-border-subtle text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* Employee overview donut */}
          <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
            <h3 className="text-xs font-semibold text-ink-900 font-sans mb-4">Employee Overview</h3>
            <div className="relative w-[136px] h-[136px] mx-auto rounded-full mb-4" style={{
              background: `conic-gradient(var(--status-success) 0deg ${donutDeg.active}deg, var(--status-warning) ${donutDeg.active}deg ${donutDeg.active + donutDeg.onLeave}deg, var(--border-subtle) ${donutDeg.active + donutDeg.onLeave}deg 360deg)`,
            }}>
              <div className="absolute inset-[14px] rounded-full bg-surface-card flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-ink-900 font-sans">{total}</span>
                <span className="text-[9px] text-ink-400 font-sans">Total</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { label: "Active", count: statusCounts.active, color: "var(--status-success)" },
                { label: "On Leave", count: statusCounts.on_leave, color: "var(--status-warning)" },
                { label: "Inactive", count: statusCounts.inactive, color: "var(--border-hover)" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[11px] font-sans">
                  <span className="flex items-center gap-2 text-ink-600">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="text-ink-900 font-semibold tabular-nums">
                    {s.count} <span className="text-ink-400 font-normal">({total > 0 ? Math.round((s.count / total) * 100) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick filters — only ones supported by the current data model
              (no probation flag or DOB field exists on employees yet) */}
          <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
            <h3 className="text-xs font-semibold text-ink-900 font-sans mb-3">Quick Filters</h3>
            <div className="space-y-1">
              <button
                onClick={() => setQuickFilter(quickFilter === "recent" ? null : "recent")}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-sans transition-colors cursor-pointer ${quickFilter === "recent" ? "bg-brand-subtle text-brand font-semibold" : "text-ink-600 hover:bg-surface-card-hover"}`}
              >
                <span className="flex items-center gap-2"><UserPlus className="w-3.5 h-3.5" /> Recent Joiners</span>
                <span className="font-semibold">{recentJoiners.length}</span>
              </button>
              <button
                onClick={() => setQuickFilter(quickFilter === "anniversary" ? null : "anniversary")}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-sans transition-colors cursor-pointer ${quickFilter === "anniversary" ? "bg-brand-subtle text-brand font-semibold" : "text-ink-600 hover:bg-surface-card-hover"}`}
              >
                <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Work Anniversary</span>
                <span className="font-semibold">{workAnniversaries.length}</span>
              </button>
            </div>
          </div>

          {/* Department wise */}
          <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-ink-900 font-sans">Department Wise</h3>
              {deptCounts.length > 6 && (
                <button onClick={() => setDeptExpanded((v) => !v)} className="text-[10px] font-sans font-semibold text-brand hover:text-brand-hover cursor-pointer">
                  {deptExpanded ? "Show less" : "View all"}
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              {visibleDepts.map(([dept, count]) => (
                <div key={dept}>
                  <div className="flex items-center justify-between text-[11px] font-sans mb-1">
                    <span className="text-ink-600 truncate">{dept}</span>
                    <span className="text-ink-900 font-semibold tabular-nums">{count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-canvas rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(6, (count / maxDeptCount) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row action menu — rendered fixed-position (not nested in the scrollable
          table) so it can never be clipped by an ancestor's overflow rules. */}
      {openMenu && (() => {
        const emp = employees.find((e) => e.id === openMenu.id);
        if (!emp) return null;
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
            <div
              className="fixed z-50 w-32 bg-surface-card border border-border-subtle rounded-lg shadow-card overflow-hidden"
              style={{ top: openMenu.top, left: Math.max(8, openMenu.left) }}
            >
              <button
                onClick={() => { setViewingEmployee(emp); setOpenMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-sans text-ink-900 hover:bg-surface-card-hover cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              <button
                onClick={() => { startEditing(emp); setOpenMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-sans text-ink-900 hover:bg-surface-card-hover cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </>
        );
      })()}

      {/* View employee modal — read-only, existing data only */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 bg-brand/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingEmployee(null)}>
          <div className="bg-surface-card border border-border-subtle rounded-xl shadow-card w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900 font-sans">Employee Details</h3>
              <button onClick={() => setViewingEmployee(null)} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-surface-card-hover cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="border-t border-border-subtle" />
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center justify-center w-11 h-11 rounded-full text-xs font-semibold shrink-0"
                  style={{ background: `hsl(${hueFor(viewingEmployee.full_name)} 55% 88%)`, color: `hsl(${hueFor(viewingEmployee.full_name)} 50% 35%)` }}
                >
                  {initialsFor(viewingEmployee.full_name)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900 font-sans">{viewingEmployee.full_name}</p>
                  <p className="text-[11px] text-ink-400 font-sans font-mono">{viewingEmployee.employee_code}</p>
                </div>
                <span className="ml-auto"><StatusPillEmp status={getEmpStatus(viewingEmployee)} /></span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-sans pt-1">
                <div><p className="text-ink-400 mb-0.5">Department</p><p className="text-ink-900 font-medium">{viewingEmployee.department || "Operations"}</p></div>
                <div><p className="text-ink-400 mb-0.5">Designation</p><p className="text-ink-900 font-medium">{viewingEmployee.designation || "Staff"}</p></div>
                <div><p className="text-ink-400 mb-0.5">Join Date</p><p className="text-ink-900 font-medium">{formatJoinDate(viewingEmployee.joining_date)}</p></div>
                <div><p className="text-ink-400 mb-0.5">Monthly Salary</p><p className="text-ink-900 font-medium">{formatINR(viewingEmployee.monthly_salary)}</p></div>
                <div><p className="text-ink-400 mb-0.5">Bank Account</p><p className="text-ink-900 font-medium font-mono">{viewingEmployee.bank_account_number || "—"}</p></div>
                <div><p className="text-ink-400 mb-0.5">IFSC</p><p className="text-ink-900 font-medium font-mono">{viewingEmployee.ifsc_code || "—"}</p></div>
                {viewingEmployee.company_shifts && (
                  <div className="col-span-2"><p className="text-ink-400 mb-0.5">Shift</p><p className="text-ink-900 font-medium">{viewingEmployee.company_shifts.shift_name}</p></div>
                )}
              </div>
              <button
                onClick={() => { startEditing(viewingEmployee); setViewingEmployee(null); }}
                className="w-full flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-sans font-semibold py-2.5 rounded-lg transition-colors cursor-pointer mt-1"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  onAddEmployee,
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

  // ── Roster / Employees tab ─────────────────────────────────────────────────
  if (activeTab === "roster") {
    return (
      <>
        <EmployeesRosterView
          employees={employees}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          startEditing={startEditing}
          onAddEmployee={onAddEmployee}
        />
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </>
    );
  }

  // ── Leaves tab ───────────────────────────────────────────────────────────────
  if (activeTab === "leaves") {
    return (
      <div className="space-y-4 p-4">
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-canvas border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Duration</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Reason</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {leaveRequests.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-ink-400">No pending leave requests</td></tr>
              ) : leaveRequests.map((r) => (
                <tr key={r.id} className="hover:bg-surface-card-hover">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{r.employee_name}</p>
                    <p className="text-ink-400">{r.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600 capitalize">{r.leave_type}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {r.start_date} → {r.end_date}
                  </td>
                  <td className="px-4 py-3 text-ink-600 max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleLeaveStatus(r.id, "approved")}
                        className="p-1 rounded hover:bg-emerald-50 text-ink-400 hover:text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleLeaveStatus(r.id, "rejected")}
                        className="p-1 rounded hover:bg-rose-50 text-ink-400 hover:text-rose-500">
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
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-canvas border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Amount</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Reason</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Requested</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {advanceRequests.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-ink-400">No pending advance requests</td></tr>
              ) : advanceRequests.map((r) => (
                <tr key={r.id} className="hover:bg-surface-card-hover">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{r.employee_name}</p>
                    <p className="text-ink-400">{r.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    ₹{Number(r.requested_amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-ink-600 max-w-[180px] truncate">{r.reason}</td>
                  <td className="px-4 py-3 text-ink-400">
                    {new Date(r.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleAdvanceStatus(r.id, "approved")}
                        className="p-1 rounded hover:bg-emerald-50 text-ink-400 hover:text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleAdvanceStatus(r.id, "rejected")}
                        className="p-1 rounded hover:bg-rose-50 text-ink-400 hover:text-rose-500">
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
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-canvas border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Tasks</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {dailyTaskLogs.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-ink-400">No task logs yet</td></tr>
              ) : dailyTaskLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-card-hover">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{log.employee_name}</p>
                    <p className="text-ink-400">{log.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600 max-w-[300px]">
                    {log.task_priorities?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {log.task_priorities.map((t: string, i: number) => (
                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-card-hover text-ink-600">{t}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-ink-400 italic">No tasks listed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-400">
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
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-canvas border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Requested Times</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Reason</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {regularizations.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-ink-400">No pending corrections</td></tr>
              ) : regularizations.map((r) => (
                <tr key={r.id} className="hover:bg-surface-card-hover">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{r.employee_name}</p>
                    <p className="text-ink-400">{r.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {r.date ? new Date(r.date).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {r.requested_check_in || "—"} → {r.requested_check_out || "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-600 max-w-[180px] truncate">{r.reason}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRegularizationStatus(r.id, "approved")}
                        className="p-1 rounded hover:bg-emerald-50 text-ink-400 hover:text-emerald-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleRegularizationStatus(r.id, "rejected")}
                        className="p-1 rounded hover:bg-rose-50 text-ink-400 hover:text-rose-500">
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
        <div className="bg-surface-canvas border border-border-subtle rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-ink-600 font-medium">Total Monthly Liability</span>
          <span className="text-sm font-bold text-ink-900">₹{total.toLocaleString("en-IN")}</span>
        </div>
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-canvas border-b border-border-subtle">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Employee</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Department</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Gross Salary</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">Bank Account</th>
                <th className="text-left px-4 py-2.5 font-medium text-ink-400">IFSC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {employees.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-ink-400">No employees on roster</td></tr>
              ) : employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-surface-card-hover">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{emp.full_name}</p>
                    <p className="text-ink-400">{emp.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{emp.department || "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    ₹{Number(emp.monthly_salary || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-ink-600 font-mono">{emp.bank_account_number || "—"}</td>
                  <td className="px-4 py-3 text-ink-600 font-mono">{emp.ifsc_code || "—"}</td>
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
        <div className="border border-border-subtle rounded-lg overflow-hidden divide-y divide-border-subtle max-h-[500px] overflow-y-auto">
          {systemLogs.length === 0 ? (
            <p className="text-center py-10 text-xs text-ink-400">No audit events logged yet</p>
          ) : systemLogs.map((log) => (
            <div key={log.id} className="px-4 py-3 flex justify-between gap-3 hover:bg-surface-card-hover">
              <p className="text-xs text-ink-900">
                <span className="font-semibold text-ink-900">[{log.event_type || "SYSTEM"}]</span>{" "}
                {log.description}
              </p>
              <span className="text-[11px] text-ink-400 shrink-0 tabular-nums">
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