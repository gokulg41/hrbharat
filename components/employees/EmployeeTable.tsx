'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Eye, Pencil, MoreVertical } from 'lucide-react';
import type { Employee } from '@/lib/employees/types';
import { getEmployeeStatus, getInitials, hueForName, formatINR, formatJoinDate } from '@/lib/employees/format';
import EmployeeStatusBadge from './EmployeeStatusBadge';

interface EmployeeTableProps {
  employees: Employee[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
}

function RowMenu({ employee, onView, onEdit }: { employee: Employee; onView: (e: Employee) => void; onEdit: (e: Employee) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg hover:bg-surface-card-hover text-ink-400 hover:text-ink-900 transition-colors cursor-pointer"
        aria-label="Row actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-32 bg-surface-card border border-border-subtle rounded-lg shadow-card overflow-hidden">
          <button
            onClick={() => {
              onView(employee);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-sans text-ink-900 hover:bg-surface-card-hover cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <button
            onClick={() => {
              onEdit(employee);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-sans text-ink-900 hover:bg-surface-card-hover cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      )}
    </div>
  );
}

export default function EmployeeTable({ employees, selectedIds, onToggleSelect, onToggleSelectAll, onView, onEdit }: EmployeeTableProps) {
  const allOnPageSelected = employees.length > 0 && employees.every((e) => selectedIds.has(e.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-canvas border-y border-border-subtle">
          <tr>
            <th className="px-5 py-3 w-10">
              <input type="checkbox" checked={allOnPageSelected} onChange={onToggleSelectAll} className="cursor-pointer accent-brand" />
            </th>
            <th className="text-left px-2 py-3 font-medium text-ink-400 text-xs uppercase tracking-wide">Employee</th>
            <th className="text-left px-4 py-3 font-medium text-ink-400 text-xs uppercase tracking-wide">Employee ID</th>
            <th className="text-left px-4 py-3 font-medium text-ink-400 text-xs uppercase tracking-wide">Department</th>
            <th className="text-left px-4 py-3 font-medium text-ink-400 text-xs uppercase tracking-wide">Designation</th>
            <th className="text-left px-4 py-3 font-medium text-ink-400 text-xs uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 font-medium text-ink-400 text-xs uppercase tracking-wide">Join Date</th>
            <th className="text-left px-4 py-3 font-medium text-ink-400 text-xs uppercase tracking-wide">Salary</th>
            <th className="text-right px-5 py-3 font-medium text-ink-400 text-xs uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {employees.map((emp) => {
            const status = getEmployeeStatus(emp);
            const hue = hueForName(emp.full_name);
            return (
              <tr key={emp.id} className="hover:bg-surface-card-hover transition-colors">
                <td className="px-5 py-3.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(emp.id)}
                    onChange={() => onToggleSelect(emp.id)}
                    className="cursor-pointer accent-brand"
                  />
                </td>
                <td className="px-2 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[11px] font-semibold shrink-0 font-sans"
                      style={{ background: `hsl(${hue} 55% 88%)`, color: `hsl(${hue} 50% 35%)` }}
                    >
                      {getInitials(emp.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900 font-sans truncate">{emp.full_name}</p>
                      <p className="text-ink-400 font-sans text-xs truncate">{emp.email || emp.phone_number || emp.phone || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-ink-600 font-mono text-xs">{emp.employee_code || '—'}</td>
                <td className="px-4 py-3.5 text-ink-600 font-sans">{emp.department || 'Operations'}</td>
                <td className="px-4 py-3.5 text-ink-600 font-sans">{emp.designation || 'Staff'}</td>
                <td className="px-4 py-3.5">
                  <EmployeeStatusBadge status={status} />
                </td>
                <td className="px-4 py-3.5 text-ink-600 font-sans">{formatJoinDate(emp.joining_date)}</td>
                <td className="px-4 py-3.5 text-ink-900 font-medium font-sans">{formatINR(emp.monthly_salary)}</td>
                <td className="px-5 py-3.5">
                  <RowMenu employee={emp} onView={onView} onEdit={onEdit} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
