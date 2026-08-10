import type { Employee } from './types';

export type QuickFilterKey = 'recent_joiners' | 'on_probation' | 'birthday_this_month' | 'work_anniversary';

export interface QuickFilterItem {
  key: QuickFilterKey;
  label: string;
  count: number;
}

const RECENT_JOINER_WINDOW_DAYS = 30;

/**
 * Only returns a filter if the underlying column is actually populated on
 * at least one row — this is what keeps "Quick Filters" honest instead of
 * showing a filter that can never match anything. Add the optional columns
 * (see README) to light these up.
 */
export function computeQuickFilters(employees: Employee[]): QuickFilterItem[] {
  const now = new Date();
  const items: QuickFilterItem[] = [];

  // Recent joiners — always available, derived from join_date (required column).
  const recentJoinersCount = employees.filter((e) => {
    if (!e.join_date) return false;
    const joined = new Date(e.join_date);
    const days = (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= RECENT_JOINER_WINDOW_DAYS;
  }).length;
  items.push({ key: 'recent_joiners', label: 'Recent Joiners', count: recentJoinersCount });

  // Work anniversary this month — derived from join_date, excluding the join year itself.
  const anniversaryCount = employees.filter((e) => {
    if (!e.join_date) return false;
    const joined = new Date(e.join_date);
    return joined.getMonth() === now.getMonth() && joined.getFullYear() < now.getFullYear();
  }).length;
  items.push({ key: 'work_anniversary', label: 'Work Anniversary', count: anniversaryCount });

  // On probation — only if probation_end_date is populated on the dataset.
  const hasProbationData = employees.some((e) => !!e.probation_end_date);
  if (hasProbationData) {
    const onProbationCount = employees.filter((e) => {
      if (!e.probation_end_date) return false;
      return new Date(e.probation_end_date).getTime() >= now.getTime();
    }).length;
    items.push({ key: 'on_probation', label: 'On Probation', count: onProbationCount });
  }

  // Birthday this month — only if date_of_birth is populated on the dataset.
  const hasDobData = employees.some((e) => !!e.date_of_birth);
  if (hasDobData) {
    const birthdayCount = employees.filter((e) => {
      if (!e.date_of_birth) return false;
      return new Date(e.date_of_birth).getMonth() === now.getMonth();
    }).length;
    items.push({ key: 'birthday_this_month', label: 'Birthday This Month', count: birthdayCount });
  }

  return items;
}

export function applyQuickFilter(employees: Employee[], key: QuickFilterKey): Employee[] {
  const now = new Date();
  switch (key) {
    case 'recent_joiners':
      return employees.filter((e) => {
        if (!e.join_date) return false;
        const days = (now.getTime() - new Date(e.join_date).getTime()) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= RECENT_JOINER_WINDOW_DAYS;
      });
    case 'work_anniversary':
      return employees.filter((e) => {
        if (!e.join_date) return false;
        const joined = new Date(e.join_date);
        return joined.getMonth() === now.getMonth() && joined.getFullYear() < now.getFullYear();
      });
    case 'on_probation':
      return employees.filter((e) => e.probation_end_date && new Date(e.probation_end_date).getTime() >= now.getTime());
    case 'birthday_this_month':
      return employees.filter((e) => e.date_of_birth && new Date(e.date_of_birth).getMonth() === now.getMonth());
    default:
      return employees;
  }
}
