import type { Employee } from './types';
import { getEmployeeStatus, getEmploymentType } from './format';

export function exportEmployeesToCsv(employees: Employee[], filename: string) {
  const headers = ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Status', 'Employment Type', 'Join Date', 'Monthly Salary'];
  const lines = employees.map((e) =>
    [
      e.employee_code || '',
      e.full_name || '',
      e.email || '',
      e.department || 'Operations',
      e.designation || 'Staff',
      getEmployeeStatus(e),
      getEmploymentType(e),
      e.joining_date ? new Date(e.joining_date).toISOString().split('T')[0] : '',
      Number(e.monthly_salary) || 0,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
