import { supabase } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL (verified against live schema before writing this file)
   ─────────────────────────────────────────────
   "My Calendar" combines four existing tables, plus one new table:
     - attendance        (employee_id, date, check_in, check_out, status, is_late, minutes_late)
     - leave_requests     (employee_id, leave_type, start_date, end_date, status)
     - employees          (assigned_shift_id -> company_shifts)
     - company_shifts     (shift_name, start_time, end_time, grace_period_minutes)
     - company_holidays   (NEW — no holiday table existed anywhere in the schema.
       Added via migration 20260811120000_company_holidays_table.sql, scoped by
       company_id with the same owner-manage / employee-self-read RLS shape used
       by company_shifts.)

   `attendance.check_in` / `check_out` are the typed timestamptz columns and are
   treated as the source of truth here. Some other pages in this app write a
   legacy `punch_in_time` text column instead — that's a pre-existing
   inconsistency in the punch flow, not something this page tries to fix. We
   fall back to `punch_in_time` for display only when `check_in` is empty, so
   older/legacy rows still show a check-in time.
   ───────────────────────────────────────────── */

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'On Leave';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface DayAttendance {
  status: AttendanceStatus;
  checkInLabel: string | null;
  checkOutLabel: string | null;
  workingMinutes: number;
  isLate: boolean;
  minutesLate: number;
}

export interface DayLeave {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason: string;
}

export interface DayHoliday {
  id: string;
  name: string;
}

export interface ShiftInfo {
  name: string;
  startLabel: string | null;
  endLabel: string | null;
  gracePeriodMinutes: number | null;
}

export interface UpcomingEvent {
  id: string;
  kind: 'leave' | 'holiday';
  title: string;
  date: string; // yyyy-mm-dd
  detail: string; // e.g. "1 Day" or "Holiday"
  status?: LeaveStatus;
}

export interface CalendarMonthData {
  attendanceByDate: Record<string, DayAttendance>;
  leavesByDate: Record<string, DayLeave[]>;
  holidaysByDate: Record<string, DayHoliday>;
  shift: ShiftInfo | null;
  summary: {
    presentDays: number;
    leaveDays: number;
    holidays: number;
    workingMinutesTotal: number;
  };
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function timeLabelFromISO(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function timeLabelFromTimeOfDay(t: string | null | undefined): string | null {
  if (!t) return null;
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatWorkingHours(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}h ${pad(m)}m`;
}

/** Expand a leave request's [start_date, end_date] range into individual day keys, clipped to [rangeStart, rangeEnd]. */
function expandLeaveDays(startKey: string, endKey: string, rangeStart: string, rangeEnd: string): string[] {
  const start = parseDateKey(startKey < rangeStart ? rangeStart : startKey);
  const end = parseDateKey(endKey > rangeEnd ? rangeEnd : endKey);
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export interface EmployeeIdentity {
  id: string;
  employee_code: string;
  company_id: string;
}

export async function fetchCalendarMonthData(
  employee: EmployeeIdentity,
  year: number,
  monthIndex0: number // 0-11
): Promise<CalendarMonthData> {
  const monthStart = new Date(year, monthIndex0, 1);
  const monthEnd = new Date(year, monthIndex0 + 1, 0);
  const startKey = toDateKey(monthStart);
  const endKey = toDateKey(monthEnd);

  const [attendanceRes, leaveRes, holidayRes, shiftRes] = await Promise.all([
    supabase
      .from('attendance')
      .select('date, status, check_in, check_out, punch_in_time, is_late, minutes_late')
      .eq('company_id', employee.company_id)
      .eq('employee_id', employee.id)
      .gte('date', startKey)
      .lte('date', endKey),
    supabase
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, status, reason')
      .eq('company_id', employee.company_id)
      .eq('employee_id', employee.id)
      .lte('start_date', endKey)
      .gte('end_date', startKey)
      .neq('status', 'Rejected')
      .neq('status', 'Cancelled'),
    supabase
      .from('company_holidays')
      .select('id, name, date')
      .eq('company_id', employee.company_id)
      .gte('date', startKey)
      .lte('date', endKey),
    supabase
      .from('employees')
      .select('assigned_shift_id, company_shifts(shift_name, start_time, end_time, grace_period_minutes)')
      .eq('id', employee.id)
      .maybeSingle(),
  ]);

  if (attendanceRes.error) throw attendanceRes.error;
  if (leaveRes.error) throw leaveRes.error;
  if (holidayRes.error) throw holidayRes.error;

  const attendanceByDate: Record<string, DayAttendance> = {};
  for (const row of attendanceRes.data ?? []) {
    const checkIn = timeLabelFromISO(row.check_in) ?? (row.punch_in_time ? String(row.punch_in_time) : null);
    const checkOut = timeLabelFromISO(row.check_out);
    let workingMinutes = 0;
    if (row.check_in && row.check_out) {
      const ms = new Date(row.check_out).getTime() - new Date(row.check_in).getTime();
      if (ms > 0) workingMinutes = ms / 60000;
    }
    attendanceByDate[row.date] = {
      status: (row.status as AttendanceStatus) ?? 'Present',
      checkInLabel: checkIn,
      checkOutLabel: checkOut,
      workingMinutes,
      isLate: !!row.is_late,
      minutesLate: row.minutes_late ?? 0,
    };
  }

  const leavesByDate: Record<string, DayLeave[]> = {};
  let leaveDayCount = 0;
  for (const row of leaveRes.data ?? []) {
    const days = expandLeaveDays(row.start_date, row.end_date, startKey, endKey);
    for (const key of days) {
      if (!leavesByDate[key]) leavesByDate[key] = [];
      leavesByDate[key].push({
        id: row.id,
        leaveType: row.leave_type,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status as LeaveStatus,
        reason: row.reason,
      });
      if (row.status === 'Approved') leaveDayCount += 1;
    }
  }

  const holidaysByDate: Record<string, DayHoliday> = {};
  for (const row of holidayRes.data ?? []) {
    holidaysByDate[row.date] = { id: row.id, name: row.name };
  }

  let shift: ShiftInfo | null = null;
  const shiftRow = shiftRes.data as {
    assigned_shift_id: string | null;
    company_shifts: { shift_name: string; start_time: string; end_time: string; grace_period_minutes: number | null } | null;
  } | null;
  const shiftJoin = shiftRow?.company_shifts;
  if (shiftJoin) {
    shift = {
      name: shiftJoin.shift_name,
      startLabel: timeLabelFromTimeOfDay(shiftJoin.start_time),
      endLabel: timeLabelFromTimeOfDay(shiftJoin.end_time),
      gracePeriodMinutes: shiftJoin.grace_period_minutes ?? null,
    };
  }

  const presentDays = Object.values(attendanceByDate).filter(
    (a) => a.status === 'Present' || a.status === 'Late'
  ).length;
  const workingMinutesTotal = Object.values(attendanceByDate).reduce((sum, a) => sum + a.workingMinutes, 0);

  return {
    attendanceByDate,
    leavesByDate,
    holidaysByDate,
    shift,
    summary: {
      presentDays,
      leaveDays: leaveDayCount,
      holidays: Object.keys(holidaysByDate).length,
      workingMinutesTotal,
    },
  };
}

export async function fetchUpcomingEvents(employee: EmployeeIdentity, limit = 5): Promise<UpcomingEvent[]> {
  const todayKey = toDateKey(new Date());

  const [leaveRes, holidayRes] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, status')
      .eq('company_id', employee.company_id)
      .eq('employee_id', employee.id)
      .gte('start_date', todayKey)
      .in('status', ['Approved', 'Pending'])
      .order('start_date', { ascending: true })
      .limit(limit),
    supabase
      .from('company_holidays')
      .select('id, name, date')
      .eq('company_id', employee.company_id)
      .gte('date', todayKey)
      .order('date', { ascending: true })
      .limit(limit),
  ]);

  if (leaveRes.error) throw leaveRes.error;
  if (holidayRes.error) throw holidayRes.error;

  const events: UpcomingEvent[] = [];

  for (const row of leaveRes.data ?? []) {
    const dayCount = Math.round(
      (parseDateKey(row.end_date).getTime() - parseDateKey(row.start_date).getTime()) / 86400000
    ) + 1;
    events.push({
      id: row.id,
      kind: 'leave',
      title: row.leave_type,
      date: row.start_date,
      detail: `${dayCount} Day${dayCount > 1 ? 's' : ''}`,
      status: row.status as LeaveStatus,
    });
  }

  for (const row of holidayRes.data ?? []) {
    events.push({
      id: row.id,
      kind: 'holiday',
      title: row.name,
      date: row.date,
      detail: 'Holiday',
    });
  }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return events.slice(0, limit);
}

export function formatDisplayDate(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}