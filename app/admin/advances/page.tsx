"use client";

/* ─────────────────────────────────────────────────────────────────────────
   ADVANCES PAGE
   Route: app/admin/advances/page.tsx

   WIRING NOTES
   ─────────────────────────────
   This reads from your real `advance_salary_requests` table, joined to
   `employees` for name/code/department. It expects the extra columns added
   by `migration_add_advance_type_and_repayment.sql` (type, repayment_monthly,
   repayment_total_installments, repayment_paid_installments,
   balance_remaining, repaid_on) — run that migration first.

   Until the migration is applied (or if the query fails for any other
   reason), the page falls back to DEMO DATA with a visible banner, so demo
   numbers are never mistaken for real ones.

   `status` is compared case-insensitively — your live data has 'Approved'
   (capitalized) while the column default is 'pending' (lowercase), so the
   frontend normalizes rather than assuming one casing.

   Still TODO / not wired in this pass (flagging rather than guessing):
   - Approve / Reject / Mark as repaid actions (the eye + three-dot buttons
     in the table are placeholders)
   - "Repaid This Month" is computed across all time, not scoped to the
     calendar month, since there's no month-boundary logic yet
───────────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  Plus,
  Filter,
  Calendar,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Clock3,
  ShieldCheck,
  RefreshCw,
  HeartPulse,
  X,
  Info,
} from "lucide-react";

/* ───────────────────────────── Types ───────────────────────────── */

type AdvanceType = "salary" | "medical" | "emergency" | "festival" | "other";
type AdvanceStatus = "pending" | "approved" | "repaid" | "rejected" | "cancelled";

interface AdvanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  type: AdvanceType;
  amount: number;
  requestedOn: string; // ISO date
  status: AdvanceStatus;
  reason?: string | null;
  repaymentMonthly?: number | null;
  repaymentPaidInstallments?: number | null;
  repaymentTotalInstallments?: number | null;
  balanceRemaining?: number | null;
  repaidOn?: string | null;
}

interface EmployeeOption {
  id: string;
  fullName: string;
  employeeCode: string;
  department: string;
}

const ADVANCE_TYPE_LABEL: Record<AdvanceType, string> = {
  salary: "Salary Advance",
  medical: "Medical Advance",
  emergency: "Emergency Advance",
  festival: "Festival Advance",
  other: "Other Advance",
};

const STATUS_LABEL: Record<AdvanceStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  repaid: "Repaid",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// Your live data has statuses like 'Approved' (capitalized) while the column
// default is 'pending' (lowercase) — normalize instead of assuming casing.
function normalizeStatus(raw: string): AdvanceStatus {
  const s = (raw || "").trim().toLowerCase();
  if (s === "pending" || s === "pending approval") return "pending";
  if (s === "approved") return "approved";
  if (s === "repaid" || s === "settled" || s === "closed") return "repaid";
  if (s === "rejected" || s === "declined") return "rejected";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "pending"; // unseen value — safest bucket rather than silently dropping the row
}

function normalizeType(raw: string | null | undefined): AdvanceType {
  const t = (raw || "").trim().toLowerCase();
  if (t === "salary" || t === "medical" || t === "emergency" || t === "festival") return t;
  return "other";
}

/* ───────────────────────── Demo data (fallback only) ─────────────────────────
   Used ONLY when the real table/columns can't be read. Never treated as
   real — the page always shows a banner while this is in use.
──────────────────────────────────────────────────────────────────────────── */

function buildDemoData(): AdvanceRequest[] {
  const rows: Array<Omit<AdvanceRequest, "id" | "employeeId">> = [
    { employeeName: "Arjun Singh", employeeCode: "EMP001", department: "Marketing", type: "salary", amount: 25000, requestedOn: "2026-08-14T10:30:00", status: "pending" },
    { employeeName: "Neha Sharma", employeeCode: "EMP002", department: "Design", type: "medical", amount: 15000, requestedOn: "2026-08-13T16:15:00", status: "approved", repaymentMonthly: 5000, repaymentPaidInstallments: 3, repaymentTotalInstallments: 3, balanceRemaining: 0 },
    { employeeName: "Rahul Patel", employeeCode: "EMP003", department: "Engineering", type: "salary", amount: 50000, requestedOn: "2026-08-12T11:20:00", status: "approved", repaymentMonthly: 10000, repaymentPaidInstallments: 2, repaymentTotalInstallments: 5, balanceRemaining: 30000 },
    { employeeName: "Divya Kapoor", employeeCode: "EMP004", department: "HR", type: "emergency", amount: 20000, requestedOn: "2026-08-10T14:45:00", status: "repaid", repaidOn: "2026-08-18T00:00:00", balanceRemaining: 0 },
    { employeeName: "Manish Kumar", employeeCode: "EMP005", department: "Finance", type: "festival", amount: 30000, requestedOn: "2026-08-09T09:10:00", status: "pending" },
    { employeeName: "Sneha Reddy", employeeCode: "EMP006", department: "Operations", type: "salary", amount: 40000, requestedOn: "2026-08-08T15:30:00", status: "approved", repaymentMonthly: 10000, repaymentPaidInstallments: 1, repaymentTotalInstallments: 5, balanceRemaining: 32000 },
    { employeeName: "Vikram Joshi", employeeCode: "EMP007", department: "Support", type: "medical", amount: 10000, requestedOn: "2026-08-07T13:05:00", status: "rejected" },
    { employeeName: "Pooja Tiwari", employeeCode: "EMP008", department: "Marketing", type: "emergency", amount: 12000, requestedOn: "2026-08-06T12:20:00", status: "cancelled" },
    { employeeName: "Karan Mehta", employeeCode: "EMP009", department: "Engineering", type: "salary", amount: 35000, requestedOn: "2026-08-05T09:50:00", status: "approved", repaymentMonthly: 7000, repaymentPaidInstallments: 1, repaymentTotalInstallments: 5, balanceRemaining: 28000 },
    { employeeName: "Ananya Iyer", employeeCode: "EMP010", department: "Design", type: "festival", amount: 18000, requestedOn: "2026-08-04T17:40:00", status: "repaid", repaidOn: "2026-08-14T00:00:00", balanceRemaining: 0 },
    { employeeName: "Rohit Malhotra", employeeCode: "EMP011", department: "Finance", type: "medical", amount: 22000, requestedOn: "2026-08-03T10:05:00", status: "pending" },
    { employeeName: "Priya Nair", employeeCode: "EMP012", department: "HR", type: "salary", amount: 45000, requestedOn: "2026-08-02T11:30:00", status: "approved", repaymentMonthly: 9000, repaymentPaidInstallments: 4, repaymentTotalInstallments: 5, balanceRemaining: 9000 },
    { employeeName: "Aditya Rao", employeeCode: "EMP013", department: "Operations", type: "emergency", amount: 16000, requestedOn: "2026-08-01T08:55:00", status: "rejected" },
    { employeeName: "Meera Pillai", employeeCode: "EMP014", department: "Support", type: "salary", amount: 28000, requestedOn: "2026-07-30T14:10:00", status: "repaid", repaidOn: "2026-08-05T00:00:00", balanceRemaining: 0 },
    { employeeName: "Suresh Menon", employeeCode: "EMP015", department: "Engineering", type: "festival", amount: 20000, requestedOn: "2026-07-29T09:25:00", status: "pending" },
    { employeeName: "Kavya Krishnan", employeeCode: "EMP016", department: "Marketing", type: "medical", amount: 13000, requestedOn: "2026-07-28T16:00:00", status: "approved", repaymentMonthly: 6500, repaymentPaidInstallments: 1, repaymentTotalInstallments: 2, balanceRemaining: 6500 },
  ];
  return rows.map((r, i) => ({ id: `demo-${i + 1}`, employeeId: `demo-emp-${i + 1}`, ...r }));
}

/* ───────────────────────── Data access ───────────────────────── */

async function getCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  return profile?.company_id ?? null;
}

async function fetchAdvanceRequests(companyId: string | null): Promise<{ rows: AdvanceRequest[]; isDemo: boolean }> {
  try {
    let query = supabase
      .from("advance_salary_requests")
      .select(
        `
        id,
        employee_id,
        requested_amount,
        reason,
        status,
        type,
        repayment_monthly,
        repayment_total_installments,
        repayment_paid_installments,
        balance_remaining,
        repaid_on,
        created_at,
        employees:employee_id ( full_name, employee_code, department )
      `
      )
      .order("created_at", { ascending: false });

    if (companyId) query = query.eq("company_id", companyId);

    const { data, error } = await query;
    if (error || !data) throw error ?? new Error("No data");

    const rows: AdvanceRequest[] = data.map((d: any) => ({
      id: d.id,
      employeeId: d.employee_id,
      employeeName: d.employees?.full_name ?? "Unknown employee",
      employeeCode: d.employees?.employee_code ?? "—",
      department: d.employees?.department ?? "—",
      type: normalizeType(d.type),
      amount: Number(d.requested_amount),
      requestedOn: d.created_at,
      status: normalizeStatus(d.status),
      reason: d.reason,
      repaymentMonthly: d.repayment_monthly,
      repaymentPaidInstallments: d.repayment_paid_installments,
      repaymentTotalInstallments: d.repayment_total_installments,
      balanceRemaining: d.balance_remaining,
      repaidOn: d.repaid_on,
    }));

    return { rows, isDemo: false };
  } catch {
    return { rows: buildDemoData(), isDemo: true };
  }
}

async function fetchEmployeeOptions(companyId: string | null): Promise<EmployeeOption[]> {
  try {
    let query = supabase.from("employees").select("id, full_name, employee_code, department").order("full_name");
    if (companyId) query = query.eq("company_id", companyId);
    const { data, error } = await query;
    if (error || !data) throw error ?? new Error("No data");
    return data.map((e: any) => ({
      id: e.id,
      fullName: e.full_name,
      employeeCode: e.employee_code ?? "—",
      department: e.department ?? "—",
    }));
  } catch {
    return [];
  }
}

/* ───────────────────────── Formatting helpers ───────────────────────── */

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatCompactLakh(amount: number): string {
  const lakhs = amount / 100000;
  return `₹${lakhs.toFixed(2)}L`;
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", weekday: "short" }).replace(",", " ·");
  return { date, time };
}

function initialsOf(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/* ───────────────────────── Small presentational bits ───────────────────────── */

function AdvanceTypeBadge({ type }: { type: AdvanceType }) {
  const styles: Record<AdvanceType, string> = {
    salary: "bg-brand-subtle text-brand",
    medical: "bg-[var(--accent-green-bg)] text-[var(--accent-green)]",
    emergency: "bg-status-danger-bg text-status-danger",
    festival: "bg-[var(--accent-violet-bg)] text-[var(--accent-violet)]",
    other: "bg-surface-card-hover text-ink-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold font-sans ${styles[type]}`}>
      {ADVANCE_TYPE_LABEL[type]}
    </span>
  );
}

function StatusBadge({ status }: { status: AdvanceStatus }) {
  const styles: Record<AdvanceStatus, string> = {
    pending: "bg-status-warning-bg text-status-warning",
    approved: "bg-status-success-bg text-status-success",
    repaid: "bg-surface-card-hover text-ink-600",
    rejected: "bg-status-danger-bg text-status-danger",
    cancelled: "bg-surface-card-hover text-ink-400",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold font-sans ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ───────────────────────── KPI cards ───────────────────────── */

interface KpiDef {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  iconWrap: string;
  iconColor: string;
}

function KpiCards({ kpis }: { kpis: KpiDef[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div key={k.label} className="bg-surface-card border border-border-subtle rounded-xl shadow-card p-4 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${k.iconWrap}`}>
              <Icon className={`w-4 h-4 ${k.iconColor}`} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 font-sans mb-1">{k.label}</p>
              <p className="text-xl font-bold text-ink-900 font-sans leading-tight">{k.value}</p>
              <p className="text-xs text-ink-600 font-sans mt-0.5">{k.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Donut chart (pure SVG, no chart lib) ───────────────────────── */

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ slices, centerLabel, centerSub }: { slices: DonutSlice[]; centerLabel: string; centerSub: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-[150px] h-[150px] shrink-0">
        <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
          <circle cx="75" cy="75" r={radius} fill="none" stroke="var(--surface-card-hover)" strokeWidth="18" />
          {slices.map((s) => {
            const fraction = s.value / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const circle = (
              <circle
                key={s.label}
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offsetAcc}
                strokeLinecap="butt"
              />
            );
            offsetAcc += dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-ink-900 font-sans leading-none">{centerLabel}</span>
          <span className="text-[10px] text-ink-400 font-sans mt-1">{centerSub}</span>
        </div>
      </div>
      <div className="space-y-2 min-w-0">
        {slices.map((s) => (
          <div key={s.label} className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: s.color }} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink-900 font-sans truncate">{s.label}</p>
              <p className="text-[11px] text-ink-400 font-sans">
                {formatCompactLakh(s.value)} ({((s.value / total) * 100).toFixed(1)}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Request Advance modal ─────────────────────────
   Employee is picked from a real dropdown (your table needs a real
   employee_id FK — free-text name entry isn't valid here).
──────────────────────────────────────────────────────────────────────── */

function RequestAdvanceModal({
  employees,
  companyId,
  onClose,
  onSubmitted,
}: {
  employees: EmployeeOption[];
  companyId: string | null;
  onClose: () => void;
  onSubmitted: (req: AdvanceRequest) => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<AdvanceType>("salary");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("1");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const numericAmount = Number(amount);
  const numericInstallments = Math.max(1, Number(installments) || 1);
  const canSubmit = employeeId && numericAmount > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedEmployee) {
      setError("Pick an employee and enter a valid amount before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const monthly = Math.round(numericAmount / numericInstallments);

    try {
      const { data, error: insertError } = await supabase
        .from("advance_salary_requests")
        .insert({
          company_id: companyId,
          employee_id: employeeId,
          requested_amount: numericAmount,
          reason: reason || null,
          status: "pending",
          type,
          repayment_monthly: monthly,
          repayment_total_installments: numericInstallments,
          repayment_paid_installments: 0,
          balance_remaining: numericAmount,
        })
        .select()
        .single();

      if (insertError || !data) throw insertError ?? new Error("Insert failed");

      onSubmitted({
        id: data.id,
        employeeId,
        employeeName: selectedEmployee.fullName,
        employeeCode: selectedEmployee.employeeCode,
        department: selectedEmployee.department,
        type,
        amount: numericAmount,
        requestedOn: data.created_at,
        status: "pending",
        reason,
        repaymentMonthly: monthly,
        repaymentTotalInstallments: numericInstallments,
        repaymentPaidInstallments: 0,
        balanceRemaining: numericAmount,
      });
    } catch {
      setError("Couldn't submit the request — check the table/columns exist (see migration) and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-card border border-border-subtle rounded-xl shadow-xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-900 font-sans">Request Advance</h2>
            <p className="text-xs text-ink-600 font-sans mt-0.5">Raise an advance request on behalf of an employee.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-ink-400 hover:bg-surface-card-hover hover:text-ink-900 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1">Employee</label>
            {employees.length === 0 ? (
              <p className="text-xs text-ink-400 font-sans border border-border-subtle rounded-lg px-3 py-2">
                No employees found for this company yet.
              </p>
            ) : (
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full text-sm border border-border-subtle rounded-lg px-3 py-2 font-sans outline-none focus:border-brand"
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} · {e.employeeCode} · {e.department}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1">Advance type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AdvanceType)}
                className="w-full text-sm border border-border-subtle rounded-lg px-3 py-2 font-sans outline-none focus:border-brand"
              >
                {(Object.keys(ADVANCE_TYPE_LABEL) as AdvanceType[]).map((t) => (
                  <option key={t} value={t}>
                    {ADVANCE_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1">Amount (₹)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="25000"
                inputMode="numeric"
                className="w-full text-sm border border-border-subtle rounded-lg px-3 py-2 font-sans outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1">Repay over (installments)</label>
            <input
              value={installments}
              onChange={(e) => setInstallments(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="1"
              inputMode="numeric"
              className="w-full text-sm border border-border-subtle rounded-lg px-3 py-2 font-sans outline-none focus:border-brand"
            />
            {numericAmount > 0 && (
              <p className="text-[11px] text-ink-400 font-sans mt-1">
                ≈ {formatINR(monthlyPreview(numericAmount, numericInstallments))} / month for {numericInstallments} month{numericInstallments > 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs block mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Brief note for the approver..."
              className="w-full text-sm border border-border-subtle rounded-lg px-3 py-2 font-sans outline-none focus:border-brand resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-status-danger font-sans flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-medium font-sans px-4 py-2 rounded-lg border border-border-subtle text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || employees.length === 0}
            className="flex-1 text-sm font-semibold font-sans px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function monthlyPreview(amount: number, installments: number): number {
  return Math.round(amount / Math.max(1, installments));
}

/* ───────────────────────── Main page ───────────────────────── */

type TabKey = "all" | AdvanceStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All Requests" },
  { key: "pending", label: "Pending Approval" },
  { key: "approved", label: "Approved" },
  { key: "repaid", label: "Repaid" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
];

const DONUT_COLORS: Record<AdvanceType, string> = {
  salary: "#1e40af",
  medical: "#15803d",
  emergency: "#b91c1c",
  festival: "#7c3aed",
  other: "#94a3b8",
};

export default function AdvancesPage() {
  const [adminName, setAdminName] = useState("there");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Advance Types");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadState("loading");
    try {
      const cid = await getCompanyId();
      setCompanyId(cid);
      const [{ rows, isDemo: demo }, emps] = await Promise.all([fetchAdvanceRequests(cid), fetchEmployeeOptions(cid)]);
      setRequests(rows);
      setEmployees(emps);
      setIsDemo(demo);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    async function getAdminName() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (profile?.full_name) setAdminName(profile.full_name.split(" ")[0]);
    }
    getAdminName();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, department, statusFilter, typeFilter]);

  const departments = useMemo(
    () => ["All Departments", ...Array.from(new Set(requests.map((r) => r.department))).sort()],
    [requests]
  );

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: requests.length, pending: 0, approved: 0, repaid: 0, rejected: 0, cancelled: 0 };
    requests.forEach((r) => (counts[r.status] += 1));
    return counts;
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab !== "all" && r.status !== activeTab) return false;
      if (statusFilter !== "All Status" && STATUS_LABEL[r.status] !== statusFilter) return false;
      if (typeFilter !== "All Advance Types" && ADVANCE_TYPE_LABEL[r.type] !== typeFilter) return false;
      if (department !== "All Departments" && r.department !== department) return false;
      if (search.trim() && !r.employeeName.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [requests, activeTab, statusFilter, typeFilter, department, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const kpiData = useMemo(() => {
    const sumWhere = (pred: (r: AdvanceRequest) => boolean) => requests.filter(pred).reduce((s, r) => s + r.amount, 0);
    const countWhere = (pred: (r: AdvanceRequest) => boolean) => requests.filter(pred).length;

    const totalAdvances = requests.reduce((s, r) => s + r.amount, 0);
    const pendingSum = sumWhere((r) => r.status === "pending");
    const approvedSum = sumWhere((r) => r.status === "approved");
    const repaidSum = sumWhere((r) => r.status === "repaid");
    // Outstanding = whatever balance is still owed across all requests (repaid rows carry 0).
    const outstandingSum = requests.reduce((s, r) => s + (r.balanceRemaining ?? 0), 0);
    const outstandingCount = requests.filter((r) => (r.balanceRemaining ?? 0) > 0).length;

    const kpis: KpiDef[] = [
      { label: "Total Advances", value: formatINR(totalAdvances), sub: "This month", icon: Wallet, iconWrap: "bg-brand-subtle", iconColor: "text-brand" },
      { label: "Pending Approval", value: formatINR(pendingSum), sub: `${countWhere((r) => r.status === "pending")} Requests`, icon: Clock3, iconWrap: "bg-status-warning-bg", iconColor: "text-status-warning" },
      { label: "Approved", value: formatINR(approvedSum), sub: `${countWhere((r) => r.status === "approved")} Requests`, icon: ShieldCheck, iconWrap: "bg-status-success-bg", iconColor: "text-status-success" },
      { label: "Repaid This Month", value: formatINR(repaidSum), sub: `${countWhere((r) => r.status === "repaid")} Settlements`, icon: RefreshCw, iconWrap: "bg-[var(--accent-violet-bg)]", iconColor: "text-[var(--accent-violet)]" },
      { label: "Outstanding", value: formatINR(outstandingSum), sub: `${outstandingCount} Active`, icon: HeartPulse, iconWrap: "bg-status-danger-bg", iconColor: "text-status-danger" },
    ];

    return { kpis, totalAdvances, outstandingSum, repaidSum };
  }, [requests]);

  const averageAdvance = requests.length ? Math.round(kpiData.totalAdvances / requests.length) : 0;

  const donutSlices: DonutSlice[] = useMemo(() => {
    const byType = (Object.keys(ADVANCE_TYPE_LABEL) as AdvanceType[]).map((t) => ({
      label: ADVANCE_TYPE_LABEL[t],
      value: requests.filter((r) => r.type === t).reduce((s, r) => s + r.amount, 0),
      color: DONUT_COLORS[t],
    }));
    return byType.filter((s) => s.value > 0);
  }, [requests]);

  const handleSubmitted = (newRequest: AdvanceRequest) => {
    setRequests((prev) => [newRequest, ...prev]);
    setShowModal(false);
    setToast("Advance request submitted.");
  };

  const hour = new Date().getHours();

  return (
    <div className="min-h-screen bg-surface-canvas">
      {/* ── Top header ── */}
      <header className="border-b border-border-subtle bg-surface-card px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-ink-900 font-sans flex items-center gap-1.5">
            {greetingFor(hour)}, {adminName} <span aria-hidden>👋</span>
          </h1>
          <p className="text-xs text-ink-400 font-sans mt-0.5">
            Advances <span className="mx-1">›</span> Overview
          </p>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end min-w-[260px]">
          <div className="relative flex-1 max-w-sm hidden sm:block">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search employees by name, department..."
              className="w-full text-sm border border-border-subtle rounded-lg pl-9 pr-10 py-2 font-sans outline-none focus:border-brand"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-400 border border-border-subtle rounded px-1.5 py-0.5 font-sans">⌘K</kbd>
          </div>
          <button className="relative p-2 rounded-lg text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer" aria-label="Notifications">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-status-danger text-white text-[9px] font-bold flex items-center justify-center">3</span>
          </button>
          <button className="p-2 rounded-lg text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer" aria-label="Help">
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
          <button className="flex items-center gap-1 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-brand text-white text-xs font-semibold font-sans flex items-center justify-center">
              {initialsOf(adminName === "there" ? "Admin" : adminName)}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-ink-400" />
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink-900 font-sans">Advances</h2>
            <p className="text-sm text-ink-600 font-sans mt-1">Manage employee advance requests, approvals and repayments.</p>
          </div>
          <div className="flex items-stretch">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold font-sans pl-4 pr-3 py-2.5 rounded-l-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Request Advance
            </button>
            <button className="flex items-center px-2.5 rounded-r-lg bg-brand hover:bg-brand-hover text-white border-l border-white/20 transition-colors cursor-pointer">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isDemo && (
          <div className="flex items-start gap-2.5 bg-status-warning-bg border border-status-warning/20 text-status-warning rounded-lg px-4 py-3 text-xs font-sans">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Showing example data — <code className="font-mono">advance_salary_requests</code> couldn't be read with the
              expected columns. Run <code className="font-mono">migration_add_advance_type_and_repayment.sql</code> if you
              haven't yet, then refresh.
            </span>
          </div>
        )}

        {loadState === "error" && (
          <div className="bg-status-danger-bg border border-status-danger/20 text-status-danger rounded-lg px-4 py-3 text-sm font-sans">
            Couldn't load advance requests right now.{" "}
            <button onClick={loadData} className="underline font-medium cursor-pointer">
              Try again
            </button>
          </div>
        )}

        {loadState === "loading" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[104px] rounded-xl bg-surface-card border border-border-subtle animate-pulse" />
            ))}
          </div>
        ) : (
          <KpiCards kpis={kpiData.kpis} />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="bg-surface-card border border-border-subtle rounded-xl shadow-card overflow-hidden">
            <div className="flex items-center gap-5 px-5 pt-4 border-b border-border-subtle overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`pb-3 text-sm font-sans whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                    activeTab === t.key ? "text-brand border-brand font-semibold" : "text-ink-600 border-transparent hover:text-ink-900"
                  }`}
                >
                  {t.label}
                  {t.key !== "all" && ` (${tabCounts[t.key]})`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 px-5 py-3.5 flex-wrap border-b border-border-subtle">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-ink-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by employee name..."
                  className="w-full text-xs border border-border-subtle rounded-lg pl-8 pr-3 py-2 font-sans outline-none focus:border-brand"
                />
              </div>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="text-xs border border-border-subtle rounded-lg px-3 py-2 font-sans outline-none focus:border-brand text-ink-600">
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-border-subtle rounded-lg px-3 py-2 font-sans outline-none focus:border-brand text-ink-600">
                <option>All Status</option>
                {Object.values(STATUS_LABEL).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs border border-border-subtle rounded-lg px-3 py-2 font-sans outline-none focus:border-brand text-ink-600">
                <option>All Advance Types</option>
                {Object.values(ADVANCE_TYPE_LABEL).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button className="flex items-center gap-1.5 text-xs border border-border-subtle rounded-lg px-3 py-2 font-sans text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer">
                <Calendar className="w-3.5 h-3.5" /> 01 Aug 2026 – 31 Aug 2026
              </button>
              <button className="flex items-center gap-1.5 text-xs border border-border-subtle rounded-lg px-3 py-2 font-sans text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer">
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
            </div>

            {loadState === "loading" ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-surface-card-hover animate-pulse" />
                ))}
              </div>
            ) : pageRows.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center px-6">
                <div className="w-12 h-12 rounded-full bg-surface-card-hover flex items-center justify-center mb-3">
                  <Wallet className="w-5 h-5 text-ink-400" />
                </div>
                <p className="text-sm font-semibold text-ink-900 font-sans">No matching requests</p>
                <p className="text-xs text-ink-600 font-sans mt-1 max-w-xs">Try a different tab, or clear search and filters to see all advance requests.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-ink-400 font-sans border-b border-border-subtle">
                        <th className="px-5 py-3 font-semibold">Employee</th>
                        <th className="px-3 py-3 font-semibold">Advance Type</th>
                        <th className="px-3 py-3 font-semibold">Amount</th>
                        <th className="px-3 py-3 font-semibold">Requested On</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 font-semibold">Repayment</th>
                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r) => {
                        const { date, time } = formatDate(r.requestedOn);
                        return (
                          <tr key={r.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-card-hover/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-brand-subtle text-brand text-xs font-semibold font-sans flex items-center justify-center shrink-0">
                                  {initialsOf(r.employeeName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-ink-900 font-sans truncate">{r.employeeName}</p>
                                  <p className="text-xs text-ink-400 font-sans truncate">
                                    {r.employeeCode} · {r.department}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3.5">
                              <AdvanceTypeBadge type={r.type} />
                            </td>
                            <td className="px-3 py-3.5 font-mono font-medium text-ink-900">{formatINR(r.amount)}</td>
                            <td className="px-3 py-3.5">
                              <p className="text-ink-900 font-sans">{date}</p>
                              <p className="text-xs text-ink-400 font-sans">{time}</p>
                            </td>
                            <td className="px-3 py-3.5">
                              <StatusBadge status={r.status} />
                            </td>
                            <td className="px-3 py-3.5 font-sans">
                              {r.status === "approved" && r.repaymentMonthly ? (
                                <>
                                  <p className="text-ink-900">{formatINR(r.repaymentMonthly)} / month</p>
                                  <p className="text-xs text-ink-400">
                                    {r.repaymentPaidInstallments ?? 0} of {r.repaymentTotalInstallments ?? "?"} paid
                                  </p>
                                </>
                              ) : r.status === "repaid" ? (
                                <>
                                  <p className="text-ink-900">{formatINR(r.amount)}</p>
                                  <p className="text-xs text-ink-400">{r.repaidOn ? `Paid on ${formatDate(r.repaidOn).date}` : "Paid"}</p>
                                </>
                              ) : (
                                <span className="text-ink-400">–</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <button title="View details" className="p-1.5 rounded-lg border border-border-subtle text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button title="More actions" className="p-1.5 rounded-lg border border-border-subtle text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer">
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

                <div className="md:hidden divide-y divide-border-subtle">
                  {pageRows.map((r) => {
                    const { date, time } = formatDate(r.requestedOn);
                    return (
                      <div key={r.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-brand-subtle text-brand text-xs font-semibold font-sans flex items-center justify-center shrink-0">
                              {initialsOf(r.employeeName)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-ink-900 font-sans text-sm truncate">{r.employeeName}</p>
                              <p className="text-xs text-ink-400 font-sans truncate">
                                {r.employeeCode} · {r.department}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="flex items-center justify-between text-xs font-sans">
                          <AdvanceTypeBadge type={r.type} />
                          <span className="font-mono font-semibold text-ink-900">{formatINR(r.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-sans text-ink-400">
                          <span>
                            {date} · {time}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button className="p-1.5 rounded-lg border border-border-subtle text-ink-600 cursor-pointer">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 rounded-lg border border-border-subtle text-ink-600 cursor-pointer">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3.5 border-t border-border-subtle">
                  <p className="text-xs text-ink-600 font-sans">
                    Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filtered.length)} of {filtered.length} requests
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-600 font-sans">Rows per page</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setPage(1);
                      }}
                      className="text-xs border border-border-subtle rounded-lg px-2 py-1.5 font-sans outline-none"
                    >
                      {[10, 20, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg border border-border-subtle text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`w-7 h-7 rounded-lg text-xs font-sans transition-colors cursor-pointer ${
                          page === i + 1 ? "bg-brand text-white font-semibold" : "border border-border-subtle text-ink-600 hover:bg-surface-card-hover"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-border-subtle text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-surface-card border border-border-subtle rounded-xl shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink-900 font-sans">Advance Summary</h3>
                <button className="text-xs text-brand font-medium font-sans hover:underline cursor-pointer">View all</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Total Advances", value: kpiData.totalAdvances, icon: Wallet, color: "text-brand" },
                  { label: "Outstanding Amount", value: kpiData.outstandingSum, icon: Clock3, color: "text-status-warning" },
                  { label: "Repaid This Month", value: kpiData.repaidSum, icon: ShieldCheck, color: "text-status-success" },
                  { label: "Average Advance", value: averageAdvance, icon: RefreshCw, color: "text-[var(--accent-violet)]" },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${row.color}`} />
                        <span className="text-xs text-ink-600 font-sans">{row.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-ink-900 font-sans font-mono">{formatINR(row.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-surface-card border border-border-subtle rounded-xl shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-ink-900 font-sans">Advance by Type</h3>
                <span className="text-xs text-ink-400 font-sans">This month</span>
              </div>
              {donutSlices.length > 0 ? (
                <DonutChart slices={donutSlices} centerLabel={formatCompactLakh(kpiData.totalAdvances)} centerSub="Total" />
              ) : (
                <p className="text-xs text-ink-400 font-sans">No advances recorded yet.</p>
              )}
            </div>

            <div className="bg-surface-card border border-border-subtle rounded-xl shadow-card p-5">
              <h3 className="text-sm font-semibold text-ink-900 font-sans mb-3">Quick Actions</h3>
              <div className="space-y-1">
                {[
                  { label: "Request Advance", icon: Plus, action: () => setShowModal(true) },
                  { label: "Approve Requests", icon: ShieldCheck, action: () => setActiveTab("pending") },
                  { label: "Advance Policy", icon: Info, action: () => setToast("Advance policy page isn't wired up yet.") },
                  { label: "Advance Report", icon: RefreshCw, action: () => setToast("Advance report page isn't wired up yet.") },
                ].map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.label}
                      onClick={qa.action}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-sans text-ink-600 hover:bg-surface-card-hover hover:text-ink-900 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-ink-400" /> {qa.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <RequestAdvanceModal employees={employees} companyId={companyId} onClose={() => setShowModal(false)} onSubmitted={handleSubmitted} />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-sm font-sans px-4 py-2.5 rounded-lg shadow-xl z-[70]">
          {toast}
        </div>
      )}
    </div>
  );
}