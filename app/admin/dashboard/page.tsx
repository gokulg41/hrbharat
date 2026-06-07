"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Users,
  IndianRupee,
  Briefcase,
  Layers,
  UserPlus,
  MapPin,
  Calendar,
  ArrowUpRight,
  ShieldAlert,
  Building,
  Clock,
  Banknote,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  ClipboardList,
  ChevronRight,
  Circle,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Tiny helpers
───────────────────────────────────────────── */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hues = [210, 160, 340, 30, 280, 195];
  const hue = hues[name.charCodeAt(0) % hues.length];
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-semibold shrink-0"
      style={{ background: `hsl(${hue} 60% 92%)`, color: `hsl(${hue} 55% 38%)` }}
    >
      {initials}
    </span>
  );
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    gray: 'bg-[#EAE2CE] text-neutral-500',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-700',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

function Divider() {
  return <div className="border-t border-[#E8E0CC] my-0" />;
}

function SectionHeader({ icon, title, count, href }: { icon: React.ReactNode; title: string; count?: number; href?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <div className="flex items-center gap-2 text-neutral-500">
        <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] font-semibold text-neutral-400 tabular-nums">({count})</span>
        )}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-0.5 text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function AdminClientDashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [workforce, setWorkforce] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingAdvances, setPendingAdvances] = useState<any[]>([]);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [disconnectNode, setDisconnectNode] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: prof } = await supabase
        .from('profiles')
        .select('company_id, full_name, role')
        .eq('id', user.id)
        .single();

      if (!prof || prof.role !== 'admin') { router.push('/login'); return; }
      setProfile(prof);

      if (!prof.company_id) { setDisconnectNode(true); setLoading(false); return; }

      const [companyRes, employeesRes, leavesRes, advancesRes, logsRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', prof.company_id).single(),
        supabase.from('employees').select('*').eq('company_id', prof.company_id),
        supabase.from('leave_requests').select('*').eq('company_id', prof.company_id).eq('status', 'Pending'),
        supabase.from('advance_salary_requests').select('*').eq('company_id', prof.company_id).eq('status', 'Pending'),
        supabase.from('daily_tasks').select('*').eq('company_id', prof.company_id).order('created_at', { ascending: false }),
      ]);

      if (companyRes.data) setCompany(companyRes.data);
      if (employeesRes.data) setWorkforce(employeesRes.data);
      if (leavesRes.data) setPendingLeaves(leavesRes.data);
      if (advancesRes.data) setPendingAdvances(advancesRes.data);
      if (logsRes.data) setDailyLogs(logsRes.data);
      setLoading(false);
    }
    loadDashboardData();
  }, [router]);

  const handleActionUpdate = async (
    table: 'leave_requests' | 'advance_salary_requests',
    id: string,
    status: 'Approved' | 'Rejected'
  ) => {
    if (!profile?.company_id) return;
    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (!error) {
      if (table === 'leave_requests') setPendingLeaves((p) => p.filter((i) => i.id !== id));
      else setPendingAdvances((p) => p.filter((i) => i.id !== id));
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F0] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-sm bg-neutral-200 animate-pulse" />
          <p className="text-sm text-neutral-400 font-medium">Loading workspace…</p>
        </div>
      </div>
    );
  }

  /* ── Disconnected ── */
  if (disconnectNode) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-6">
        <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl p-8 max-w-sm w-full shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-base font-semibold text-neutral-900">No workspace connected</h2>
          <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
            Your account is authenticated but not linked to a company. Please complete your workspace setup to continue.
          </p>
        </div>
      </div>
    );
  }

  const totalActiveWorkers = workforce.length;
  const totalMonthlyPayroll = workforce.reduce((sum, emp) => sum + (Number(emp.monthly_salary) || 0), 0);
  const totalAdvanceClaims = pendingAdvances.reduce((sum, req) => sum + req.requested_amount, 0);

  /* ────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F5F0E8] font-['Georgia',_serif] antialiased">

      {/* ── Sidebar-style left rail (decorative top border) ── */}
      <div className="fixed top-0 left-0 right-0 h-px bg-neutral-200 z-10" />

      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">

        {/* ── Page Title block (Notion-style) ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <Building className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-400 font-sans">{company?.name || 'Your Company'}</span>
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 tracking-tight leading-tight">
            Operational Overview
          </h1>
          <p className="text-neutral-500 text-sm font-sans mt-1.5">
            Welcome back, <span className="text-neutral-700 font-medium">{profile?.full_name}</span>
          </p>

          {/* Quick actions — inline, text-link style */}
          <div className="flex items-center gap-4 mt-5">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors font-sans group"
            >
              <Search className="w-3.5 h-3.5 group-hover:text-neutral-900" />
              Staff directory
            </Link>
            <span className="text-neutral-200">·</span>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors font-sans group"
            >
              <UserPlus className="w-3.5 h-3.5 group-hover:text-neutral-900" />
              Onboard employee
            </Link>
          </div>
        </div>

        {/* ── Metric callouts ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-200 rounded-xl overflow-hidden mb-10 border border-[#DDD5C0]">
          {[
            {
              label: 'Active Personnel',
              value: String(totalActiveWorkers),
              sub: 'employees on roster',
              icon: <Users className="w-3.5 h-3.5" />,
              accent: 'text-teal-600',
            },
            {
              label: 'Monthly Payroll',
              value: `₹${totalMonthlyPayroll.toLocaleString('en-IN')}`,
              sub: 'gross recurring liability',
              icon: <IndianRupee className="w-3.5 h-3.5" />,
              accent: 'text-emerald-600',
            },
            {
              label: 'Pending Leaves',
              value: String(pendingLeaves.length),
              sub: pendingLeaves.length > 0 ? 'awaiting approval' : 'all clear',
              icon: <Clock className="w-3.5 h-3.5" />,
              accent: pendingLeaves.length > 0 ? 'text-amber-600' : 'text-neutral-400',
              urgent: pendingLeaves.length > 0,
            },
            {
              label: 'Advance Requests',
              value: `₹${totalAdvanceClaims.toLocaleString('en-IN')}`,
              sub: `${pendingAdvances.length} pending claims`,
              icon: <Banknote className="w-3.5 h-3.5" />,
              accent: pendingAdvances.length > 0 ? 'text-rose-500' : 'text-neutral-400',
            },
          ].map((m) => (
            <div key={m.label} className="bg-[#FDF8F0] px-5 py-5 flex flex-col gap-2">
              <div className={`${m.accent} flex items-center gap-1.5 font-sans`}>
                {m.icon}
                <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{m.label}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-neutral-900 leading-none font-sans tabular-nums">
                  {m.value}
                </span>
                {m.urgent && (
                  <span className="text-[9px] font-sans font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mb-0.5">
                    Action needed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Two-column body ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT: Leave + Advances ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Leave Approvals */}
            <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl overflow-hidden">
              <SectionHeader
                icon={<Circle className="w-3 h-3 fill-amber-400 text-amber-400" />}
                title="Leave Queue"
                count={pendingLeaves.length}
              />
              <Divider />

              {pendingLeaves.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-neutral-400 font-sans">No pending leave requests</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8E0CC] max-h-64 overflow-y-auto">
                  {pendingLeaves.map((ticket) => (
                    <div key={ticket.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-[#F0EAD9] transition-colors">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Avatar name={ticket.employee_name} />
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-semibold text-neutral-900 font-sans leading-snug">{ticket.employee_name}</p>
                          <div className="flex items-center flex-wrap gap-1.5">
                            <Badge color="gray">{ticket.employee_code}</Badge>
                            <Badge color="teal">{ticket.leave_type}</Badge>
                          </div>
                          <p className="text-[11px] text-neutral-400 font-sans flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {ticket.start_date} – {ticket.end_date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <button
                          onClick={() => handleActionUpdate('leave_requests', ticket.id, 'Approved')}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleActionUpdate('leave_requests', ticket.id, 'Rejected')}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advance Salary */}
            <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl overflow-hidden">
              <SectionHeader
                icon={<Circle className="w-3 h-3 fill-rose-400 text-rose-400" />}
                title="Advance Salary"
                count={pendingAdvances.length}
              />
              <Divider />

              {pendingAdvances.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-neutral-400 font-sans">No pending advance requests</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8E0CC] max-h-64 overflow-y-auto">
                  {pendingAdvances.map((claim) => (
                    <div key={claim.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-[#F0EAD9] transition-colors">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Avatar name={claim.employee_name} />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-neutral-900 font-sans leading-snug">{claim.employee_name}</p>
                            <Badge color="gray">{claim.employee_code}</Badge>
                          </div>
                          {claim.reason && (
                            <p className="text-[11px] text-neutral-400 font-sans italic truncate max-w-xs">"{claim.reason}"</p>
                          )}
                          <p className="text-xs font-semibold text-rose-600 font-sans">
                            ₹{claim.requested_amount.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <button
                          onClick={() => handleActionUpdate('advance_salary_requests', claim.id, 'Approved')}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleActionUpdate('advance_salary_requests', claim.id, 'Rejected')}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EOD Logs */}
            <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl overflow-hidden">
              <SectionHeader
                icon={<ClipboardList className="w-3.5 h-3.5 text-neutral-400" />}
                title="Daily Output Logs"
                count={dailyLogs.length}
              />
              <Divider />

              {dailyLogs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-neutral-400 font-sans">No EOD logs submitted yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8E0CC] max-h-96 overflow-y-auto">
                  {dailyLogs.map((log) => (
                    <div key={log.id} className="px-4 py-3.5 hover:bg-[#F0EAD9] transition-colors space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={log.employee_name} />
                          <div>
                            <span className="text-sm font-semibold text-neutral-900 font-sans">{log.employee_name}</span>
                            <Badge color="gray">{log.employee_code}</Badge>
                          </div>
                        </div>
                        <span className="text-[10px] font-sans text-neutral-400 shrink-0 tabular-nums">
                          {new Date(log.submitted_at || log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      {log.task_priorities?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-9">
                          {log.task_priorities.map((task: string, i: number) => (
                            <Badge key={i} color="teal">{task}</Badge>
                          ))}
                        </div>
                      )}
                      {log.eod_submission && (
                        <p className="text-[12px] text-neutral-600 font-serif leading-relaxed pl-9 border-l-2 border-[#E8E0CC] ml-[34px]">
                          {log.eod_submission}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Roster + Geofence ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Roster */}
            <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl overflow-hidden">
              <SectionHeader
                icon={<Users className="w-3.5 h-3.5 text-neutral-400" />}
                title="Team Roster"
                href="/admin"
              />
              <Divider />

              {workforce.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-neutral-400 font-sans">No employees added yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8E0CC]">
                  {workforce.slice(0, 5).map((emp) => (
                    <div key={emp.id} className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-[#F0EAD9] transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={emp.full_name} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 font-sans truncate leading-snug">{emp.full_name}</p>
                          <p className="text-[11px] text-neutral-400 font-sans truncate">
                            {emp.designation || 'Staff'} · {emp.department || 'Operations'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-neutral-700 font-sans tabular-nums hidden sm:block">
                          ₹{Number(emp.monthly_salary || 0).toLocaleString('en-IN')}
                        </span>
                        <Link
                          href="/admin"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-[#EAE2CE] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                  {workforce.length > 5 && (
                    <div className="px-4 py-3">
                      <Link href="/admin" className="text-xs text-neutral-400 hover:text-neutral-700 font-sans transition-colors flex items-center gap-1">
                        +{workforce.length - 5} more employees <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Geofence */}
            <div className="bg-[#FDF8F0] border border-[#DDD5C0] rounded-xl overflow-hidden">
              <SectionHeader
                icon={<MapPin className="w-3.5 h-3.5 text-neutral-400" />}
                title="Compliance"
              />
              <Divider />
              <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 font-sans">Geofenced Check-ins</p>
                    <p className="text-[12px] text-neutral-500 font-sans mt-0.5 leading-relaxed">
                      Attendance is restricted to within{' '}
                      <span className="font-semibold text-neutral-700">
                        {company?.allowed_radius_meters || 100} meters
                      </span>{' '}
                      of your registered office location.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}