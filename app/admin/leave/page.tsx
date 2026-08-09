'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarRange,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

import LeavePageHeader from '@components/leave/LeavePageHeader';
import LeaveStatCard from '@components/leave/LeaveStatCard';
import LeaveRequestTabs, { LeaveTabKey } from '@components/leave/LeaveRequestTabs';
import LeaveFilters, { LeaveFilterState } from '@components/leave/LeaveFilters';
import LeaveRequestTable from '@components/leave/LeaveRequestTable';
import Pagination from '@components/leave/Pagination';
import LeaveBalanceSummary from '@components/leave/LeaveBalanceSummary';
import LeaveCalendar from '@components/leave/LeaveCalendar';
import QuickActions from '@components/leave/QuickActions';

import { EmployeeRecord, LeaveRequest, LeaveStatus } from '@/lib/types';;
import { computeEmployeeBalances } from '@/lib/balances';

const TAB_TO_STATUS: Record<Exclude<LeaveTabKey, 'all'>, LeaveStatus> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const DEFAULT_FILTERS: LeaveFilterState = {
  search: '',
  department: 'All Departments',
  leaveType: 'All Leave Types',
  status: 'All Status',
  dateRange: '01 Aug 2026 - 31 Aug 2026',
};

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Row shape returned by the join below — employees is nested because of
// the `employees!inner(...)` embed in the select.
interface LeaveRequestJoinRow {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  employees: {
    employee_code: string;
    full_name: string;
    department: string;
    casual_leave_balance: number;
    sick_leave_balance: number;
    paid_leave_balance: number;
  };
}

export default function LeaveManagementPage() {
  const [adminName, setAdminName] = useState('Administrator');
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Record<string, EmployeeRecord>>({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<LeaveTabKey>('all');
  const [filters, setFilters] = useState<LeaveFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  // ── Identity + company scoping (mirrors the admin layout's profile lookup) ──
  useEffect(() => {
    async function getIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_id')
        .eq('id', user.id)
        .single();
      if (profile?.full_name) setAdminName(profile.full_name);
      if (profile?.company_id) setCompanyId(profile.company_id);
    }
    getIdentity();
  }, []);

  // ── Leave data: joined with employees for name/department/allocations,
  //    scoped to the admin's company. Mock data only as an empty-state
  //    fallback (per-employee allocations get mocked to match). ──
  useEffect(() => {
    async function fetchLeaveRequests() {
      setLoading(true);
      try {
        if (!companyId) {
          // Identity lookup hasn't resolved a company yet — fall back so the
          // page isn't stuck loading (e.g. logged out, or no profile row).
          setRequests(MOCK_LEAVE_REQUESTS);
          setEmployees(MOCK_EMPLOYEES);
          setSelectedEmployeeId((prev) => prev ?? MOCK_LEAVE_REQUESTS[0]?.employeeId ?? null);
          return;
        }

        const { data, error } = await supabase
          .from('leave_requests')
          .select(
            `id, employee_id, leave_type, start_date, end_date, status, created_at,
             employees!inner ( employee_code, full_name, department, casual_leave_balance, sick_leave_balance, paid_leave_balance )`
          )
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const rows = (data ?? []) as unknown as LeaveRequestJoinRow[];

        if (rows.length > 0) {
          const mapped: LeaveRequest[] = rows.map((row) => {
            const start = new Date(row.start_date + 'T00:00:00');
            const end = new Date(row.end_date + 'T00:00:00');
            const durationDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
            return {
              id: row.id,
              employeeId: row.employee_id,
              employeeCode: row.employees.employee_code,
              employeeName: row.employees.full_name,
              department: row.employees.department,
              avatarInitials: initialsFromName(row.employees.full_name),
              leaveType: row.leave_type,
              startDate: row.start_date,
              endDate: row.end_date,
              durationDays,
              status: row.status,
              appliedOn: row.created_at.slice(0, 10),
            };
          });

          const employeeMap: Record<string, EmployeeRecord> = {};
          rows.forEach((row) => {
            if (!employeeMap[row.employee_id]) {
              employeeMap[row.employee_id] = {
                id: row.employee_id,
                code: row.employees.employee_code,
                name: row.employees.full_name,
                department: row.employees.department,
                casualAllocated: row.employees.casual_leave_balance,
                sickAllocated: row.employees.sick_leave_balance,
                paidAllocated: row.employees.paid_leave_balance,
              };
            }
          });

          setRequests(mapped);
          setEmployees(employeeMap);
          setSelectedEmployeeId((prev) => prev ?? mapped[0]?.employeeId ?? null);
        } else {
          // Empty backend result — use sample data so the page isn't blank in dev.
          setRequests(MOCK_LEAVE_REQUESTS);
          setEmployees(MOCK_EMPLOYEES);
          setSelectedEmployeeId((prev) => prev ?? MOCK_LEAVE_REQUESTS[0]?.employeeId ?? null);
        }
      } catch {
        // Table/join not available yet — fall back to sample data.
        setRequests(MOCK_LEAVE_REQUESTS);
        setEmployees(MOCK_EMPLOYEES);
        setSelectedEmployeeId((prev) => prev ?? MOCK_LEAVE_REQUESTS[0]?.employeeId ?? null);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaveRequests();
  }, [companyId]);

  // ── Derived: filtered list ──
  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab !== 'all' && r.status !== TAB_TO_STATUS[activeTab]) return false;
      if (filters.search && !r.employeeName.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.department !== 'All Departments' && r.department !== filters.department) return false;
      if (filters.leaveType !== 'All Leave Types' && r.leaveType !== filters.leaveType) return false;
      if (filters.status !== 'All Status' && r.status !== filters.status) return false;
      return true;
    });
  }, [requests, activeTab, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filters, pageSize]);

  const tabCounts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((r) => r.status === 'Pending').length,
      approved: requests.filter((r) => r.status === 'Approved').length,
      rejected: requests.filter((r) => r.status === 'Rejected').length,
      cancelled: requests.filter((r) => r.status === 'Cancelled').length,
    }),
    [requests]
  );

  const stats = useMemo(
    () => ({
      totalRequests: requests.length,
      pendingApproval: tabCounts.pending,
      approved: tabCounts.approved,
      rejected: tabCounts.rejected,
      leaveTakenDays: requests
        .filter((r) => r.status === 'Approved')
        .reduce((sum, r) => sum + r.durationDays, 0),
    }),
    [requests, tabCounts]
  );

  const departments = useMemo(() => Array.from(new Set(requests.map((r) => r.department))).sort(), [requests]);
  const leaveTypes = useMemo(() => Array.from(new Set(requests.map((r) => r.leaveType))).sort(), [requests]);

  // ── Balance card driven by whichever employee's row was last clicked in
  //    the table, defaulting to the first employee once data loads ──
  const selectedEmployee = selectedEmployeeId ? employees[selectedEmployeeId] : undefined;
  const selectedEmployeeBalances = useMemo(
    () => (selectedEmployee ? computeEmployeeBalances(selectedEmployee, requests) : []),
    [selectedEmployee, requests]
  );

  // ── Row actions — optimistic local update; wire to your leave-approval mutation ──
  const updateStatus = async (id: string, status: LeaveStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await supabase.from('leave_requests').update({ status }).eq('id', id);
    } catch {
      // Best-effort — table may not exist in this environment yet.
    }
  };

  const initials = adminName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <LeavePageHeader adminName={adminName} initials={initials} notificationCount={3} />

      {/* Page title + primary action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 font-sans">Leave Management</h2>
          <p className="text-sm text-ink-600 font-sans mt-1">Manage leave requests, balances and approvals for your team.</p>
        </div>
        <div className="flex items-stretch">
          <button
            onClick={() => setApplyModalOpen(true)}
            className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold font-sans px-4 py-2.5 rounded-l-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Apply Leave
          </button>
          <button className="flex items-center justify-center px-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] border-l border-white/20 rounded-r-lg transition-colors cursor-pointer">
            <ChevronDown className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <LeaveStatCard icon={CalendarDays} label="Total Leave Requests" value={stats.totalRequests} subtext="This month" accent="blue" />
        <LeaveStatCard icon={Clock} label="Pending Approval" value={stats.pendingApproval} subtext="Requires your action" accent="orange" />
        <LeaveStatCard icon={CheckCircle2} label="Approved" value={stats.approved} subtext="This month" accent="green" />
        <LeaveStatCard icon={XCircle} label="Rejected" value={stats.rejected} subtext="This month" accent="red" />
        <LeaveStatCard icon={CalendarRange} label="Leave Taken" value={stats.leaveTakenDays} suffix="Days" subtext="This month" accent="violet" />
      </div>

      {/* Main two-column area */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Left: request table card */}
        <div className="bg-surface-card border border-border-subtle rounded-xl shadow-card overflow-hidden">
          <LeaveRequestTabs active={activeTab} onChange={setActiveTab} counts={tabCounts} />
          <LeaveFilters
            filters={filters}
            departments={departments}
            leaveTypes={leaveTypes}
            statuses={['Pending', 'Approved', 'Rejected', 'Cancelled']}
            onChange={setFilters}
          />
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-ink-600 font-sans">Loading leave requests…</div>
          ) : (
            <>
              <LeaveRequestTable
                requests={pageItems}
                selectedEmployeeId={selectedEmployeeId}
                onRowSelect={(r) => setSelectedEmployeeId(r.employeeId)}
                onView={(r) => console.log('view', r.id)}
                onApprove={(r) => updateStatus(r.id, 'Approved')}
                onReject={(r) => updateStatus(r.id, 'Rejected')}
              />
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filtered.length}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <LeaveBalanceSummary balances={selectedEmployeeBalances} employeeName={selectedEmployee?.name} />
          <LeaveCalendar requests={requests} initialYear={2026} initialMonth={7} />
          <QuickActions />
        </div>
      </div>

      {/* Apply Leave modal placeholder — wire to your existing leave-application flow */}
      {applyModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setApplyModalOpen(false)}
        >
          <div
            className="bg-surface-card border border-border-subtle rounded-xl shadow-xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-ink-900 font-sans">Apply for Leave</h3>
            <p className="text-sm text-ink-600 font-sans">
              Hook this dialog up to your existing leave-application form/action — this is a placeholder so the
              primary action is wired end to end.
            </p>
            <button
              onClick={() => setApplyModalOpen(false)}
              className="w-full text-sm font-medium font-sans px-4 py-2.5 rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
