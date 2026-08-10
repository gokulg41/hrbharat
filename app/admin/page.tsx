'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserCheck, Palmtree, Share2, CalendarPlus, Plus, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEmployees } from '@/lib/employees/useEmployees';
import { computeQuickFilters, applyQuickFilter, type QuickFilterKey } from '@/lib/employees/quickFilters';
import { exportEmployeesToCsv } from '@/lib/employees/exportCsv';
import { getInitials } from '@/lib/employees/format';
import type { Employee, StatusFilter } from '@/lib/employees/types';

import EmployeesPageHeader from '@/components/employees/EmployeesPageHeader';
import EmployeeMetricCard from '@/components/employees/EmployeeMetricCard';
import EmployeeFilters from '@/components/employees/EmployeeFilters';
import EmployeeStatusTabs from '@/components/employees/EmployeeStatusTabs';
import EmployeeTable from '@/components/employees/EmployeeTable';
import EmployeePagination from '@/components/employees/EmployeePagination';
import EmployeeEmptyState from '@/components/employees/EmployeeEmptyState';
import EmployeeOverviewDonut from '@/components/employees/EmployeeOverviewDonut';
import QuickFilters from '@/components/employees/QuickFilters';
import DepartmentSummary from '@/components/employees/DepartmentSummary';

export default function EmployeesPage() {
  const router = useRouter();

  // ── Workspace identity (mirrors the pattern in app layout.tsx) ──
  const [adminName, setAdminName] = useState('Administrator');
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function loadIdentity() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_id')
        .eq('id', user.id)
        .single();
      if (profile?.full_name) setAdminName(profile.full_name);
      if (profile?.company_id) setCompanyId(profile.company_id);
    }
    loadIdentity();
  }, []);

  const { employees, loading, error, metrics, refetch } = useEmployees(companyId);

  // ── Filter / search / tab / pagination state ──
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [employmentType, setEmploymentType] = useState('All Types');
  const [statusTab, setStatusTab] = useState<StatusFilter>('all');
  const [quickFilterKey, setQuickFilterKey] = useState<QuickFilterKey | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const departmentOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(),
    [employees]
  );
  const employmentTypeOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.employment_type).filter(Boolean))).sort() as string[],
    [employees]
  );
  const quickFilterItems = useMemo(() => computeQuickFilters(employees), [employees]);

  const filteredEmployees = useMemo(() => {
    let result: Employee[] = employees;

    if (quickFilterKey) result = applyQuickFilter(result, quickFilterKey);
    if (statusTab !== 'all') result = result.filter((e) => e.status === statusTab);
    if (department !== 'All Departments') result = result.filter((e) => e.department === department);
    if (employmentType !== 'All Types') result = result.filter((e) => e.employment_type === employmentType);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          (e.phone ?? '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [employees, quickFilterKey, statusTab, department, employmentType, search]);

  // Reset to page 1 whenever the result set changes shape
  useEffect(() => {
    setPage(1);
  }, [search, department, employmentType, statusTab, quickFilterKey, pageSize]);

  const paginatedEmployees = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    return filteredEmployees.slice(startIdx, startIdx + pageSize);
  }, [filteredEmployees, page, pageSize]);

  const statusCounts = {
    all: employees.length,
    active: metrics.active,
    on_leave: metrics.onLeave,
    inactive: metrics.inactive,
  };

  const hasAnyFilterApplied =
    search.trim() !== '' ||
    department !== 'All Departments' ||
    employmentType !== 'All Types' ||
    statusTab !== 'all' ||
    quickFilterKey !== null;

  function clearAllFilters() {
    setSearch('');
    setDepartment('All Departments');
    setEmploymentType('All Types');
    setStatusTab('all');
    setQuickFilterKey(null);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const allOnPageSelected = paginatedEmployees.every((e) => prev.has(e.id));
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedEmployees.forEach((e) => next.delete(e.id));
      } else {
        paginatedEmployees.forEach((e) => next.add(e.id));
      }
      return next;
    });
  }

  // ── TODO: wire these to your existing onboarding / view / edit flows ──
  // These intentionally do NOT invent a fake flow. Point them at whatever
  // your app already uses today (a route or a modal component).
  function handleAddEmployee() {
    router.push('/admin/employees/new'); // TODO: replace with your real route/modal
  }
  function handleViewEmployee(employee: Employee) {
    router.push(`/admin/employees/${employee.id}`); // TODO: replace with your real route/modal
  }
  function handleEditEmployee(employee: Employee) {
    router.push(`/admin/employees/${employee.id}/edit`); // TODO: replace with your real route/modal
  }
  function handleExport() {
    exportEmployeesToCsv(filteredEmployees, `employees-${new Date().toISOString().slice(0, 10)}.csv`);
  }
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const adminInitials = getInitials(adminName) || 'A';
  const showEmptyNoEmployees = !loading && employees.length === 0;
  const showEmptyNoResults = !loading && employees.length > 0 && filteredEmployees.length === 0;

  return (
    <div className="min-h-screen">
      <EmployeesPageHeader
        adminName={adminName}
        initials={adminInitials}
        notificationCount={3}
        onSignOut={handleSignOut}
      />

      <div className="px-4 md:px-8 pb-10 space-y-6">
        {/* Page title */}
        <div className="flex flex-wrap items-start justify-between gap-4 pt-2 md:pt-0">
          <div>
            <h2 className="text-2xl font-bold text-ink-900 font-sans">Employees</h2>
            <p className="text-sm text-ink-400 font-sans mt-1">
              Manage your organization&rsquo;s employees and their information.
            </p>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleAddEmployee}
              className="flex items-center gap-1.5 pl-4 pr-3 py-2.5 rounded-l-lg bg-brand text-white text-sm font-medium font-sans hover:bg-brand-hover transition-colors cursor-pointer border-r border-white/20"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
            <button
              onClick={handleAddEmployee}
              className="px-2.5 py-2.5 rounded-r-lg bg-brand text-white hover:bg-brand-hover transition-colors cursor-pointer"
              aria-label="More add options"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-status-danger-bg border border-status-danger/20 text-status-danger text-sm font-sans rounded-lg px-4 py-3">
            Couldn&rsquo;t load employees: {error}
          </div>
        )}

        {/* Summary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <EmployeeMetricCard
            icon={Users}
            iconColor="#1D4ED8"
            iconBg="#EFF6FF"
            label="Total Employees"
            value={metrics.total}
            supportingText={metrics.newHiresThisMonth > 0 ? `↑ ${metrics.newHiresThisMonth} this month` : undefined}
            supportingTone="positive"
            loading={loading}
          />
          <EmployeeMetricCard
            icon={UserCheck}
            iconColor="#15803D"
            iconBg="#F0FDF4"
            label="Active Employees"
            value={metrics.active}
            supportingText={metrics.total > 0 ? `${((metrics.active / metrics.total) * 100).toFixed(1)}% of total` : undefined}
            loading={loading}
          />
          <EmployeeMetricCard
            icon={Palmtree}
            iconColor="#C2410C"
            iconBg="#FFF7ED"
            label="On Leave"
            value={metrics.onLeave}
            supportingText="Today"
            supportingTone="warning"
            loading={loading}
          />
          <EmployeeMetricCard
            icon={Share2}
            iconColor="#6D28D9"
            iconBg="#F5F3FF"
            label="Departments"
            value={metrics.departmentCount}
            supportingText="Across organization"
            loading={loading}
          />
          <EmployeeMetricCard
            icon={CalendarPlus}
            iconColor="#1D4ED8"
            iconBg="#EFF6FF"
            label="New Hires (This Month)"
            value={metrics.newHiresThisMonth}
            supportingText={
              metrics.newHiresThisMonth >= metrics.newHiresLastMonth
                ? `↑ ${metrics.newHiresThisMonth - metrics.newHiresLastMonth} vs last month`
                : `↓ ${metrics.newHiresLastMonth - metrics.newHiresThisMonth} vs last month`
            }
            supportingTone={metrics.newHiresThisMonth >= metrics.newHiresLastMonth ? 'positive' : 'neutral'}
            loading={loading}
          />
        </div>

        {/* Main content: table + right rail */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <EmployeeFilters
              searchValue={search}
              onSearchChange={setSearch}
              departments={departmentOptions}
              department={department}
              onDepartmentChange={setDepartment}
              employmentTypes={employmentTypeOptions}
              employmentType={employmentType}
              onEmploymentTypeChange={setEmploymentType}
              status={statusTab}
              onStatusChange={setStatusTab}
              onExport={handleExport}
              onMoreFilters={() => {
                /* TODO: hook up an advanced filters panel if/when you need one */
              }}
              onFilters={() => {
                /* TODO: hook up a saved-filters panel if/when you need one */
              }}
            />

            <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
              <EmployeeStatusTabs active={statusTab} onChange={setStatusTab} counts={statusCounts} />

              {loading ? (
                <div className="py-16 text-center text-sm text-ink-400 font-sans">Loading employees…</div>
              ) : showEmptyNoEmployees ? (
                <EmployeeEmptyState variant="no-employees" onAddEmployee={handleAddEmployee} />
              ) : showEmptyNoResults ? (
                <EmployeeEmptyState
                  variant="no-results"
                  onAddEmployee={handleAddEmployee}
                  onClearFilters={hasAnyFilterApplied ? clearAllFilters : undefined}
                />
              ) : (
                <>
                  <EmployeeTable
                    employees={paginatedEmployees}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onView={handleViewEmployee}
                    onEdit={handleEditEmployee}
                  />
                  <EmployeePagination
                    page={page}
                    pageSize={pageSize}
                    total={filteredEmployees.length}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </>
              )}
            </div>
          </div>

          {/* Right rail */}
          {!loading && employees.length > 0 && (
            <div className="space-y-4">
              <div className="bg-surface-card border border-border-subtle rounded-xl p-5">
                <h3 className="text-sm font-semibold text-ink-900 font-sans mb-4">Employee Overview</h3>
                <EmployeeOverviewDonut active={metrics.active} onLeave={metrics.onLeave} inactive={metrics.inactive} />
              </div>

              <QuickFilters items={quickFilterItems} activeKey={quickFilterKey} onSelect={(key) => setQuickFilterKey((prev) => (prev === key ? null : key))} />

              <DepartmentSummary departments={metrics.departmentBreakdown} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
