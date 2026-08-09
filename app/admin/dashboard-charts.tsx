"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Clock, Activity } from 'lucide-react';

/* ─────────────────────────────────────────────
   NOTE ON DATA SOURCES
   These charts only use fields already present in the
   dashboard's existing state (todayAttendance, employees,
   leaveRequests). No historical multi-day attendance table
   exists yet, so there is no real "trend over time" data —
   the hour-of-day chart below uses today's punch_in_time
   values instead of fabricating a weekly trend. Wire a real
   attendance_history query later if a multi-day trend view
   is wanted.

   The attendance breakdown uses Present (todayAttendance),
   On Leave (pending leave_requests for today — the only leave
   signal currently fetched by the dashboard) and Absent
   (the remainder). The reference design's "Half Day" segment
   has no backing field in the current attendance schema, so
   it's intentionally left out rather than faked.
───────────────────────────────────────────── */

function CardShell({
  icon,
  title,
  action,
  children,
  className = '',
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0">
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
    <div className="h-[220px] flex flex-col items-center justify-center gap-2">
      <Activity className="w-6 h-6 text-ink-400" />
      <p className="text-xs text-ink-400 font-sans text-center max-w-[240px]">{text}</p>
    </div>
  );
}

/* ── Check-ins by hour (today) ───────────────────────────────── */
export function CheckInsByHourChart({ todayAttendance }: { todayAttendance: any[] }) {
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

  const total = todayAttendance?.length || 0;

  return (
    <CardShell
      icon={<Clock className="w-3.5 h-3.5" />}
      title="Check-ins by hour (today)"
      className="h-full"
    >
      {data.length === 0 ? (
        <EmptyChartState text="Check-in activity will appear here once employees start punching in." />
      ) : (
        <>
          <div className="mb-3">
            <span className="text-3xl font-bold text-ink-900 font-sans tabular-nums block leading-none">{total}</span>
            <span className="text-xs text-ink-400 font-sans">Total check-ins</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--ink-400)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-400)' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                cursor={{ fill: 'var(--surface-card-hover)' }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}
                formatter={(value: any) => [`${value} check-ins`, '']}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="count" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </CardShell>
  );
}

/* ── Attendance breakdown donut ──────────────────────────────── */
export function AttendanceDonut({ employees, todayAttendance, leaveRequests }: { employees: any[]; todayAttendance: any[]; leaveRequests: any[] }) {
  const total = employees.length;
  const present = todayAttendance.length;
  const onLeave = Math.min(leaveRequests?.length || 0, Math.max(0, total - present));
  const absent = Math.max(0, total - present - onLeave);

  const segments = [
    { name: 'Present', value: present, color: '#15803d' },
    { name: 'On Leave', value: onLeave, color: '#d97706' },
    { name: 'Absent', value: absent, color: '#e2e8f0' },
  ];
  const hasData = total > 0;
  const chartData = hasData ? segments.filter((s) => s.value > 0) : [{ name: 'Empty', value: 1, color: '#e2e8f0' }];

  return (
    <CardShell icon={<Activity className="w-3.5 h-3.5" />} title="Attendance overview" className="h-full">
      {!hasData ? (
        <EmptyChartState text="Attendance breakdown will appear here once you onboard employees." />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-[180px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={55} outerRadius={78} startAngle={90} endAngle={-270} stroke="none">
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-ink-900 font-sans">{total}</span>
              <span className="text-[10px] text-ink-400 font-sans">Total</span>
            </div>
          </div>
          <div className="w-full space-y-2">
            {segments.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs font-sans">
                <span className="flex items-center gap-2 text-ink-600">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="text-ink-900 font-semibold tabular-nums">
                  {s.value} <span className="text-ink-400 font-normal">({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
}

/* ── Exported section (charts only — Quick Actions lives in page.tsx
     since it needs access to page-level handlers like opening the
     Add Employee drawer and switching tabs) ─────────────────────── */
export default function DashboardCharts({
  employees,
  todayAttendance,
  leaveRequests,
}: {
  employees: any[];
  todayAttendance: any[];
  leaveRequests: any[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <CheckInsByHourChart todayAttendance={todayAttendance} />
      </div>
      <div>
        <AttendanceDonut employees={employees} todayAttendance={todayAttendance} leaveRequests={leaveRequests} />
      </div>
    </div>
  );
}