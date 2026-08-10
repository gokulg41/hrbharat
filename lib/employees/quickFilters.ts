import type { Employee } from './types';

/**
 * Only "Recent Joiners" and "Work Anniversary" are implemented — these are
 * the only two the current employees schema can actually support from
 * `joining_date`. "On Probation" and "Birthday This Month" would need a
 * probation flag / date-of-birth column that doesn't exist yet, so they are
 * intentionally left out rather than faked (per the design brief).
 */
export type QuickFilterKey = 'recent' | 'anniversary';

export interface QuickFilterItem {
  key: QuickFilterKey;
  label: string;
  count: number;
}

function isRecentJoiner(e: Employee, now: Date): boolean {
  if (!e.joining_date) return false;
  const diffDays = (now.getTime() - new Date(e.joining_date).getTime()) / 86400000;
  return diffDays >= 0 && diffDays <= 30;
}

function isWorkAnniversary(e: Employee, now: Date): boolean {
  if (!e.joining_date) return false;
  const d = new Date(e.joining_date);
  return d.getMonth() === now.getMonth() && d.getFullYear() < now.getFullYear();
}

export function computeQuickFilters(employees: Employee[]): QuickFilterItem[] {
  const now = new Date();
  return [
    { key: 'recent', label: 'Recent Joiners', count: employees.filter((e) => isRecentJoiner(e, now)).length },
    { key: 'anniversary', label: 'Work Anniversary', count: employees.filter((e) => isWorkAnniversary(e, now)).length },
  ];
}

export function applyQuickFilter(employees: Employee[], key: QuickFilterKey): Employee[] {
  const now = new Date();
  if (key === 'recent') return employees.filter((e) => isRecentJoiner(e, now));
  if (key === 'anniversary') return employees.filter((e) => isWorkAnniversary(e, now));
  return employees;
}
