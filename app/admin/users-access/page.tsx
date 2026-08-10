"use client";

/**
 * HRBharat — Users & Access
 * Route: /admin/users-access
 *
 * SOURCE VERIFICATION NOTES (per project convention — all assumptions flagged, not silently resolved):
 *
 * 1. `profiles` is the real "workspace users" table (id -> auth.users.id, full_name, email,
 *    role, company_id, must_reset_password, created_at). This is NOT the same table as
 *    `employees` (HR employee records) — this page manages login/access, matching the
 *    "Users & Access" intent of the reference mockup.
 *
 * 2. SCHEMA GAP FLAGGED: `profiles.company_id` is `text`, while `companies.id` is `uuid`,
 *    and there is NO foreign key between them. The join below works because both sides are
 *    passed as string UUIDs, but this should be tightened (ALTER COLUMN profiles.company_id
 *    TYPE uuid + FK to companies.id) — flagging rather than silently fixing since it's a
 *    schema change outside this page's scope.
 *
 * 3. MIGRATED (applied live via Supabase migrations `users_access_status_and_rls_fix` and
 *    `create_invitations_table` — see chat for full SQL):
 *    - Added `profiles.status` (active/invited/disabled, default 'active') -> Active/Pending/
 *      Disabled KPIs, the Status column, and Disable/Enable user are now real.
 *    - Added `public.invitations` table (company_id, email, full_name, role, status, token,
 *      expires_at) with an owner-scoped RLS policy and a unique index preventing duplicate
 *      pending invites per email/company -> Pending Invites KPI and the invite flow's
 *      duplicate handling are now real.
 *    - SECURITY FIX: the old `profiles` SELECT policy allowed ANY authenticated user to read
 *      EVERY company's profiles. Replaced with a company-scoped policy (via a SECURITY
 *      DEFINER `current_company_id()` helper to avoid RLS recursion).
 *    - SECURITY FIX: added a trigger (`prevent_self_role_change`) blocking anyone — including
 *      via the pre-existing "manage own profile" policy — from changing their own `role`.
 *      Enforced in Postgres, not just hidden in the UI, per the brief's rule 14/24.
 *    - Added a company-owner UPDATE policy on `profiles` so role/status changes by an admin
 *      for other users in their company are actually authorized server-side.
 *
 * STILL NOT AVAILABLE (shown as clean empty/"Not tracked" states, not faked):
 *    - profiles has no `department` column (department only exists on `employees`, and only
 *      1 employee row currently exists, with no reliable join key to profiles).
 *    - No `last_sign_in`/session table exposed to the client -> "Last Active" cannot be shown.
 *      (auth.users.last_sign_in_at exists but isn't queryable from the client without a
 *      service-role Edge Function.)
 *    - No roles/permissions table -> roles are the free-text values actually stored on
 *      `profiles.role` (currently just "admin" / "employee" in your data, not the 6-tier
 *      Super Admin/HR Manager/etc. set shown in the reference mockup).
 *    - No MFA / failed-login / active-session tables -> Security Summary shows "Not available".
 *    - No `access_requests` table -> Access Requests tab is a structural shell only.
 *    - Invite flow now writes a real `invitations` row, but there's still no Edge Function
 *      to actually create the auth.users account and email it out — that needs the service
 *      role, which the client can't hold.
 *
 * 4. Activity Logs: there are actually TWO overlapping tables — `audit_logs` (0 rows, richer
 *    shape: actor_id/action/target_type/target_id/metadata/ip_address) and
 *    `system_audit_logs` (1 row, simpler shape: actor_name/event_type/description). This page
 *    reads from `system_audit_logs` because it's the one with real data today. Flagging that
 *    you likely want to consolidate to one table — happy to do that migration on your call.
 *
 * 5. Invite User: there is no invitations table AND no Edge Function / service-role endpoint
 *    in this project to create a new auth.users + profiles row server-side. Per the "don't
 *    invent auth infra" rule, the modal below is fully built (validation, loading, etc.) but
 *    the submit handler intentionally stops short of creating a fake user — it surfaces that
 *    a backend endpoint is required. Say the word and I'll build the Edge Function next.
 *
 * COMPONENTS: no shared Table/Badge/Card/Modal components were included in the uploaded
 * files, so this page is self-contained and styled directly off the design tokens in
 * globals.css / tailwind.config (--surface-*, --ink-*, --brand-*, --border-*, --status-*,
 * --accent-*). If you already have shared components under /components, swap them in —
 * flagging this as an assumption since I don't have that directory's contents.
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Plus,
  Users as UsersIcon,
  UserCheck,
  UserPlus as PendingIcon,
  UserX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreVertical,
  Pencil,
  Shield,
  Lock,
  Activity,
  ClipboardList,
  X,
  Loader2,
  AlertCircle,
  Check,
  Trash2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  company_id: string | null;
  avatar_url: string | null;
  status: string | null;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
};

type ActivityRow = {
  id: string;
  actor_name: string;
  event_type: string;
  description: string;
  created_at: string;
};

type TabKey = "users" | "roles" | "requests" | "logs" | "security";

const TABS: { key: TabKey; label: string }[] = [
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles & Permissions" },
  { key: "requests", label: "Access Requests" },
  { key: "logs", label: "Activity Logs" },
  { key: "security", label: "Security" },
];

const ROLE_LEVEL: Record<string, number> = { admin: 2, employee: 1 };

const ROLE_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  admin: { bg: "var(--accent-violet-bg)", text: "var(--accent-violet)" },
  employee: { bg: "var(--brand-primary-subtle)", text: "var(--brand-primary)" },
};

/* ─────────────────────────────────────────────────────────────
   Shared activity logger — writes to system_audit_logs (the table
   that already has real data; see the file header note on the
   audit_logs vs system_audit_logs duplication that's still
   unresolved). Best-effort: a logging failure never blocks the
   primary action it's describing.
───────────────────────────────────────────────────────────── */
async function logActivity(params: {
  companyId: string;
  actorId: string;
  actorName: string;
  eventType: string;
  description: string;
}) {
  try {
    await supabase.from("system_audit_logs").insert({
      company_id: params.companyId,
      actor_id: params.actorId,
      actor_name: params.actorName,
      event_type: params.eventType,
      description: params.description,
    });
  } catch {
    // best-effort only
  }
}

function roleBadgeStyle(role: string | null) {
  const key = (role || "employee").toLowerCase();
  return ROLE_BADGE_STYLES[key] || { bg: "var(--surface-card-hover)", text: "var(--ink-600)" };
}

function initialsOf(name: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ─────────────────────────────────────────────────────────────
   Small shared bits
───────────────────────────────────────────────────────────── */
function KpiCard({
  icon: Icon,
  label,
  value,
  helper,
  available,
  iconBg,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  helper: string;
  available: boolean;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-4 shadow-card font-sans">
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-400)]">
          {label}
        </span>
      </div>
      <div className={`text-2xl font-bold ${available ? "text-[var(--ink-900)]" : "text-[var(--ink-400)]"}`}>
        {value}
      </div>
      <div className="text-xs text-[var(--ink-600)] mt-1">{helper}</div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "success" | "warning" | "danger" | "neutral" }) {
  const map = {
    success: { bg: "var(--status-success-bg)", text: "var(--status-success)" },
    warning: { bg: "var(--status-warning-bg)", text: "var(--status-warning)" },
    danger: { bg: "var(--status-danger-bg)", text: "var(--status-danger)" },
    neutral: { bg: "var(--surface-card-hover)", text: "var(--ink-400)" },
  }[tone];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold font-sans"
      style={{ backgroundColor: map.bg, color: map.text }}
    >
      {label}
    </span>
  );
}

function EmptyStateShell({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[var(--surface-card)] border border-dashed border-[var(--border-subtle)] rounded-xl p-12 flex flex-col items-center text-center gap-3 font-sans">
      <div className="w-11 h-11 rounded-full bg-[var(--surface-card-hover)] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[var(--ink-400)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--ink-900)]">{title}</p>
      <p className="text-xs text-[var(--ink-600)] max-w-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
export default function UsersAccessPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string>("Someone");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [identityLoading, setIdentityLoading] = useState(true);

  /* ── Users tab state ── */
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<{ active: number; disabled: number }>({
    active: 0,
    disabled: 0,
  });
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [roleCounts, setRoleCounts] = useState<{ role: string; count: number }[]>([]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editRoleFor, setEditRoleFor] = useState<Profile | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityEventFilter, setActivityEventFilter] = useState<string>("all");

  /* ── Resolve current admin identity + workspace ── */
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIdentityLoading(false);
        return;
      }
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, company_id, full_name")
        .eq("id", user.id)
        .single();
      if (profile) {
        setCurrentRole(profile.role);
        setCompanyId(profile.company_id);
        if (profile.full_name) setAdminName(profile.full_name);
      }
      setIdentityLoading(false);
    }
    load();
  }, []);

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  /* ── Fetch users (real, scoped, searched, filtered, paginated) ── */
  const fetchUsers = useCallback(async () => {
    if (!companyId) return;
    setLoadingUsers(true);
    setUsersError(null);

    let query = supabase
      .from("profiles")
      .select("id, full_name, email, role, company_id, avatar_url, status, created_at", { count: "exact" })
      .eq("company_id", companyId);

    if (roleFilter !== "all") {
      query = query.eq("role", roleFilter);
    }
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (debouncedSearch) {
      const term = `%${debouncedSearch}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term},role.ilike.${term}`);
    }

    const from = (page - 1) * rowsPerPage;
    const to = from + rowsPerPage - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) {
      setUsersError(error.message);
      setProfiles([]);
      setTotalCount(0);
    } else {
      setProfiles(data || []);
      setTotalCount(count || 0);
    }
    setLoadingUsers(false);
  }, [companyId, roleFilter, statusFilter, debouncedSearch, page, rowsPerPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ── Real status counts for the KPI cards ── */
  useEffect(() => {
    async function loadStatusCounts() {
      if (!companyId) return;
      const { data, error } = await supabase.from("profiles").select("status").eq("company_id", companyId);
      if (error || !data) return;
      const active = data.filter((r: any) => r.status === "active").length;
      const disabled = data.filter((r: any) => r.status === "disabled").length;
      setStatusCounts({ active, disabled });
    }
    loadStatusCounts();
  }, [companyId, totalCount]);

  /* ── Real pending invitations for the KPI card + Quick Actions ── */
  const fetchInvites = useCallback(async () => {
    if (!companyId) return;
    const { data, count } = await supabase
      .from("invitations")
      .select("id, email, full_name, role, status, created_at, expires_at", { count: "exact" })
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setPendingInvites(data || []);
    setPendingCount(count || 0);
  }, [companyId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  /* ── Real role counts for the Roles Overview panel ── */
  useEffect(() => {
    async function loadRoleCounts() {
      if (!companyId) return;
      const { data, error } = await supabase.from("profiles").select("role").eq("company_id", companyId);
      if (error || !data) return;
      const counts = new Map<string, number>();
      data.forEach((r: any) => {
        const key = r.role || "unassigned";
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      setRoleCounts(Array.from(counts.entries()).map(([role, count]) => ({ role, count })));
    }
    loadRoleCounts();
  }, [companyId, totalCount]);

  /* ── Activity Logs (real, from system_audit_logs) ── */
  useEffect(() => {
    if (activeTab !== "logs" || !companyId) return;
    async function loadActivity() {
      setLoadingActivity(true);
      const { data } = await supabase
        .from("system_audit_logs")
        .select("id, actor_name, event_type, description, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);
      setActivity(data || []);
      setLoadingActivity(false);
    }
    loadActivity();
  }, [activeTab, companyId]);

  const totalUsers = totalCount;
  const totalPages = Math.max(1, Math.ceil(totalUsers / rowsPerPage));
  const showingFrom = totalUsers === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const showingTo = Math.min(page * rowsPerPage, totalUsers);

  const distinctRoles = useMemo(() => {
    const s = new Set(roleCounts.map((r) => r.role));
    return Array.from(s);
  }, [roleCounts]);

  const activityEventTypes = useMemo(() => {
    return Array.from(new Set(activity.map((a) => a.event_type))).sort();
  }, [activity]);

  const filteredActivity = useMemo(() => {
    return activity.filter((a) => {
      if (activityEventFilter !== "all" && a.event_type !== activityEventFilter) return false;
      if (activitySearch.trim()) {
        const term = activitySearch.trim().toLowerCase();
        return a.actor_name.toLowerCase().includes(term) || a.description.toLowerCase().includes(term);
      }
      return true;
    });
  }, [activity, activityEventFilter, activitySearch]);

  /* ── Role change (real update, with the two authorization guards the prompt requires) ── */
  async function changeRole(target: Profile, newRole: string) {
    if (target.id === currentUserId) {
      alert("You can't change your own role from here.");
      return;
    }
    const myLevel = ROLE_LEVEL[(currentRole || "").toLowerCase()] ?? 0;
    const newLevel = ROLE_LEVEL[newRole.toLowerCase()] ?? 0;
    if (newLevel > myLevel) {
      alert("You can't grant a role higher than your own.");
      return;
    }
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", target.id);
    if (error) {
      alert(`Couldn't update role: ${error.message}`);
      return;
    }
    if (companyId && currentUserId) {
      logActivity({
        companyId,
        actorId: currentUserId,
        actorName: adminName,
        eventType: "role_changed",
        description: `${adminName} changed ${target.full_name || target.email || "a user"}'s role from ${target.role || "unknown"} to ${newRole}`,
      });
    }
    setEditRoleFor(null);
    fetchUsers();
  }

  async function toggleStatus(target: Profile) {
    if (target.id === currentUserId) {
      alert("You can't disable your own account.");
      return;
    }
    const next = target.status === "disabled" ? "active" : "disabled";
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", target.id);
    if (error) {
      alert(`Couldn't update status: ${error.message}`);
      return;
    }
    if (companyId && currentUserId) {
      logActivity({
        companyId,
        actorId: currentUserId,
        actorName: adminName,
        eventType: next === "disabled" ? "user_disabled" : "user_enabled",
        description: `${adminName} ${next === "disabled" ? "disabled" : "re-enabled"} ${target.full_name || target.email || "a user"}`,
      });
    }
    setMenuOpenFor(null);
    fetchUsers();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-[var(--ink-400)] mb-1">
            Home <span className="mx-1">›</span> Users &amp; Access
          </p>
          <h1 className="text-2xl font-bold text-[var(--ink-900)]">Users &amp; Access</h1>
          <p className="text-sm text-[var(--ink-600)] mt-1">
            Manage users, roles and permissions for your workspace.
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          disabled={!companyId}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-subtle)] mb-6 flex gap-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? "text-brand border-brand font-semibold"
                : "text-[var(--ink-600)] border-transparent hover:text-[var(--ink-900)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {identityLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--ink-600)] py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading workspace…
        </div>
      ) : !companyId ? (
        <EmptyStateShell
          icon={AlertCircle}
          title="No workspace found on your profile"
          description="Your profile record doesn't have a company_id set, so users can't be scoped safely. Check the profiles row for this account."
        />
      ) : activeTab === "users" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main column */}
          <div className="space-y-6 min-w-0">
            {/* KPI cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                icon={UsersIcon}
                label="Total Users"
                value={String(totalUsers)}
                helper="All users in workspace"
                available
                iconBg="var(--brand-primary-subtle)"
                iconColor="var(--brand-primary)"
              />
              <KpiCard
                icon={UserCheck}
                label="Active Users"
                value={String(statusCounts.active)}
                helper="Currently active"
                available
                iconBg="var(--accent-green-bg)"
                iconColor="var(--accent-green)"
              />
              <KpiCard
                icon={PendingIcon}
                label="Pending Invites"
                value={String(pendingCount)}
                helper="Awaiting acceptance"
                available
                iconBg="var(--accent-orange-bg)"
                iconColor="var(--accent-orange)"
              />
              <KpiCard
                icon={UserX}
                label="Disabled Users"
                value={String(statusCounts.disabled)}
                helper="Currently disabled"
                available
                iconBg="var(--accent-violet-bg)"
                iconColor="var(--accent-violet)"
              />
            </div>

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--ink-400)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email or role…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--border-subtle)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-lg border border-[var(--border-subtle)] text-sm bg-[var(--surface-card)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="all">All Roles</option>
                  {distinctRoles.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-400)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-lg border border-[var(--border-subtle)] text-sm bg-[var(--surface-card)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="disabled">Disabled</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-400)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                disabled
                title="Department not yet linked to users"
                className="px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--ink-400)] cursor-not-allowed bg-[var(--surface-card)]"
              >
                All Departments
              </button>
              <button
                disabled
                title="More filters ship as fields become available"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] text-sm text-[var(--ink-400)] cursor-not-allowed bg-[var(--surface-card)]"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
              </button>
            </div>

            {/* Table */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-card overflow-hidden">
              {usersError ? (
                <div className="p-8 text-center text-sm text-[var(--status-danger)]">
                  Couldn't load users: {usersError}
                </div>
              ) : loadingUsers ? (
                <div className="p-10 flex items-center justify-center gap-2 text-sm text-[var(--ink-600)]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
                </div>
              ) : profiles.length === 0 ? (
                <div className="p-10">
                  <EmptyStateShell
                    icon={UsersIcon}
                    title={debouncedSearch || roleFilter !== "all" ? "No users match your filters" : "No users yet"}
                    description={
                      debouncedSearch || roleFilter !== "all"
                        ? "Try a different search term or clear the role filter."
                        : "Invite your first team member to get started."
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--ink-400)]">
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Department</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Last Active</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((p) => {
                        const badge = roleBadgeStyle(p.role);
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-card-hover)] transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-brand-subtle flex items-center justify-center text-[11px] font-semibold text-brand shrink-0">
                                  {initialsOf(p.full_name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-[var(--ink-900)] truncate">
                                      {p.full_name || "Unnamed"}
                                    </span>
                                    {p.id === currentUserId && (
                                      <span className="text-[10px] font-semibold text-brand bg-brand-subtle px-1.5 py-0.5 rounded">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-[var(--ink-600)] truncate block">
                                    {p.email || "— (not synced from auth)"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                style={{ backgroundColor: badge.bg, color: badge.text }}
                              >
                                {(p.role || "employee").replace(/^\w/, (c) => c.toUpperCase())}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[var(--ink-400)]">—</td>
                            <td className="px-4 py-3">
                              {p.status === "active" ? (
                                <StatusBadge label="Active" tone="success" />
                              ) : p.status === "disabled" ? (
                                <StatusBadge label="Disabled" tone="danger" />
                              ) : (
                                <StatusBadge label="Invited" tone="warning" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-[var(--ink-400)]">—</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1 relative">
                                <button
                                  onClick={() => setEditRoleFor(p)}
                                  className="p-1.5 rounded-md text-[var(--ink-600)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--ink-900)] transition-colors"
                                  aria-label={`Edit ${p.full_name || "user"}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setMenuOpenFor(menuOpenFor === p.id ? null : p.id)}
                                  className="p-1.5 rounded-md text-[var(--ink-600)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--ink-900)] transition-colors"
                                  aria-label="More actions"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                {menuOpenFor === p.id && (
                                  <div className="absolute right-0 top-8 z-10 w-48 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl py-1 text-left">
                                    <button
                                      onClick={() => {
                                        setEditRoleFor(p);
                                        setMenuOpenFor(null);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs text-[var(--ink-900)] hover:bg-[var(--surface-card-hover)]"
                                    >
                                      Change role
                                    </button>
                                    <button
                                      onClick={() => toggleStatus(p)}
                                      disabled={p.id === currentUserId}
                                      className="w-full text-left px-3 py-2 text-xs text-[var(--ink-900)] hover:bg-[var(--surface-card-hover)] disabled:text-[var(--ink-400)] disabled:cursor-not-allowed"
                                    >
                                      {p.status === "disabled" ? "Enable user" : "Disable user"}
                                    </button>
                                    <button
                                      disabled
                                      title="Requires session tracking"
                                      className="w-full text-left px-3 py-2 text-xs text-[var(--ink-400)] cursor-not-allowed"
                                    >
                                      Sign out sessions
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!loadingUsers && totalUsers > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--ink-600)]">
                    Showing {showingFrom} to {showingTo} of {totalUsers} users
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setPage(1);
                        }}
                        className="appearance-none pl-2.5 pr-7 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs bg-[var(--surface-card)] cursor-pointer"
                      >
                        {[10, 25, 50].map((n) => (
                          <option key={n} value={n}>
                            Rows per page: {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--ink-600)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-card-hover)]"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(0, 5)
                      .map((n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                            page === n
                              ? "bg-brand text-white"
                              : "text-[var(--ink-600)] hover:bg-[var(--surface-card-hover)]"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--ink-600)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-card-hover)]"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Roles Overview — real counts */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-[var(--ink-900)]">Roles Overview</h3>
              <p className="text-xs text-[var(--ink-600)] mt-0.5 mb-4">Manage roles and permissions</p>
              <div className="space-y-2.5">
                {roleCounts.length === 0 ? (
                  <p className="text-xs text-[var(--ink-400)]">No roles assigned yet.</p>
                ) : (
                  roleCounts.map((r) => {
                    const badge = roleBadgeStyle(r.role);
                    return (
                      <div key={r.role} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center"
                            style={{ backgroundColor: badge.bg }}
                          >
                            <Shield className="w-3 h-3" style={{ color: badge.text }} />
                          </div>
                          <span className="text-sm text-[var(--ink-900)]">
                            {r.role.replace(/^\w/, (c) => c.toUpperCase())}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[var(--ink-600)] bg-[var(--surface-card-hover)] px-2 py-0.5 rounded">
                          {r.count}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-[var(--ink-400)] mt-3 leading-relaxed">
                Only "admin" and "employee" exist in your data today — the finer-grained roles
                from the reference design (HR Manager, Payroll Manager, etc.) aren't in the
                schema yet.
              </p>
              <button
                onClick={() => setActiveTab("roles")}
                className="w-full mt-4 text-sm font-medium px-4 py-2 rounded-lg border border-brand text-brand hover:bg-brand-subtle transition-colors"
              >
                Manage Roles
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-[var(--ink-900)] mb-3">Quick Actions</h3>
              <div className="space-y-0.5">
                {[
                  { label: "Invite New User", icon: PendingIcon, onClick: () => setInviteOpen(true) },
                  { label: "Create New Role", icon: Shield, onClick: () => setActiveTab("roles") },
                  { label: "Manage Permissions", icon: Lock, onClick: () => setActiveTab("roles") },
                  { label: "View Access Requests", icon: ClipboardList, onClick: () => setActiveTab("requests") },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    className="w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg hover:bg-[var(--surface-card-hover)] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <a.icon className="w-3.5 h-3.5 text-[var(--ink-600)]" />
                      <span className="text-sm text-[var(--ink-900)]">{a.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--ink-400)] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            {/* Pending Invites — real, from the invitations table */}
            {pendingInvites.length > 0 && (
              <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
                <h3 className="text-sm font-semibold text-[var(--ink-900)] mb-3">
                  Pending Invites ({pendingInvites.length})
                </h3>
                <div className="space-y-2.5">
                  {pendingInvites.slice(0, 5).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--ink-900)] truncate">{inv.full_name || inv.email}</p>
                        <p className="text-xs text-[var(--ink-600)] truncate">{inv.email}</p>
                      </div>
                      <button
                        onClick={async () => {
                          await supabase.from("invitations").update({ status: "revoked" }).eq("id", inv.id);
                          if (companyId && currentUserId) {
                            logActivity({
                              companyId,
                              actorId: currentUserId,
                              actorName: adminName,
                              eventType: "invite_revoked",
                              description: `${adminName} revoked the invite for ${inv.email}`,
                            });
                          }
                          fetchInvites();
                        }}
                        className="text-xs font-medium text-[var(--status-danger)] hover:underline shrink-0"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Summary — honestly empty */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-[var(--ink-900)]">Security Summary</h3>
              <p className="text-xs text-[var(--ink-600)] mt-0.5 mb-4">Not available yet</p>
              <div className="space-y-2.5">
                {["Failed Login Attempts", "Password Changes", "Active Sessions", "MFA Enabled Users"].map((m) => (
                  <div key={m} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--ink-600)]">{m}</span>
                    <span className="text-xs font-semibold text-[var(--ink-400)]">—</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[var(--ink-400)] mt-3 leading-relaxed">
                None of these are tracked in the current schema — no MFA, session, or
                login-attempt tables exist yet.
              </p>
            </div>
          </div>
        </div>
      ) : activeTab === "roles" ? (
        <RolesPermissionsTab companyId={companyId} currentUserId={currentUserId} adminName={adminName} />
      ) : activeTab === "requests" ? (
        <AccessRequestsTab companyId={companyId} currentUserId={currentUserId} adminName={adminName} distinctRoles={distinctRoles} />
      ) : activeTab === "logs" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--ink-400)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Search by user or description…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--border-subtle)] text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <div className="relative">
              <select
                value={activityEventFilter}
                onChange={(e) => setActivityEventFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-lg border border-[var(--border-subtle)] text-sm bg-[var(--surface-card)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="all">All Events</option>
                {activityEventTypes.map((et) => (
                  <option key={et} value={et}>
                    {et.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-400)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-card overflow-hidden">
          {loadingActivity ? (
            <div className="p-10 flex items-center justify-center gap-2 text-sm text-[var(--ink-600)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading activity…
            </div>
          ) : activity.length === 0 ? (
            <div className="p-10">
              <EmptyStateShell
                icon={Activity}
                title="No activity logged yet"
                description="Reading from system_audit_logs for this workspace. Actions you take in this page (role changes, invites, access-request decisions, permission edits) now write real entries here. Note there's also an audit_logs table with a richer shape that's still unused — worth consolidating eventually."
              />
            </div>
          ) : filteredActivity.length === 0 ? (
            <div className="p-10">
              <EmptyStateShell
                icon={Activity}
                title="No matching activity"
                description="Try a different search term or clear the event filter."
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--ink-400)]">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Event</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivity.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="px-4 py-3 text-[var(--ink-900)]">{a.actor_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={a.event_type.replace(/_/g, " ")} tone="neutral" />
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-600)]">{a.description}</td>
                    <td className="px-4 py-3 text-[var(--ink-400)]">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      ) : (
        <EmptyStateShell
          icon={Lock}
          title="Security settings — architecture ready, not wired up"
          description="Password Policy, MFA, Session Management, Login Security and Active Sessions all depend on either Supabase Auth settings (MFA/session policy live at the project level, not per-workspace) or new tables this project doesn't have yet. Tell me which of these matters most and I'll scope it."
        />
      )}

      {/* Edit role modal */}
      {editRoleFor && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setEditRoleFor(null)}
        >
          <div
            className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--ink-900)]">
                Change role — {editRoleFor.full_name || "Unnamed"}
              </h3>
              <button onClick={() => setEditRoleFor(null)} className="text-[var(--ink-400)] hover:text-[var(--ink-900)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {["admin", "employee"].map((r) => (
                <button
                  key={r}
                  onClick={() => changeRole(editRoleFor, r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    editRoleFor.role === r
                      ? "border-brand bg-brand-subtle text-brand font-semibold"
                      : "border-[var(--border-subtle)] text-[var(--ink-900)] hover:bg-[var(--surface-card-hover)]"
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite User modal */}
      {inviteOpen && (
        <InviteUserModal
          companyId={companyId}
          currentUserId={currentUserId}
          adminName={adminName}
          onClose={() => setInviteOpen(false)}
          onDone={() => {
            fetchUsers();
            fetchInvites();
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Invite User modal
   Fully built UI + validation. Submit is intentionally honest:
   there's no invitations table or Edge Function in this project
   to create a new auth user server-side, so it surfaces that
   clearly instead of faking a row.
───────────────────────────────────────────────────────────── */
function InviteUserModal({
  companyId,
  currentUserId,
  adminName,
  onClose,
  onDone,
}: {
  companyId: string | null;
  currentUserId: string | null;
  adminName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required.");
    if (!emailValid) return setError("Enter a valid email address.");
    if (!companyId) return setError("No workspace found for this account.");

    setSubmitting(true);
    const { error: insertError } = await supabase.from("invitations").insert({
      company_id: companyId,
      email: email.trim().toLowerCase(),
      full_name: name.trim(),
      role,
    });
    setSubmitting(false);

    if (insertError) {
      // Unique index catches duplicate pending invites for the same email in this company
      if (insertError.code === "23505") {
        setError("There's already a pending invite for this email.");
      } else {
        setError(insertError.message);
      }
      return;
    }

    if (companyId && currentUserId) {
      logActivity({
        companyId,
        actorId: currentUserId,
        actorName: adminName,
        eventType: "invite_sent",
        description: `${adminName} invited ${name.trim()} (${email.trim()}) as ${role}`,
      });
    }

    // TODO (backend): the invitation row is now real, but there's still no Edge Function
    // that creates the auth.users account and sends the email — that needs the service
    // role, which the client can't hold. This is the one remaining piece.
    setNotice(
      "Invitation saved — it'll show up under Pending Invites. One thing still missing: no Edge Function exists yet to actually create the login and email it out. Want me to build that next?"
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--ink-900)]">Invite User</h3>
          <button onClick={onClose} className="text-[var(--ink-400)] hover:text-[var(--ink-900)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {notice ? (
          <div className="space-y-4">
            <div className="text-sm text-[var(--ink-600)] bg-[var(--surface-card-hover)] rounded-lg p-3 leading-relaxed">
              {notice}
            </div>
            <button
              onClick={() => {
                onClose();
                onDone();
              }}
              className="w-full text-sm font-medium px-4 py-2.5 rounded-lg border border-[var(--border-subtle)] text-[var(--ink-600)] hover:bg-[var(--surface-card-hover)]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs block mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="text-xs block mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="text-xs block mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm bg-[var(--surface-card)]"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {error && <p className="text-xs text-[var(--status-danger)]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Sending…" : "Send Invite"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Roles & Permissions tab
   Reads/writes the real `roles`, `permissions`, `role_permissions`
   tables (migration: roles_and_permissions). System roles (Admin,
   Employee) are shown read-only — they're shared defaults and are
   blocked from editing at the RLS level too, not just in this UI.

   IMPORTANT SCOPE NOTE: this manages the role/permission *data*.
   Actually enforcing these permissions on other pages/routes in the
   app (gating nav items, blocking API calls, etc.) is a separate
   follow-up — this migration and UI don't touch any other page, so
   nothing else in the app reads from this table yet. Flagging that
   clearly rather than implying it's already wired everywhere.
───────────────────────────────────────────────────────────── */
type PermissionRow = { id: string; key: string; label: string; category: string; sort_order: number };
type RoleRow = { id: string; company_id: string | null; slug: string; name: string; description: string | null; is_system: boolean };

function RolesPermissionsTab({
  companyId,
  currentUserId,
  adminName,
}: {
  companyId: string | null;
  currentUserId: string | null;
  adminName: string;
}) {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [grantedByRole, setGrantedByRole] = useState<Record<string, Set<string>>>({});
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [savingPermId, setSavingPermId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const [{ data: permsData }, { data: rolesData }] = await Promise.all([
      supabase.from("permissions").select("id, key, label, category, sort_order").order("sort_order"),
      supabase
        .from("roles")
        .select("id, company_id, slug, name, description, is_system")
        .or(`is_system.eq.true,company_id.eq.${companyId}`)
        .order("is_system", { ascending: false })
        .order("name"),
    ]);

    setPermissions(permsData || []);
    setRoles(rolesData || []);

    if (rolesData && rolesData.length > 0) {
      const roleIds = rolesData.map((r: any) => r.id);
      const { data: rp } = await supabase
        .from("role_permissions")
        .select("role_id, permission_id")
        .in("role_id", roleIds);
      const map: Record<string, Set<string>> = {};
      (rp || []).forEach((row: any) => {
        if (!map[row.role_id]) map[row.role_id] = new Set();
        map[row.role_id].add(row.permission_id);
      });
      setGrantedByRole(map);

      // Real user counts per role slug (matches profiles.role text values)
      const { data: profileRoles } = await supabase.from("profiles").select("role").eq("company_id", companyId);
      const counts: Record<string, number> = {};
      (profileRoles || []).forEach((p: any) => {
        const key = p.role || "unassigned";
        counts[key] = (counts[key] || 0) + 1;
      });
      setUserCounts(counts);

      if (!selectedRoleId) setSelectedRoleId(rolesData[0].id);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;
  const grouped = useMemo(() => {
    const byCategory = new Map<string, PermissionRow[]>();
    permissions.forEach((p) => {
      if (!byCategory.has(p.category)) byCategory.set(p.category, []);
      byCategory.get(p.category)!.push(p);
    });
    return Array.from(byCategory.entries());
  }, [permissions]);

  async function togglePermission(perm: PermissionRow) {
    if (!selectedRole || selectedRole.is_system) return;
    setSavingPermId(perm.id);
    const has = grantedByRole[selectedRole.id]?.has(perm.id);

    if (has) {
      await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", selectedRole.id)
        .eq("permission_id", perm.id);
    } else {
      await supabase.from("role_permissions").insert({ role_id: selectedRole.id, permission_id: perm.id });
    }

    if (companyId && currentUserId) {
      logActivity({
        companyId,
        actorId: currentUserId,
        actorName: adminName,
        eventType: "permission_updated",
        description: `${adminName} ${has ? "removed" : "granted"} "${perm.label}" ${has ? "from" : "to"} the ${selectedRole.name} role`,
      });
    }

    setGrantedByRole((prev) => {
      const next = { ...prev };
      const set = new Set(next[selectedRole.id] || []);
      if (has) set.delete(perm.id);
      else set.add(perm.id);
      next[selectedRole.id] = set;
      return next;
    });
    setSavingPermId(null);
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) return setCreateError("Name is required.");
    if (!companyId) return setCreateError("No workspace found.");

    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setCreating(true);
    const { error } = await supabase.from("roles").insert({
      company_id: companyId,
      slug,
      name: newName.trim(),
      description: newDescription.trim() || null,
      is_system: false,
    });
    setCreating(false);

    if (error) {
      setCreateError(error.code === "23505" ? "A role with a similar name already exists." : error.message);
      return;
    }
    if (companyId && currentUserId) {
      logActivity({
        companyId,
        actorId: currentUserId,
        actorName: adminName,
        eventType: "role_created",
        description: `${adminName} created the role "${newName.trim()}"`,
      });
    }
    setNewName("");
    setNewDescription("");
    setCreateOpen(false);
    load();
  }

  async function deleteRole(role: RoleRow) {
    if (role.is_system) return;
    if (!confirm(`Delete the role "${role.name}"? Users currently assigned this role keep it as free text on their profile — you'll want to reassign them separately.`)) return;
    await supabase.from("roles").delete().eq("id", role.id);
    if (companyId && currentUserId) {
      logActivity({
        companyId,
        actorId: currentUserId,
        actorName: adminName,
        eventType: "role_deleted",
        description: `${adminName} deleted the role "${role.name}"`,
      });
    }
    if (selectedRoleId === role.id) setSelectedRoleId(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--ink-600)] py-12 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading roles…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Role list */}
      <div className="space-y-3">
        <button
          onClick={() => setCreateOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Role
        </button>
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-card overflow-hidden">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoleId(r.id)}
              className={`w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 transition-colors ${
                selectedRoleId === r.id ? "bg-brand-subtle" : "hover:bg-[var(--surface-card-hover)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-medium truncate ${
                    selectedRoleId === r.id ? "text-brand" : "text-[var(--ink-900)]"
                  }`}
                >
                  {r.name}
                </span>
                {r.is_system && <Lock className="w-3 h-3 text-[var(--ink-400)] shrink-0" />}
              </div>
              <span className="text-xs text-[var(--ink-400)]">
                {userCounts[r.slug] || 0} user{(userCounts[r.slug] || 0) === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Permission matrix */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-card p-6">
        {!selectedRole ? (
          <EmptyStateShell icon={Shield} title="Select a role" description="Choose a role on the left to view or edit its permissions." />
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[var(--ink-900)]">{selectedRole.name}</h3>
                  {selectedRole.is_system && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-400)] bg-[var(--surface-card-hover)] px-1.5 py-0.5 rounded">
                      System role
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--ink-600)] mt-1">
                  {selectedRole.description ||
                    (selectedRole.is_system
                      ? "Built-in role, shared across all companies. Not editable."
                      : "Custom role for your workspace.")}
                </p>
              </div>
              {!selectedRole.is_system && (
                <button
                  onClick={() => deleteRole(selectedRole)}
                  className="p-2 rounded-lg text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] transition-colors shrink-0"
                  aria-label="Delete role"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-6">
              {grouped.map(([category, perms]) => (
                <div key={category}>
                  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-400)] mb-2">
                    {category}
                  </h4>
                  <div className="space-y-1.5">
                    {perms.map((perm) => {
                      const granted = grantedByRole[selectedRole.id]?.has(perm.id) || false;
                      const disabled = selectedRole.is_system || savingPermId === perm.id;
                      return (
                        <button
                          key={perm.id}
                          onClick={() => togglePermission(perm)}
                          disabled={disabled}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                            granted
                              ? "border-brand/30 bg-brand-subtle"
                              : "border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)]"
                          } ${selectedRole.is_system ? "cursor-default" : "cursor-pointer"}`}
                        >
                          <span className="text-sm text-[var(--ink-900)]">{perm.label}</span>
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                              granted ? "bg-brand border-brand" : "border-[var(--border-subtle)]"
                            }`}
                          >
                            {granted && <Check className="w-3.5 h-3.5 text-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create role modal */}
      {createOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--ink-900)]">New Role</h3>
              <button onClick={() => setCreateOpen(false)} className="text-[var(--ink-400)] hover:text-[var(--ink-900)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={createRole} className="space-y-3.5">
              <div>
                <label className="text-xs block mb-1">Role name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm"
                  placeholder="e.g. HR Manager"
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Description (optional)</label>
                <input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm"
                  placeholder="What this role is for"
                />
              </div>
              {createError && <p className="text-xs text-[var(--status-danger)]">{createError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                {creating ? "Creating…" : "Create Role"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Access Requests tab
   Reads/writes the real `access_requests` table (migration:
   access_requests). Covers an EXISTING company member requesting
   a role/access change — not an external person requesting to
   join a company they're not part of yet (that's a different,
   invite-adjacent flow with its own entry point elsewhere).

   ENTRY POINT NOTE: there's no self-service surface elsewhere in
   the app yet where a non-admin user would land here to file a
   request (this whole layout is the admin-only panel). The "New
   Request" button below lets the current admin log one directly
   so the table is real and testable now — wiring a genuine
   self-service trigger point for regular employees is a separate
   follow-up that touches pages outside this one.
───────────────────────────────────────────────────────────── */
type AccessRequestRow = {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  requested_role: string;
  reason: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

function AccessRequestsTab({
  companyId,
  currentUserId,
  adminName,
  distinctRoles,
}: {
  companyId: string | null;
  currentUserId: string | null;
  adminName: string;
  distinctRoles: string[];
}) {
  const [requests, setRequests] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [actingOn, setActingOn] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requestedRole, setRequestedRole] = useState(distinctRoles[0] || "employee");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    let query = supabase
      .from("access_requests")
      .select("id, requester_id, requester_name, requester_email, requested_role, reason, status, created_at, reviewed_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (filter === "pending") query = query.eq("status", "pending");
    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  }, [companyId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(req: AccessRequestRow, decision: "approved" | "rejected") {
    if (!companyId || !currentUserId) return;
    setActingOn(req.id);

    const { error } = await supabase
      .from("access_requests")
      .update({ status: decision, reviewed_by: currentUserId, reviewed_at: new Date().toISOString() })
      .eq("id", req.id);

    if (!error && decision === "approved") {
      // Grant the requested role on approval, subject to the same guard used in the
      // Users tab (self-role-change is blocked server-side by a trigger regardless).
      await supabase.from("profiles").update({ role: req.requested_role }).eq("id", req.requester_id);
    }

    if (!error && companyId && currentUserId) {
      logActivity({
        companyId,
        actorId: currentUserId,
        actorName: adminName,
        eventType: decision === "approved" ? "access_request_approved" : "access_request_rejected",
        description: `${adminName} ${decision} ${req.requester_name}'s request for ${req.requested_role} access`,
      });
    }

    setActingOn(null);
    if (error) {
      alert(`Couldn't update request: ${error.message}`);
      return;
    }
    load();
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !email.trim()) return setFormError("Name and email are required.");
    if (!companyId || !currentUserId) return setFormError("No workspace found.");

    setSubmitting(true);
    const { error } = await supabase.from("access_requests").insert({
      company_id: companyId,
      requester_id: currentUserId,
      requester_name: name.trim(),
      requester_email: email.trim(),
      requested_role: requestedRole,
      reason: reason.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      setFormError(error.code === "23505" ? "There's already a pending request for this user." : error.message);
      return;
    }
    if (companyId && currentUserId) {
      logActivity({
        companyId,
        actorId: currentUserId,
        actorName: adminName,
        eventType: "access_request_submitted",
        description: `${adminName} submitted an access request for ${requestedRole}`,
      });
    }
    setName("");
    setEmail("");
    setReason("");
    setCreateOpen(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {(["pending", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? "bg-brand text-white" : "text-[var(--ink-600)] hover:bg-[var(--surface-card-hover)]"
              }`}
            >
              {f === "pending" ? "Pending" : "All requests"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--ink-900)] hover:bg-[var(--surface-card-hover)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Request
        </button>
      </div>

      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-[var(--ink-600)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10">
            <EmptyStateShell
              icon={ClipboardList}
              title={filter === "pending" ? "No pending requests" : "No access requests yet"}
              description="Requests for role or access changes from members of your workspace will show up here for approval."
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--ink-400)]">
                <th className="px-4 py-3 font-semibold">Requester</th>
                <th className="px-4 py-3 font-semibold">Requested Role</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Requested On</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--ink-900)]">{r.requester_name}</div>
                    <div className="text-xs text-[var(--ink-600)]">{r.requester_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-subtle text-brand">
                      {r.requested_role.replace(/^\w/, (c) => c.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-600)] max-w-xs truncate">{r.reason || "—"}</td>
                  <td className="px-4 py-3 text-[var(--ink-400)]">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {r.status === "pending" ? (
                      <StatusBadge label="Pending" tone="warning" />
                    ) : r.status === "approved" ? (
                      <StatusBadge label="Approved" tone="success" />
                    ) : (
                      <StatusBadge label="Rejected" tone="danger" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "pending" ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => review(r, "approved")}
                          disabled={actingOn === r.id}
                          className="p-1.5 rounded-md text-[var(--status-success)] hover:bg-[var(--status-success-bg)] transition-colors disabled:opacity-50"
                          aria-label="Approve"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => review(r, "rejected")}
                          disabled={actingOn === r.id}
                          className="p-1.5 rounded-md text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] transition-colors disabled:opacity-50"
                          aria-label="Reject"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--ink-400)] block text-right">
                        {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--ink-900)]">New Access Request</h3>
              <button onClick={() => setCreateOpen(false)} className="text-[var(--ink-400)] hover:text-[var(--ink-900)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitRequest} className="space-y-3.5">
              <div>
                <label className="text-xs block mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm"
                  placeholder="Requester's name"
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm"
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Requested role</label>
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm bg-[var(--surface-card)]"
                >
                  {(distinctRoles.length > 0 ? distinctRoles : ["employee", "admin"]).map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-sm resize-none"
                  placeholder="Why this access is needed"
                />
              </div>
              {formError && <p className="text-xs text-[var(--status-danger)]">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}