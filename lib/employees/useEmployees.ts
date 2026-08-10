'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Employee, EmployeeMetrics } from './types';

interface UseEmployeesResult {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  metrics: EmployeeMetrics;
  refetch: () => Promise<void>;
}

const EMPTY_METRICS: EmployeeMetrics = {
  total: 0,
  active: 0,
  onLeave: 0,
  inactive: 0,
  departmentCount: 0,
  newHiresThisMonth: 0,
  newHiresLastMonth: 0,
  departmentBreakdown: [],
};

export function useEmployees(companyId: string | null): UseEmployeesResult {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    if (!companyId) {
      setEmployees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // NOTE: swap 'employees' for your real table name if different.
    const { data, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .order('join_date', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setEmployees([]);
    } else {
      setEmployees((data ?? []) as Employee[]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const metrics = useMemo<EmployeeMetrics>(() => {
    if (employees.length === 0) return EMPTY_METRICS;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let active = 0;
    let onLeave = 0;
    let inactive = 0;
    let newHiresThisMonth = 0;
    let newHiresLastMonth = 0;
    const deptMap = new Map<string, number>();

    for (const emp of employees) {
      if (emp.status === 'active') active += 1;
      else if (emp.status === 'on_leave') onLeave += 1;
      else if (emp.status === 'inactive') inactive += 1;

      if (emp.join_date) {
        const joined = new Date(emp.join_date);
        if (joined.getMonth() === thisMonth && joined.getFullYear() === thisYear) {
          newHiresThisMonth += 1;
        } else if (joined.getMonth() === lastMonth && joined.getFullYear() === lastMonthYear) {
          newHiresLastMonth += 1;
        }
      }

      const dept = emp.department || 'Unassigned';
      deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
    }

    const departmentBreakdown = Array.from(deptMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: employees.length,
      active,
      onLeave,
      inactive,
      departmentCount: deptMap.size,
      newHiresThisMonth,
      newHiresLastMonth,
      departmentBreakdown,
    };
  }, [employees]);

  return { employees, loading, error, metrics, refetch: fetchEmployees };
}
