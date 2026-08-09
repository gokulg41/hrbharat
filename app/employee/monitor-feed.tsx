"use client";

import React from 'react';
import { Calendar, Banknote, FolderLock, ShieldCheck, History } from 'lucide-react';

interface MonitorFeedProps {
  myLeaves: any[];
  myAdvances: any[];
  myRegularizations: any[];
}

export default function EmployeeMonitorFeed({
  myLeaves,
  myAdvances,
  myRegularizations
}: MonitorFeedProps) {

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-status-warning-bg text-status-warning font-sans animate-pulse">
            In Review
          </span>
        );
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
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-status-warning-bg text-status-warning font-sans animate-pulse">
            In Review
          </span>
        );
    }
  };

  return (
    <div className="lg:col-span-7 bg-surface-card rounded-2xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
      <div className="bg-surface-card-hover px-6 py-4 border-b border-border-subtle font-sans font-bold text-xs uppercase tracking-wider text-ink-900 flex items-center gap-2">
        <History className="w-4 h-4 text-ink-400" />
        <span>Recent Activity</span>
      </div>
      
      <div className="p-6 space-y-8">
        
        {/* 1. LEAVE QUEUE MONITOR */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase text-ink-400 tracking-wider flex items-center gap-1.5 font-sans">
            <Calendar className="w-3.5 h-3.5" /> <span>Leave Requests</span>
          </h4>
          {myLeaves.length === 0 ? (
            <p className="text-xs font-medium text-ink-400 italic py-8 border border-dashed border-border-subtle rounded-xl text-center bg-surface-card-hover/40">
              No leave requests yet.
            </p>
          ) : (
            <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-surface-card-hover">
              {myLeaves.map((leave) => (
                <div key={leave.id} className="p-4 flex items-center justify-between bg-surface-card hover:bg-surface-card-hover/30 transition-all gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-ink-900">{leave.leave_type}</p>
                    <p className="text-[10px] text-ink-400 font-medium font-mono">
                      Duration: {leave.start_date} — {leave.end_date}
                    </p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(leave.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. ADVANCES QUEUE MONITOR */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase text-ink-400 tracking-wider flex items-center gap-1.5 font-sans">
            <Banknote className="w-3.5 h-3.5" /> <span>Advance Salary Requests</span>
          </h4>
          {myAdvances.length === 0 ? (
            <p className="text-xs font-medium text-ink-400 italic py-8 border border-dashed border-border-subtle rounded-xl text-center bg-surface-card-hover/40">
              No advance salary requests yet.
            </p>
          ) : (
            <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-surface-card-hover">
              {myAdvances.map((adv) => (
                <div key={adv.id} className="p-4 flex items-center justify-between bg-surface-card hover:bg-surface-card-hover/30 transition-all gap-4">
                  <div className="space-y-1 max-w-[70%]">
                    <p className="text-xs font-bold text-ink-900 font-mono">
                      ₹{Number(adv.requested_amount).toLocaleString('en-IN')}
                    </p>
                    {adv.reason && (
                      <p className="text-[10px] text-ink-400 font-medium italic truncate leading-normal">
                        "{adv.reason}"
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">{getStatusBadge(adv.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. REGULARIZATIONS QUEUE MONITOR */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase text-ink-400 tracking-wider flex items-center gap-1.5 font-sans">
            <FolderLock className="w-3.5 h-3.5" /> <span>Attendance Corrections</span>
          </h4>
          {myRegularizations.length === 0 ? (
            <p className="text-xs font-bold text-ink-400 italic py-8 border border-dashed border-border-subtle rounded-xl text-center bg-surface-card-hover/40">
              No attendance corrections yet.
            </p>
          ) : (
            <div className="divide-y divide-border-subtle border border-border-subtle rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-surface-card-hover">
              {myRegularizations.map((reg) => (
                <div key={reg.id} className="p-4 flex items-center justify-between bg-surface-card hover:bg-surface-card-hover/30 transition-all gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-ink-900">
                      Target Date: <span className="font-mono text-ink-600 font-medium">{reg.target_date}</span>
                    </p>
                    <p className="text-[10px] text-ink-400 font-medium font-sans truncate max-w-sm">
                      Reason: "{reg.justification}"
                    </p>
                    <p className="text-[9px] text-ink-600 font-mono bg-surface-card-hover border border-border-subtle px-1.5 py-0.2 rounded w-fit mt-1">
                      Requested Times: {reg.requested_punch_in.slice(0,5)} — {reg.requested_punch_out.slice(0,5)}
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