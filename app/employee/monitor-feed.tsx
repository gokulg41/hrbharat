"use client";

import React from 'react';
import { Calendar, Banknote, FolderLock, History, FileEdit } from 'lucide-react';

interface MonitorFeedProps {
  myLeaves: any[];
  myAdvances: any[];
  myRegularizations: any[];
}

// Established admin-interface accent palette (see EmployeeMetricCard on Admin › Employees)
const ACCENTS = {
  violet: { icon: '#6D28D9', bg: '#F5F3FF', border: 'rgba(109,40,217,0.25)' },
  green: { icon: '#15803D', bg: '#F0FDF4', border: 'rgba(21,128,61,0.25)' },
  orange: { icon: '#C2410C', bg: '#FFF7ED', border: 'rgba(194,65,12,0.25)' },
};

function EmptyState({ accent, text }: { accent: keyof typeof ACCENTS; text: string }) {
  const c = ACCENTS[accent];
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-9 rounded-xl border border-dashed"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
    >
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#FFFFFFB3', color: c.icon }}
      >
        <FileEdit className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
      </span>
      <p className="text-sm text-ink-400 font-sans text-center">{text}</p>
    </div>
  );
}

export default function EmployeeMonitorFeed({
  myLeaves,
  myAdvances,
  myRegularizations,
}: MonitorFeedProps) {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-status-success-bg text-status-success font-sans">
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-status-danger-bg text-status-danger font-sans">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-status-warning-bg text-status-warning font-sans">
            In Review
          </span>
        );
    }
  };

  return (
    <div className="lg:col-span-5 bg-surface-card rounded-xl border border-border-subtle shadow-card overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-border-subtle flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0">
          <History className="w-4 h-4" />
        </span>
        <h3 className="text-sm font-semibold text-ink-900 font-sans uppercase tracking-wide">Recent Activity</h3>
      </div>

      <div className="p-5 md:p-6 space-y-7">

        {/* LEAVE REQUESTS */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wide font-sans flex items-center gap-1.5" style={{ color: ACCENTS.violet.icon }}>
            <Calendar className="w-3.5 h-3.5" /> Leave Requests
          </h4>
          {myLeaves.length === 0 ? (
            <EmptyState accent="violet" text="No leave requests yet." />
          ) : (
            <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
              {myLeaves.map((leave) => (
                <div key={leave.id} className="p-4 flex items-center justify-between bg-surface-card hover:bg-surface-card-hover transition-colors gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold text-ink-900 truncate">{leave.leave_type}</p>
                    <p className="text-[10px] text-ink-400 font-medium font-mono truncate">
                      {leave.start_date} — {leave.end_date}
                    </p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(leave.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ADVANCE SALARY REQUESTS */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wide font-sans flex items-center gap-1.5" style={{ color: ACCENTS.green.icon }}>
            <Banknote className="w-3.5 h-3.5" /> Advance Salary Requests
          </h4>
          {myAdvances.length === 0 ? (
            <EmptyState accent="green" text="No advance salary requests yet." />
          ) : (
            <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
              {myAdvances.map((adv) => (
                <div key={adv.id} className="p-4 flex items-center justify-between bg-surface-card hover:bg-surface-card-hover transition-colors gap-4">
                  <div className="space-y-1 min-w-0 max-w-[70%]">
                    <p className="text-xs font-semibold text-ink-900 font-mono">
                      ₹{Number(adv.requested_amount).toLocaleString('en-IN')}
                    </p>
                    {adv.reason && (
                      <p className="text-[10px] text-ink-400 font-medium italic truncate">"{adv.reason}"</p>
                    )}
                  </div>
                  <div className="shrink-0">{getStatusBadge(adv.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ATTENDANCE CORRECTIONS */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wide font-sans flex items-center gap-1.5" style={{ color: ACCENTS.orange.icon }}>
            <FolderLock className="w-3.5 h-3.5" /> Attendance Corrections
          </h4>
          {myRegularizations.length === 0 ? (
            <EmptyState accent="orange" text="No attendance corrections yet." />
          ) : (
            <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
              {myRegularizations.map((reg) => (
                <div key={reg.id} className="p-4 flex items-center justify-between bg-surface-card hover:bg-surface-card-hover transition-colors gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold text-ink-900">
                      <span className="text-ink-400 font-normal">Date:</span>{' '}
                      <span className="font-mono">{reg.target_date}</span>
                    </p>
                    <p className="text-[10px] text-ink-400 truncate max-w-[220px]">Reason: "{reg.justification}"</p>
                    <p className="text-[9px] text-ink-600 font-mono bg-surface-card-hover border border-border-subtle px-1.5 py-0.5 rounded w-fit mt-1">
                      {reg.requested_punch_in?.slice(0, 5)} — {reg.requested_punch_out?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(reg.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}