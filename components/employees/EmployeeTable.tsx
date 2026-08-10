'use client';

import React, { useState } from 'react';
import { MoreVertical, Eye, Pencil } from 'lucide-react';
import type { Employee } from '@/lib/employees/types';
import { formatINR, formatJoinDate, getInitials, getAvatarColors } from '@/lib/employees/format';
import EmployeeStatusBadge from './EmployeeStatusBadge';

interface EmployeeTableProps {
  employees: Employee[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
}

export default function EmployeeTable({
  employees,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEdit,
}: EmployeeTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const allSelected = employees.length > 0 && employees.every((e) => selectedIds.has(e.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr className="border-b border-border-subtle">
            <Th className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="w-4 h-4 rounded border-border-hover text-brand focus:ring-brand/30 cursor-pointer"
              />
            </Th>
            <Th>Employee</Th>
            <Th>Employee ID</Th>
            <Th>Department</Th>
            <Th>Designation</Th>
            <Th>Status</Th>
            <Th>Join Date</Th>
            <Th align="right">Salary</Th>
            <Th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const isSelected = selectedIds.has(emp.id);
            const avatarColors = getAvatarColors(emp.id || emp.full_name);
            return (
              <tr
                key={emp.id}
                className={`border-b border-border-subtle last:border-0 transition-colors ${
                  isSelected ? 'bg-brand-subtle/40' : 'hover:bg-surface-card-hover'
                }`}
              >
                <Td>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(emp.id)}
                    className="w-4 h-4 rounded border-border-hover text-brand focus:ring-brand/30 cursor-pointer"
                  />
                </Td>
                <Td>
                  <button onClick={() => onView(emp)} className="flex items-center gap-3 text-left cursor-pointer group">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold font-sans shrink-0"
                      style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }}
                    >
                      {getInitials(emp.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 font-sans truncate group-hover:text-brand transition-colors">
                        {emp.full_name}
                      </p>
                      <p className="text-xs text-ink-400 font-sans truncate">{emp.email}</p>
                    </div>
                  </button>
                </Td>
                <Td className="text-ink-600 font-mono text-xs">{emp.employee_code}</Td>
                <Td className="text-ink-600">{emp.department}</Td>
                <Td className="text-ink-600">{emp.designation}</Td>
                <Td>
                  <EmployeeStatusBadge status={emp.status} />
                </Td>
                <Td className="text-ink-600 whitespace-nowrap">{formatJoinDate(emp.join_date)}</Td>
                <Td align="right" className="text-ink-900 font-medium font-mono whitespace-nowrap">
                  {formatINR(emp.salary)}
                </Td>
                <Td>
                  <div className="relative flex justify-end">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === emp.id ? null : emp.id)}
                      className="p-1.5 rounded-md text-ink-400 hover:text-ink-900 hover:bg-surface-card-hover transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === emp.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-8 z-20 w-36 bg-surface-card border border-border-subtle rounded-lg shadow-card py-1">
                          <button
                            onClick={() => {
                              onView(emp);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-sans text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => {
                              onEdit(emp);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-sans text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = '', align = 'left' }: { children?: React.ReactNode; className?: string; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400 font-sans ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = '', align = 'left' }: { children?: React.ReactNode; className?: string; align?: 'left' | 'right' }) {
  return (
    <td className={`px-4 py-3 text-sm font-sans ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      {children}
    </td>
  );
}
