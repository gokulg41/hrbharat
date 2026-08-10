import type { Employee } from './types';

export function exportEmployeesToCsv(employees: Employee[], filename = 'employees.csv') {
  const headers = ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Status', 'Join Date', 'Salary'];
  const rows = employees.map((e) => [
    e.employee_code,
    e.full_name,
    e.email,
    e.department,
    e.designation,
    e.status,
    e.join_date,
    String(e.salary),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
