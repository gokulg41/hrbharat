"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  fetchCalendarMonthData,
  fetchUpcomingEvents,
  formatDisplayDate,
  formatWorkingHours,
  toDateKey,
  type CalendarMonthData,
  type EmployeeIdentity,
  type UpcomingEvent,
} from '@/lib/employee-calendar';
import {
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Umbrella,
  Gift,
  Clock,
  X,
  Plus,
  CalendarDays,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Shared design tokens (matches existing employee pages — see
   app/employee/requests/page.tsx for the source of this pattern)
   ───────────────────────────────────────────── */
const cardClass = 'bg-surface-card border border-border-subtle rounded-xl shadow-card';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type AttendanceFilter = 'All' | 'Present' | 'Late' | 'Absent';
type LeaveFilter = 'All' | 'Leave' | 'NonLeave';
type EventsFilter = 'All' | 'Holidays' | 'Shifts';

interface FilterState {
  attendance: AttendanceFilter;
  leave: LeaveFilter;
  events: EventsFilter;
}

const DEFAULT_FILTERS: FilterState = { attendance: 'All', leave: 'All', events: 'All' };

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

/* Build a Monday-first 6x7 grid of dates covering the given month, including
   leading/trailing days from adjacent months for a full grid. */
function buildMonthGrid(year: number, monthIndex0: number): Date[] {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  // JS getDay(): 0=Sun..6=Sat. We want Monday=0..Sunday=6.
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex0, 1 - firstWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function EmployeeCalendarPage() {
  const router = useRouter();

  const [employee, setEmployee] = useState<EmployeeIdentity | null>(null);

  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [monthData, setMonthData] = useState<CalendarMonthData | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const todayKey = toDateKey(new Date());

  const loadMonth = useCallback(async (emp: EmployeeIdentity, month: Date) => {
    setError(false);
    try {
      const data = await fetchCalendarMonthData(emp, month.getFullYear(), month.getMonth());
      setMonthData(data);
    } catch (err) {
      console.error('Failed to load calendar month data:', err);
      setError(true);
    }
  }, []);

  const loadUpcoming = useCallback(async (emp: EmployeeIdentity) => {
    try {
      const events = await fetchUpcomingEvents(emp, 5);
      setUpcoming(events);
    } catch (err) {
      console.error('Failed to load upcoming events:', err);
      setUpcoming([]);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: emp } = await supabase
        .from('employees')
        .select('id, employee_code, company_id')
        .eq('email', user.email?.toLowerCase().trim())
        .single();

      if (!emp) { setLoading(false); setError(true); return; }

      const identity: EmployeeIdentity = { id: emp.id, employee_code: emp.employee_code, company_id: emp.company_id };
      setEmployee(identity);

      await Promise.all([loadMonth(identity, monthDate), loadUpcoming(identity)]);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!employee) return;
    loadMonth(employee, monthDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthDate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handlePrevMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const handleToday = () => {
    const now = new Date();
    setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const monthLabel = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const gridDays = useMemo(() => buildMonthGrid(monthDate.getFullYear(), monthDate.getMonth()), [monthDate]);
  const activeFilterCount = Object.values(filters).filter((v) => v !== 'All').length;

  function cellMatchesFilters(dateKey: string, inMonth: boolean): boolean {
    if (!inMonth || !monthData) return true;
    const attendance = monthData.attendanceByDate[dateKey];
    const leaves = (monthData.leavesByDate[dateKey] ?? []).filter((l) => l.status === 'Approved');
    const holiday = monthData.holidaysByDate[dateKey];

    if (filters.attendance !== 'All') {
      if (!attendance || attendance.status !== filters.attendance) return false;
    }
    if (filters.leave === 'Leave' && leaves.length === 0) return false;
    if (filters.leave === 'NonLeave' && leaves.length > 0) return false;
    if (filters.events === 'Holidays' && !holiday) return false;

    return true;
  }

  const selectedDetail = useMemo(() => {
    if (!selectedDateKey || !monthData) return null;
    return {
      dateKey: selectedDateKey,
      attendance: monthData.attendanceByDate[selectedDateKey] ?? null,
      leaves: monthData.leavesByDate[selectedDateKey] ?? [],
      holiday: monthData.holidaysByDate[selectedDateKey] ?? null,
    };
  }, [selectedDateKey, monthData]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-canvas font-sans">
        <div className="h-14 border-b border-border-subtle bg-surface-card px-6 flex items-center">
          <Skeleton className="h-4 w-40" />
        </div>
        <main className="px-6 lg:px-8 py-6 space-y-6 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-80" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <Skeleton className="h-[560px] rounded-xl" />
            <div className="space-y-6">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-surface-canvas font-sans flex items-center justify-center px-6">
        <p className="text-sm text-ink-600">No employee profile found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-canvas font-sans text-ink-900" onClick={() => setFilterOpen(false)}>
      {/* TOP HEADER */}
      <header className="border-b border-border-subtle sticky top-0 z-30 bg-surface-canvas/95 backdrop-blur">
        <div className="px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center shrink-0">
              <span className="text-white text-[9px] font-bold">HR</span>
            </div>
            <span className="text-ink-400">/</span>
            <span className="font-semibold text-ink-900">Calendar</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 transition-colors cursor-pointer">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 lg:px-8 py-6 space-y-6 max-w-[1400px] mx-auto">
        {/* PAGE HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-ink-900">My Calendar</h1>
            <p className="mt-1 text-sm text-ink-600">View your attendance, leaves, shifts and holidays in one calendar.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center bg-surface-card border border-border-subtle rounded-lg overflow-hidden">
              <button
                onClick={handlePrevMonth}
                className="w-9 h-9 flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-semibold text-ink-900 min-w-[132px] text-center">{monthLabel}</span>
              <button
                onClick={handleNextMonth}
                className="w-9 h-9 flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleToday}
              className="h-9 px-3.5 text-sm font-semibold text-ink-900 bg-surface-card border border-border-subtle rounded-lg hover:bg-surface-card-hover transition-colors cursor-pointer"
            >
              Today
            </button>
            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={`h-9 px-3.5 flex items-center gap-1.5 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                  activeFilterCount > 0
                    ? 'bg-brand-subtle border-brand text-brand'
                    : 'bg-surface-card border-border-subtle text-ink-900 hover:bg-surface-card-hover'
                }`}
              >
                <Filter className="w-3.5 h-3.5" /> Filter
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface-card border border-border-subtle rounded-xl shadow-xl overflow-hidden z-40 p-4 space-y-4">
                  <FilterGroup
                    label="Attendance"
                    value={filters.attendance}
                    options={['All', 'Present', 'Late', 'Absent']}
                    onChange={(v) => setFilters((f) => ({ ...f, attendance: v as AttendanceFilter }))}
                  />
                  <FilterGroup
                    label="Leave"
                    value={filters.leave}
                    options={['All', 'Leave', 'NonLeave']}
                    optionLabels={{ Leave: 'Leave days', NonLeave: 'Non-leave days' }}
                    onChange={(v) => setFilters((f) => ({ ...f, leave: v as LeaveFilter }))}
                  />
                  <FilterGroup
                    label="Events"
                    value={filters.events}
                    options={['All', 'Holidays', 'Shifts']}
                    onChange={(v) => setFilters((f) => ({ ...f, events: v as EventsFilter }))}
                  />
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="w-full text-xs font-semibold text-ink-600 hover:text-ink-900 transition-colors cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className={`${cardClass} flex flex-col items-center justify-center text-center py-12`}>
            <div className="w-11 h-11 rounded-full bg-status-danger-bg text-status-danger flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-ink-900">Unable to load calendar</p>
            <p className="text-xs text-ink-600 mt-1">Please try again.</p>
            <button
              onClick={() => employee && loadMonth(employee, monthDate)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {!error && monthData && (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                iconBg="bg-accent-green-bg text-accent-green"
                label="Present Days"
                value={String(monthData.summary.presentDays)}
                sublabel="This Month"
              />
              <SummaryCard
                icon={<Umbrella className="w-5 h-5" />}
                iconBg="bg-brand-subtle text-brand"
                label="Leave Days"
                value={String(monthData.summary.leaveDays)}
                sublabel="This Month"
              />
              <SummaryCard
                icon={<Gift className="w-5 h-5" />}
                iconBg="bg-accent-violet-bg text-accent-violet"
                label="Holidays"
                value={String(monthData.summary.holidays)}
                sublabel="This Month"
              />
              <SummaryCard
                icon={<Clock className="w-5 h-5" />}
                iconBg="bg-accent-orange-bg text-accent-orange"
                label="Working Hours"
                value={formatWorkingHours(monthData.summary.workingMinutesTotal)}
                sublabel="This Month"
              />
            </div>

            {/* MAIN CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
              {/* CALENDAR */}
              <div className={`${cardClass} p-4 md:p-5`}>
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-400 py-2">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {gridDays.map((d) => {
                    const key = toDateKey(d);
                    const inMonth = d.getMonth() === monthDate.getMonth();
                    const isToday = key === todayKey;
                    const attendance = inMonth ? monthData.attendanceByDate[key] : undefined;
                    const approvedLeaves = inMonth ? (monthData.leavesByDate[key] ?? []).filter((l) => l.status === 'Approved') : [];
                    const pendingLeaves = inMonth ? (monthData.leavesByDate[key] ?? []).filter((l) => l.status === 'Pending') : [];
                    const holiday = inMonth ? monthData.holidaysByDate[key] : undefined;
                    const matches = cellMatchesFilters(key, inMonth);

                    return (
                      <button
                        key={key}
                        onClick={() => inMonth && setSelectedDateKey(key)}
                        disabled={!inMonth}
                        className={`relative flex flex-col items-start rounded-lg border p-2 text-left min-h-[92px] transition-all ${
                          !inMonth
                            ? 'border-transparent cursor-default'
                            : isToday
                              ? 'border-brand bg-brand-subtle cursor-pointer hover:shadow-sm'
                              : 'border-border-subtle bg-surface-card cursor-pointer hover:border-border-hover hover:shadow-sm'
                        } ${!matches ? 'opacity-35' : ''}`}
                      >
                        <span
                          className={`text-[13px] font-semibold mb-1 ${
                            !inMonth
                              ? 'text-ink-400/60'
                              : isToday
                                ? 'w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-[11px]'
                                : 'text-ink-900'
                          }`}
                        >
                          {d.getDate()}
                        </span>

                        {inMonth && holiday && (
                          <div className="flex items-center gap-1 text-[10.5px] font-semibold text-accent-violet">
                            <Gift className="w-3 h-3 shrink-0" />
                            <span className="truncate">{holiday.name}</span>
                          </div>
                        )}

                        {inMonth && !holiday && approvedLeaves.length > 0 && (
                          <div className="flex items-center gap-1 text-[10.5px] font-semibold text-brand">
                            <Umbrella className="w-3 h-3 shrink-0" />
                            <span className="truncate">{approvedLeaves[0].leaveType}</span>
                          </div>
                        )}
                        {inMonth && !holiday && approvedLeaves.length === 0 && pendingLeaves.length > 0 && (
                          <div className="flex items-center gap-1 text-[10.5px] font-semibold text-ink-400">
                            <Umbrella className="w-3 h-3 shrink-0" />
                            <span className="truncate">{pendingLeaves[0].leaveType} (Pending)</span>
                          </div>
                        )}

                        {inMonth && !holiday && approvedLeaves.length === 0 && pendingLeaves.length === 0 && attendance && (
                          <div className="space-y-0.5">
                            <StatusDot status={attendance.status} />
                            {attendance.checkInLabel && (
                              <p className="text-[10.5px] text-ink-600 leading-tight">{attendance.checkInLabel}</p>
                            )}
                            {attendance.checkOutLabel && (
                              <p className="text-[10.5px] text-ink-600 leading-tight">{attendance.checkOutLabel}</p>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Inline legend strip under the grid */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-border-subtle">
                  <LegendDot color="bg-accent-green" label="Present" />
                  <LegendDot color="bg-accent-orange" label="Late" />
                  <LegendDot color="bg-status-danger" label="Absent" />
                  <LegendDot color="bg-brand" label="Leave" />
                  <LegendDot color="bg-accent-violet" label="Holiday" />
                </div>
              </div>

              {/* RIGHT SIDEBAR */}
              <div className="space-y-6">
                {/* Upcoming Events */}
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-ink-900">Upcoming Events</h3>
                    <Link href="/employee/requests" className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors">
                      View all
                    </Link>
                  </div>

                  {upcoming === null && <Skeleton className="h-24" />}

                  {upcoming && upcoming.length === 0 && (
                    <p className="text-xs text-ink-600 py-4 text-center">No upcoming events</p>
                  )}

                  {upcoming && upcoming.length > 0 && (
                    <div className="space-y-3 mb-3">
                      {upcoming.map((ev) => (
                        <div key={`${ev.kind}-${ev.id}`} className="flex items-start gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              ev.kind === 'holiday' ? 'bg-accent-violet-bg text-accent-violet' : 'bg-brand-subtle text-brand'
                            }`}
                          >
                            {ev.kind === 'holiday' ? <Gift className="w-4 h-4" /> : <Umbrella className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink-900 truncate">{ev.title}</p>
                            <p className="text-[11px] text-ink-600">{formatDisplayDate(ev.date)}</p>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                              ev.kind === 'holiday'
                                ? 'bg-accent-violet-bg text-accent-violet'
                                : ev.status === 'Pending'
                                  ? 'bg-status-warning-bg text-status-warning'
                                  : 'bg-brand-subtle text-brand'
                            }`}
                          >
                            {ev.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    href="/employee#leave-request"
                    className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand border border-border-subtle rounded-lg py-2.5 hover:bg-surface-card-hover transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Apply for Leave
                  </Link>
                </div>

                {/* My Shift */}
                <div className={`${cardClass} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-ink-900">My Shift</h3>
                    <span className="text-[11px] font-medium text-ink-400">This Month</span>
                  </div>

                  {monthData.shift ? (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-accent-orange-bg text-accent-orange flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900 truncate">{monthData.shift.name}</p>
                          <p className="text-xs text-ink-600">
                            {monthData.shift.startLabel ?? '—'} - {monthData.shift.endLabel ?? '—'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2.5 pt-3 border-t border-border-subtle">
                        <ShiftRow label="Shift Timing" value={`${monthData.shift.startLabel ?? '—'} - ${monthData.shift.endLabel ?? '—'}`} />
                        {monthData.shift.gracePeriodMinutes !== null && (
                          <ShiftRow label="Grace Period" value={`${monthData.shift.gracePeriodMinutes} min`} />
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-ink-600 py-4 text-center">No shift assigned</p>
                  )}
                </div>

                {/* Calendar Legend */}
                <div className={`${cardClass} p-5`}>
                  <h3 className="text-sm font-bold text-ink-900 mb-3">Calendar Legend</h3>
                  <div className="space-y-3">
                    <LegendRow color="bg-accent-green" title="Present" desc="You were present" />
                    <LegendRow color="bg-accent-orange" title="Late" desc="You were late" />
                    <LegendRow color="bg-status-danger" title="Absent" desc="You were absent" />
                    <LegendRow color="bg-brand" title="Leave" desc="Approved leave" />
                    <LegendRow color="bg-accent-violet" title="Holiday" desc="Company holiday" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* DAY DETAIL MODAL */}
      {selectedDetail && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
          onClick={() => setSelectedDateKey(null)}
        >
          <div
            className="bg-surface-card rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-brand" />
                <h3 className="text-sm font-bold text-ink-900">{formatDisplayDate(selectedDetail.dateKey)}</h3>
              </div>
              <button
                onClick={() => setSelectedDateKey(null)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedDetail.holiday && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-accent-violet-bg">
                  <Gift className="w-4 h-4 text-accent-violet shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{selectedDetail.holiday.name}</p>
                    <p className="text-[11px] text-accent-violet font-medium">Company Holiday</p>
                  </div>
                </div>
              )}

              {selectedDetail.attendance && (
                <div className="p-3 rounded-lg border border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-ink-600">Attendance</span>
                    <StatusDot status={selectedDetail.attendance.status} showLabel />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-ink-400">Check-in</p>
                      <p className="font-medium text-ink-900">{selectedDetail.attendance.checkInLabel ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-ink-400">Check-out</p>
                      <p className="font-medium text-ink-900">{selectedDetail.attendance.checkOutLabel ?? '—'}</p>
                    </div>
                  </div>
                  {selectedDetail.attendance.workingMinutes > 0 && (
                    <p className="text-[11px] text-ink-600 mt-2">
                      Working hours: <span className="font-semibold text-ink-900">{formatWorkingHours(selectedDetail.attendance.workingMinutes)}</span>
                    </p>
                  )}
                  {selectedDetail.attendance.isLate && selectedDetail.attendance.minutesLate > 0 && (
                    <p className="text-[11px] text-accent-orange mt-1">Late by {selectedDetail.attendance.minutesLate} min</p>
                  )}
                </div>
              )}

              {selectedDetail.leaves.length > 0 && selectedDetail.leaves.map((l) => (
                <div key={l.id} className="p-3 rounded-lg bg-brand-subtle">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink-900">{l.leaveType}</p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        l.status === 'Approved' ? 'bg-status-success-bg text-status-success' : 'bg-status-warning-bg text-status-warning'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-600 mt-1">
                    {formatDisplayDate(l.startDate)} {l.endDate !== l.startDate ? `– ${formatDisplayDate(l.endDate)}` : '· Full Day'}
                  </p>
                </div>
              ))}

              {!selectedDetail.holiday && !selectedDetail.attendance && selectedDetail.leaves.length === 0 && (
                <p className="text-xs text-ink-600 text-center py-6">No records for this date</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Small presentational helpers
   ───────────────────────────────────────────── */

function SummaryCard({
  icon, iconBg, label, value, sublabel,
}: { icon: React.ReactNode; iconBg: string; label: string; value: string; sublabel: string }) {
  return (
    <div className={`${cardClass} p-5 flex items-center gap-3.5`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-600 truncate">{label}</p>
        <p className="text-xl font-bold text-ink-900 leading-tight">{value}</p>
        <p className="text-[11px] text-ink-400">{sublabel}</p>
      </div>
    </div>
  );
}

function StatusDot({ status, showLabel = false }: { status: string; showLabel?: boolean }) {
  const styles: Record<string, { dot: string; text: string }> = {
    Present: { dot: 'bg-accent-green', text: 'text-accent-green' },
    Late: { dot: 'bg-accent-orange', text: 'text-accent-orange' },
    Absent: { dot: 'bg-status-danger', text: 'text-status-danger' },
    'Half Day': { dot: 'bg-accent-orange', text: 'text-accent-orange' },
    'On Leave': { dot: 'bg-brand', text: 'text-brand' },
  };
  const s = styles[status] ?? styles.Present;
  return (
    <div className={`flex items-center gap-1 text-[10.5px] font-semibold ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
      {showLabel && <span>{status}</span>}
      {!showLabel && <span className="truncate">{status}</span>}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-600">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function LegendRow({ color, title, desc }: { color: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
      <div>
        <p className="text-sm font-medium text-ink-900">{title}</p>
        <p className="text-[11px] text-ink-600">{desc}</p>
      </div>
    </div>
  );
}

function ShiftRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-600">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}

function FilterGroup({
  label, value, options, optionLabels, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  optionLabels?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors cursor-pointer ${
              value === opt
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-canvas text-ink-600 border-border-subtle hover:border-border-hover'
            }`}
          >
            {optionLabels?.[opt] ?? opt}
          </button>
        ))}
      </div>
    </div>
  );
}