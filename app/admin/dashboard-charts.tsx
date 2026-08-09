"use client";

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Clock, PieChart as PieIcon, BarChart3 } from 'lucide-react';

/* ─────────────────────────────────────────────
   NOTE ON DATA SOURCES
   These charts only use fields already present in
   the dashboard's existing state (todayAttendance,
   employees, deptCounts). No historical multi-day
   attendance table exists yet, so there is no real
   "trend over time" data — the hour-of-day chart
   below uses today's punch_in_time values instead
   of fabricating a weekly trend. Wire a real
   attendance_history query later if a multi-day
   trend view is wanted.
───────────────────────────────────────────── */

function ChartCard({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-ink-900 font-sans">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyChartState({ text }: { text: string }) {
  return (
    <div className="h-[180px] flex items-center justify-center">
      <p className="text-xs text-ink-400 font-sans text-center max-w-[220px]">{text}</p>
    </div>
  );
}

/* ── Check-ins by hour (today) ───────────────────────────────── */
function CheckInsByHourChart({ todayAttendance }: { todayAttendance: any[] }) {
  const data = useMemo(() => {
    if (!todayAttendance || todayAttendance.length === 0) return [];
    const buckets: Record<number, number> = {};
    todayAttendance.forEach((log) => {
      const raw = String(log.punch_in_time || '');
      const hour = parseInt(raw.split(':')[0], 10);
      if (!isNaN(hour)) buckets[hour] = (buckets[hour] || 0) + 1;
    });
    const hours = Object.keys(buckets).map(Number).sort((a, b) => a - b);
    if (hours.length === 0) return [];
    const start = Math.max(0, Math.min(...hours) - 1);
    const end = Math.min(23, Math.max(...hours) + 1);
    const out = [];
    for (let h = start; h <= end; h++) {
      out.push({ hour: `${h.toString().padStart(2, '0')}:00`, count: buckets[h] || 0 });
    }
    return out;
  }, [todayAttendance]);

  return (
    <ChartCard icon={<Clock className="w-3.5 h-3.5" />} title="Check-ins by hour (today)">
      {data.length === 0 ? (
        <EmptyChartState text="Check-in activity will appear here once employees start punching in." />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="checkinFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--ink-400)' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-400)' }} axisLine={false} tickLine={false} width={24} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
            <Area type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} fill="url(#checkinFill)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ── Attendance donut (present vs total) ─────────────────────── */
function AttendanceDonut({ employees, todayAttendance }: { employees: any[]; todayAttendance: any[] }) {
  const total = employees.length;
  const present = todayAttendance.length;
  const absent = Math.max(0, total - present);
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  const data = [
    { name: 'Present', value: present },
    { name: 'Absent', value: absent || 1 },
  ];
  const colors = ['#10b981', '#e2e8f0'];

  return (
    <ChartCard icon={<PieIcon className="w-3.5 h-3.5" />} title="Attendance today">
      {total === 0 ? (
        <EmptyChartState text="Attendance breakdown will appear here once you onboard employees." />
      ) : (
        <div className="relative h-[180px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={55} outerRadius={75} startAngle={90} endAngle={-270} stroke="none">
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={colors[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-ink-900 font-sans">{rate}%</span>
            <span className="text-[10px] text-ink-400 font-sans">present</span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

/* ── Department / designation distribution ───────────────────── */
function DistributionBarChart({
  deptCounts,
  designationCounts,
}: {
  deptCounts: Record<string, number>;
  designationCounts: Record<string, number>;
}) {
  const [mode, setMode] = useState<'department' | 'designation'>('department');
  const source = mode === 'department' ? deptCounts : designationCounts;
  const data = Object.entries(source).map(([name, count]) => ({ name, count }));

  return (
    <ChartCard
      icon={<BarChart3 className="w-3.5 h-3.5" />}
      title="Team distribution"
      action={
        <div className="flex gap-0.5 bg-[var(--surface-card-hover)] p-0.5 rounded-md border border-[var(--border-subtle)]">
          {(['department', 'designation'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded text-[10px] font-sans font-medium capitalize cursor-pointer transition-colors ${
                mode === m ? 'bg-[var(--surface-card)] text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      }
    >
      {data.length === 0 ? (
        <EmptyChartState text="Team distribution will appear here once you onboard employees." />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-400)' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-400)' }} axisLine={false} tickLine={false} width={24} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
            <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ── Exported section ─────────────────────────────────────────── */
export default function DashboardCharts({
  employees,
  todayAttendance,
  deptCounts,
  designationCounts,
}: {
  employees: any[];
  todayAttendance: any[];
  deptCounts: Record<string, number>;
  designationCounts: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CheckInsByHourChart todayAttendance={todayAttendance} />
      <AttendanceDonut employees={employees} todayAttendance={todayAttendance} />
      <DistributionBarChart deptCounts={deptCounts} designationCounts={designationCounts} />
    </div>
  );
}