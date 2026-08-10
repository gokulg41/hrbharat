import type { Employee, EmployeeStatus } from './types';

/**
 * Normalizes the raw `status` column into one of the three states the UI
 * understands. No `status` column has historically been guaranteed on the
 * employees table, so this defaults to "active" — same fallback pattern
 * used everywhere else in this codebase (e.g. `emp.department || 'Operations'`).
 */
export function getEmployeeStatus(emp: Pick<Employee, 'status'>): EmployeeStatus {
  const raw = String(emp?.status || 'active').toLowerCase().replace(/\s+/g, '_');
  if (raw === 'on_leave' || raw === 'leave' || raw === 'onleave') return 'on_leave';
  if (raw === 'inactive' || raw === 'terminated' || raw === 'resigned' || raw === 'offboarded') return 'inactive';
  return 'active';
}

export function getEmploymentType(emp: Pick<Employee, 'employment_type'>): string {
  return emp?.employment_type || 'Full-time';
}

export function getInitials(name: string): string {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_HUES = [210, 160, 340, 30, 280, 195];
export function hueForName(name: string): number {
  return AVATAR_HUES[(name || '?').charCodeAt(0) % AVATAR_HUES.length];
}

export function formatINR(n: number | null | undefined): string {
  return `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
}

export function formatJoinDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
