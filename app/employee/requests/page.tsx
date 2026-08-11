"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  fetchMyRequests,
  cancelRequest,
  NormalizedRequest,
  RequestKind,
  RequestStatus,
} from '@/lib/employee-requests';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronDown,
  Eye,
  X,
  Calendar,
  IndianRupee,
  Bell,
  LogOut,
  RefreshCw,
  MoreVertical,
  Loader2,
  Palmtree,
  Wallet,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Shared design tokens (matches existing employee pages)
   ───────────────────────────────────────────── */
const cardClass = 'bg-surface-card border border-border-subtle rounded-xl p-5 md:p-6 shadow-card';

const TAB_DEFS: { key: 'all' | RequestKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'leave', label: 'Leave Requests' },
  { key: 'advance', label: 'Advance Requests' },
  { key: 'attendance_correction', label: 'Attendance Corrections' },
];

const STATUS_OPTIONS: ('All' | RequestStatus)[] = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'];

const PAGE_SIZE = 10;

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const styles: Record<RequestStatus, string> = {
    Pending: 'bg-status-warning-bg text-status-warning',
    Approved: 'bg-status-success-bg text-status-success',
    Rejected: 'bg-status-danger-bg text-status-danger',
    Cancelled: 'bg-slate-100 text-slate-500',
  };
  const Icon = status === 'Pending' ? Clock : status === 'Approved' ? CheckCircle2 : status === 'Rejected' ? XCircle : X;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${styles[status]}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function TypeIcon({ kind }: { kind: RequestKind }) {
  if (kind === 'leave') {
    return (
      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
        <Palmtree className="w-4 h-4" />
      </span>
    );
  }
  if (kind === 'advance') {
    return (
      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F5F3FF', color: '#6D28D9' }}>
        <Wallet className="w-4 h-4" />
      </span>
    );
  }
  return (
    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
      <Clock className="w-4 h-4" />
    </span>
  );
}

function DetailIcon({ kind }: { kind: RequestKind }) {
  if (kind === 'advance') return <IndianRupee className="w-3.5 h-3.5 text-ink-400 shrink-0" />;
  if (kind === 'attendance_correction') return <Clock className="w-3.5 h-3.5 text-ink-400 shrink-0" />;
  return <Calendar className="w-3.5 h-3.5 text-ink-400 shrink-0" />;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function MyRequestsPage() {
  const router = useRouter();

  const [employee, setEmployee] = useState<any>(null);
  const [requests, setRequests] = useState<NormalizedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | RequestKind>('all');
  const [statusFilter, setStatusFilter] = useState<'All' | RequestStatus>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [selected, setSelected] = useState<NormalizedRequest | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadRequests = useCallback(async (emp: { id: string; employee_code: string; company_id: string }) => {
    setError(null);
    try {
      const data = await fetchMyRequests({ id: emp.id, employee_code: emp.employee_code, company_id: emp.company_id });
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while loading your requests.');
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: emp } = await supabase.from('employees').select('*').eq('email', user.email?.toLowerCase().trim()).single();
    if (!emp) {
      setLoading(false);
      return;
    }
    setEmployee(emp);
    await loadRequests(emp);
    setLoading(false);
  }, [router, loadRequests]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, dateFrom, dateTo]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const summary = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'Pending').length;
    const approved = requests.filter((r) => r.status === 'Approved').length;
    const rejected = requests.filter((r) => r.status === 'Rejected').length;
    return { total, pending, approved, rejected };
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab !== 'all' && r.kind !== activeTab) return false;
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (dateFrom && r.filterDate < dateFrom) return false;
      if (dateTo && r.filterDate > dateTo) return false;
      return true;
    });
  }, [requests, activeTab, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCancel = async (req: NormalizedRequest) => {
    setCancelError(null);
    setCancellingId(req.id);
    try {
      await cancelRequest(req.kind, req.id);
      if (employee) await loadRequests(employee);
      setSelected(null);
      setActionMenuId(null);
    } catch (err: any) {
      setCancelError(err.message || 'Could not cancel this request. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const newRequestLinks: { label: string; href: string }[] = [
    { label: 'Leave Request', href: '/employee#leave-request' },
    { label: 'Advance Salary Request', href: '/employee#advance-request' },
    { label: 'Attendance Correction', href: '/employee#attendance-correction' },
  ];

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-canvas font-sans">
        <div className="h-14 border-b border-border-subtle bg-surface-card px-6 flex items-center">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="px-6 lg:px-8 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-card border border-border-subtle rounded-2xl p-5 space-y-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-surface-canvas font-sans flex items-center justify-center px-6">
        <p className="text-sm text-ink-600">No employee profile found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-canvas font-sans text-ink-900" onClick={() => { setNewRequestOpen(false); setActionMenuId(null); }}>
      {/* TOP HEADER */}
      <header className="border-b border-border-subtle sticky top-0 z-30 bg-surface-canvas/95 backdrop-blur">
        <div className="px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center shrink-0">
              <span className="text-white text-[9px] font-bold">HR</span>
            </div>
            <span className="text-ink-400">/</span>
            <span className="font-semibold text-ink-900">My Requests</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 transition-colors cursor-pointer">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 lg:px-8 py-6 space-y-6 max-w-[1400px] mx-auto">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-ink-900">My Requests</h1>
            <p className="mt-1 text-sm text-ink-600">Track all your requests and their status in one place.</p>
          </div>

          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setNewRequestOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Request
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${newRequestOpen ? 'rotate-180' : ''}`} />
            </button>
            {newRequestOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-card border border-border-subtle rounded-xl shadow-xl overflow-hidden z-40">
                {newRequestLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setNewRequestOpen(false)}
                    className="block px-4 py-2.5 text-sm text-ink-900 hover:bg-surface-card-hover transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className={`${cardClass} flex flex-col items-center justify-center text-center py-12`}>
            <div className="w-11 h-11 rounded-full bg-status-danger-bg text-status-danger flex items-center justify-center mb-3">
              <XCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-ink-900">Unable to load requests</p>
            <p className="text-xs text-ink-600 mt-1">Please try again.</p>
            <button
              onClick={() => employee && loadRequests(employee)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {!error && (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`${cardClass} flex items-start gap-3.5`}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                  <FileText className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-ink-400 font-medium">All Requests</p>
                  <p className="text-2xl font-bold text-ink-900 leading-snug">{summary.total}</p>
                  <p className="text-xs text-ink-600">Total requests</p>
                </div>
              </div>
              <div className={`${cardClass} flex items-start gap-3.5`}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFFBEB', color: '#B45309' }}>
                  <Clock className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-ink-400 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-ink-900 leading-snug">{summary.pending}</p>
                  <p className="text-xs text-ink-600">Awaiting approval</p>
                </div>
              </div>
              <div className={`${cardClass} flex items-start gap-3.5`}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-ink-400 font-medium">Approved</p>
                  <p className="text-2xl font-bold text-ink-900 leading-snug">{summary.approved}</p>
                  <p className="text-xs text-ink-600">Requests approved</p>
                </div>
              </div>
              <div className={`${cardClass} flex items-start gap-3.5`}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
                  <XCircle className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-ink-400 font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-ink-900 leading-snug">{summary.rejected}</p>
                  <p className="text-xs text-ink-600">Requests rejected</p>
                </div>
              </div>
            </div>

            {/* TABLE CARD */}
            <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-card overflow-hidden">
              {/* TABS + FILTERS */}
              <div className="px-5 pt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-border-subtle">
                <div className="flex items-center gap-5 overflow-x-auto">
                  {TAB_DEFS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative pb-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        activeTab === tab.key ? 'text-brand' : 'text-ink-600 hover:text-ink-900'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.key && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand rounded-full" />}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pb-3 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'All' | RequestStatus)}
                    className="text-xs font-medium px-3 py-2 border border-border-subtle rounded-lg bg-surface-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s === 'All' ? 'All Status' : s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs font-medium px-3 py-2 border border-border-subtle rounded-lg bg-surface-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <span className="text-xs text-ink-400">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-xs font-medium px-3 py-2 border border-border-subtle rounded-lg bg-surface-card text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              {/* EMPTY STATE */}
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                  <div className="w-12 h-12 rounded-full bg-surface-card-hover text-ink-400 flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-ink-900">No requests yet</p>
                  <p className="text-xs text-ink-600 mt-1">You haven&apos;t submitted any requests.</p>
                  <div className="relative mt-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setNewRequestOpen((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create your first request
                    </button>
                    {newRequestOpen && (
                      <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-surface-card border border-border-subtle rounded-xl shadow-xl overflow-hidden z-40 text-left">
                        {newRequestLinks.map((l) => (
                          <Link key={l.href} href={l.href} className="block px-4 py-2.5 text-sm text-ink-900 hover:bg-surface-card-hover transition-colors">
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                  <p className="text-sm font-semibold text-ink-900">No requests match these filters</p>
                  <p className="text-xs text-ink-600 mt-1">Try adjusting the tab, status or date range.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[820px]">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-ink-400 border-b border-border-subtle">
                          <th className="font-semibold py-3 px-5">Request Type</th>
                          <th className="font-semibold py-3 px-3">Details</th>
                          <th className="font-semibold py-3 px-3">Status</th>
                          <th className="font-semibold py-3 px-3">Requested On</th>
                          <th className="font-semibold py-3 px-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {pageRows.map((req) => {
                          const rq = formatDateTime(req.requestedAt);
                          return (
                            <tr key={`${req.kind}-${req.id}`} className="hover:bg-surface-card-hover transition-colors">
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-2.5">
                                  <TypeIcon kind={req.kind} />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-ink-900 whitespace-nowrap">{req.title}</p>
                                    <p className="text-xs text-ink-400">{req.subtitle}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 max-w-xs">
                                <div className="flex items-start gap-1.5 text-ink-900">
                                  <DetailIcon kind={req.kind} />
                                  <div className="min-w-0">
                                    <p className="font-medium whitespace-nowrap">{req.detailPrimary}</p>
                                    {req.detailSecondary && <p className="text-xs text-ink-600">{req.detailSecondary}</p>}
                                    <p className="text-xs text-ink-400 truncate" title={req.reason}>Reason: {req.reason}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-3">
                                <StatusBadge status={req.status} />
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <p className="text-ink-900">{rq.date}</p>
                                <p className="text-xs text-ink-400">{rq.time}</p>
                              </td>
                              <td className="py-3.5 px-5">
                                <div className="flex items-center justify-end gap-1 relative" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setSelected(req)}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-hover border border-border-subtle px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </button>
                                  {req.status === 'Pending' && (
                                    <>
                                      <button
                                        onClick={() => setActionMenuId(actionMenuId === req.id ? null : req.id)}
                                        className="w-7 h-7 rounded-md border border-border-subtle flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </button>
                                      {actionMenuId === req.id && (
                                        <div className="absolute right-0 top-9 w-40 bg-surface-card border border-border-subtle rounded-lg shadow-xl overflow-hidden z-40">
                                          <button
                                            onClick={() => handleCancel(req)}
                                            disabled={cancellingId === req.id}
                                            className="w-full text-left px-3 py-2 text-xs font-medium text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer disabled:opacity-50"
                                          >
                                            {cancellingId === req.id ? 'Cancelling…' : 'Cancel Request'}
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION */}
                  <div className="flex items-center justify-between px-5 py-4 border-t border-border-subtle">
                    <p className="text-xs text-ink-600">
                      Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} requests
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-border-subtle text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .slice(Math.max(0, currentPage - 2), Math.max(0, currentPage - 2) + 3)
                        .map((p) => (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                              p === currentPage ? 'bg-brand text-white' : 'text-ink-600 hover:bg-surface-card-hover border border-border-subtle'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      <button
                        onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-border-subtle text-ink-600 hover:bg-surface-card-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* DETAIL MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div className="bg-surface-card border border-border-subtle rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <TypeIcon kind={selected.kind} />
                <div>
                  <p className="text-sm font-bold text-ink-900">{selected.title}</p>
                  <p className="text-xs text-ink-400">{selected.subtitle}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-ink-400 hover:text-ink-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-400 text-xs">Request ID</span>
                <span className="font-mono text-xs text-ink-600">{selected.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-400 text-xs">Status</span>
                <StatusBadge status={selected.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-400 text-xs">Submitted</span>
                <span className="text-ink-900 text-xs">{formatDateTime(selected.requestedAt).date} · {formatDateTime(selected.requestedAt).time}</span>
              </div>
              <div className="pt-2 border-t border-border-subtle">
                <p className="text-xs text-ink-400 mb-1">{selected.kind === 'advance' ? 'Amount' : 'Dates / Period'}</p>
                <p className="text-ink-900 font-medium">{selected.detailPrimary}</p>
                {selected.detailSecondary && <p className="text-xs text-ink-600">{selected.detailSecondary}</p>}
              </div>
              <div>
                <p className="text-xs text-ink-400 mb-1">Reason</p>
                <p className="text-ink-900">{selected.reason}</p>
              </div>
              <div className="pt-2 border-t border-border-subtle">
                <p className="text-xs text-ink-400 mb-1">Admin comments</p>
                <p className="text-xs text-ink-600">No comments from admin yet.</p>
              </div>
            </div>

            {cancelError && <p className="text-xs text-status-danger">{cancelError}</p>}

            {selected.status === 'Pending' && (
              <button
                onClick={() => handleCancel(selected)}
                disabled={cancellingId === selected.id}
                className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-status-danger bg-status-danger-bg hover:bg-red-100 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancellingId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {cancellingId === selected.id ? 'Cancelling…' : 'Cancel Request'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
