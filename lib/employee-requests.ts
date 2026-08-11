import { supabase } from '@/lib/supabase';
import { formatINR } from '@/lib/utils';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL (verified against live schema before writing this file)
   ─────────────────────────────────────────────
   "My Requests" combines three existing tables — no new table is created:
     - leave_requests             (employee_id, leave_type, start_date, end_date, reason, status)
     - advance_salary_requests    (employee_id, requested_amount, reason, status)
     - attendance_regularizations (employee_code, target_date, requested_punch_in/out, justification, status)

   Status casing is inconsistent across tables in production data
   ('Pending' vs 'pending'), so everything is normalized case-insensitively
   here and displayed in a single consistent Title Case.
   ───────────────────────────────────────────── */

export type RequestKind = 'leave' | 'advance' | 'attendance_correction';
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface EmployeeIdentity {
  id: string;
  employee_code: string;
  company_id: string;
}

interface LeaveRequestRow {
  id: string;
  leave_type: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

interface AdvanceRequestRow {
  id: string;
  requested_amount: number;
  reason: string | null;
  status: string;
  created_at: string;
}

interface RegularizationRow {
  id: string;
  target_date: string;
  requested_punch_in: string | null;
  requested_punch_out: string | null;
  justification: string | null;
  status: string;
  created_at: string;
}

export interface NormalizedRequest {
  id: string;
  kind: RequestKind;
  title: string;
  subtitle: string;
  /** Primary detail line, e.g. "14 Aug 2026 - 15 Aug 2026" or "09:00 AM - 06:00 PM" */
  detailPrimary: string;
  /** Secondary detail line, e.g. "2 days" — omitted when not applicable */
  detailSecondary?: string;
  amountLabel?: string;
  reason: string;
  status: RequestStatus;
  requestedAt: string; // ISO timestamp
  /** The date used for date-range filtering (actual request date, per type) */
  filterDate: string; // ISO date (yyyy-mm-dd)
  raw: LeaveRequestRow | AdvanceRequestRow | RegularizationRow;
}

export function normalizeStatus(raw: string | null | undefined): RequestStatus {
  const v = (raw || '').trim().toLowerCase();
  if (v === 'approved') return 'Approved';
  if (v === 'rejected') return 'Rejected';
  if (v === 'cancelled' || v === 'canceled') return 'Cancelled';
  return 'Pending';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${m} ${suffix}`;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

/**
 * Fetches the authenticated employee's own leave, advance and attendance
 * correction requests, and normalizes them into one combined feed.
 * RLS already scopes every one of these queries to the calling employee —
 * the explicit .eq() filters below are defense-in-depth, not the only guard.
 */
export async function fetchMyRequests(employee: EmployeeIdentity): Promise<NormalizedRequest[]> {
  const [leaveRes, advanceRes, regRes] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('*')
      .eq('company_id', employee.company_id)
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('advance_salary_requests')
      .select('*')
      .eq('company_id', employee.company_id)
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('attendance_regularizations')
      .select('*')
      .eq('company_id', employee.company_id)
      .eq('employee_code', employee.employee_code)
      .order('created_at', { ascending: false }),
  ]);

  if (leaveRes.error) throw leaveRes.error;
  if (advanceRes.error) throw advanceRes.error;
  if (regRes.error) throw regRes.error;

  const leaveItems: NormalizedRequest[] = (leaveRes.data || []).map((r: LeaveRequestRow) => {
    const sameDay = r.start_date === r.end_date;
    return {
      id: r.id,
      kind: 'leave',
      title: r.leave_type || 'Leave',
      subtitle: 'Leave Request',
      detailPrimary: sameDay ? formatDate(r.start_date) : `${formatDate(r.start_date)} - ${formatDate(r.end_date)}`,
      detailSecondary: `${daysBetween(r.start_date, r.end_date)} day${daysBetween(r.start_date, r.end_date) > 1 ? 's' : ''}`,
      reason: r.reason || '—',
      status: normalizeStatus(r.status),
      requestedAt: r.created_at,
      filterDate: r.start_date,
      raw: r,
    };
  });

  const advanceItems: NormalizedRequest[] = (advanceRes.data || []).map((r: AdvanceRequestRow) => ({
    id: r.id,
    kind: 'advance',
    title: 'Advance Salary',
    subtitle: 'Advance Request',
    detailPrimary: formatINR(r.requested_amount),
    amountLabel: formatINR(r.requested_amount),
    reason: r.reason || '—',
    status: normalizeStatus(r.status),
    requestedAt: r.created_at,
    filterDate: (r.created_at || '').slice(0, 10),
    raw: r,
  }));

  const regItems: NormalizedRequest[] = (regRes.data || []).map((r: RegularizationRow) => ({
    id: r.id,
    kind: 'attendance_correction',
    title: 'Attendance Correction',
    subtitle: 'Attendance Correction',
    detailPrimary: `${formatTime(r.requested_punch_in)} - ${formatTime(r.requested_punch_out)}`,
    reason: r.justification || '—',
    status: normalizeStatus(r.status),
    requestedAt: r.created_at,
    filterDate: r.target_date,
    raw: r,
  }));

  return [...leaveItems, ...advanceItems, ...regItems].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

const TABLE_BY_KIND: Record<RequestKind, string> = {
  leave: 'leave_requests',
  advance: 'advance_salary_requests',
  attendance_correction: 'attendance_regularizations',
};

/**
 * Cancels a pending request. Relies on RLS to enforce that only the owning
 * employee can do this, and only while the request is still pending:
 *   - leave_requests: "Employees can manage their own leave requests"
 *   - attendance_regularizations: "Employees can manage their own regularizations"
 *   - advance_salary_requests: "Employees can cancel their own pending advance requests"
 *     (added specifically for this feature — employees previously had no
 *     UPDATE access on this table at all)
 */
export async function cancelRequest(kind: RequestKind, id: string): Promise<void> {
  const { error } = await supabase.from(TABLE_BY_KIND[kind]).update({ status: 'Cancelled' }).eq('id', id);
  if (error) throw error;
}
