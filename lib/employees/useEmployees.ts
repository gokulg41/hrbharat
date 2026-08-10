'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DepartmentBreakdown, Employee, EmployeeMetrics } from './types';
import { getEmployeeStatus } from './format';

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
  departmentBreakdown: [],
  newHiresThisMonth: 0,
  newHiresLastMonth: 0,
};

export function useEmployees(companyId: string | null): UseEmployeesResult {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // Same query shape already used in tabs-view.tsx: '*' plus the shift join.
    const { data, error: fetchError } = await supabase
      .from('employees')
      .select('*, company_shifts(*)')
      .eq('company_id', companyId)
      .order('full_name', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setEmployees([]);
    } else {
      setEmployees((data || []) as Employee[]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const metrics = useMemo<EmployeeMetrics>(() => {
    if (employees.length === 0) return EMPTY_METRICS;

    const now = new Date();
    let active = 0;
    let onLeave = 0;
    let inactive = 0;
    const deptMap: Record<string, number> = {};
    let newHiresThisMonth = 0;
    let newHiresLastMonth = 0;
    const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    employees.forEach((e) => {
      const status = getEmployeeStatus(e);
      if (status === 'active') active++;
      else if (status === 'on_leave') onLeave++;
      else inactive++;

      const dept = e.department || 'Operations';
      deptMap[dept] = (deptMap[dept] || 0) + 1;

      if (e.joining_date) {
        const d = new Date(e.joining_date);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) newHiresThisMonth++;
        if (d.getMonth() === lastMonthRef.getMonth() && d.getFullYear() === lastMonthRef.getFullYear()) newHiresLastMonth++;
      }
    });

    const departmentBreakdown: DepartmentBreakdown[] = Object.entries(deptMap)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: employees.length,
      active,
      onLeave,
      inactive,
      departmentCount: departmentBreakdown.length,
      departmentBreakdown,
      newHiresThisMonth,
      newHiresLastMonth,
    };
  }, [employees]);

  return { employees, loading, error, metrics, refetch: fetchEmployees };
}
