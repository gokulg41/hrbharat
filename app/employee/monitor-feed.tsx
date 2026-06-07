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

  // Premium Muted Fintech Status Badges Matrix
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-amber-50/80 text-amber-800 border border-amber-200/40 font-sans animate-pulse">
            In Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-sans">
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-rose-50 text-rose-800 border border-rose-200/60 font-sans">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-amber-50/80 text-amber-800 border border-amber-200/40 font-sans animate-pulse">
            In Review
          </span>
        );
    }
  };

  return (
    <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EEEEEE] shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
      <div className="bg-[#FCFCFC] px-6 py-4 border-b border-[#EEEEEE] font-sans font-bold text-xs uppercase tracking-wider text-[#111111] flex items-center gap-2">
        <History className="w-4 h-4 text-neutral-400" />
        <span>Operational Dispatch Monitor Feed</span>
      </div>
      
      <div className="p-6 space-y-8">
        
        {/* 1. LEAVE QUEUE MONITOR */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider flex items-center gap-1.5 font-sans">
            <Calendar className="w-3.5 h-3.5" /> <span>Leave Applications Ledger</span>
          </h4>
          {myLeaves.length === 0 ? (
            <p className="text-xs font-medium text-neutral-400 italic py-8 border border-dashed border-neutral-200 rounded-xl text-center bg-[#FAF9F6]/40">
              No historic leave entries recorded under this asset signature.
            </p>
          ) : (
            <div className="divide-y divide-[#EEEEEE] border border-[#EEEEEE] rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-[#FCFCFC]">
              {myLeaves.map((leave) => (
                <div key={leave.id} className="p-4 flex items-center justify-between bg-white hover:bg-[#FAF9F6]/30 transition-all gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#111111]">{leave.leave_type}</p>
                    <p className="text-[10px] text-neutral-400 font-medium font-mono">
                      Calendar Duration: {leave.start_date} — {leave.end_date}
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
          <h4 className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider flex items-center gap-1.5 font-sans">
            <Banknote className="w-3.5 h-3.5" /> <span>Capital Advance Claims</span>
          </h4>
          {myAdvances.length === 0 ? (
            <p className="text-xs font-medium text-neutral-400 italic py-8 border border-dashed border-neutral-200 rounded-xl text-center bg-[#FAF9F6]/40">
              No advance salary adjustments logged across this terminal token.
            </p>
          ) : (
            <div className="divide-y divide-[#EEEEEE] border border-[#EEEEEE] rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-[#FCFCFC]">
              {myAdvances.map((adv) => (
                <div key={adv.id} className="p-4 flex items-center justify-between bg-white hover:bg-[#FAF9F6]/30 transition-all gap-4">
                  <div className="space-y-1 max-w-[70%]">
                    <p className="text-xs font-bold text-[#111111] font-mono">
                      ₹{Number(adv.requested_amount).toLocaleString('en-IN')}
                    </p>
                    {adv.reason && (
                      <p className="text-[10px] text-neutral-400 font-medium italic truncate leading-normal">
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
          <h4 className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider flex items-center gap-1.5 font-sans">
            <FolderLock className="w-3.5 h-3.5" /> <span>Attendance Adjustments History</span>
          </h4>
          {myRegularizations.length === 0 ? (
            <p className="text-xs font-bold text-neutral-400 italic py-8 border border-dashed border-neutral-200 rounded-xl text-center bg-[#FAF9F6]/40">
              Zero attendance regularization footprints filed across this node session.
            </p>
          ) : (
            <div className="divide-y divide-[#EEEEEE] border border-[#EEEEEE] rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-[#FCFCFC]">
              {myRegularizations.map((reg) => (
                <div key={reg.id} className="p-4 flex items-center justify-between bg-white hover:bg-[#FAF9F6]/30 transition-all gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#111111]">
                      Target Date: <span className="font-mono text-neutral-600 font-medium">{reg.target_date}</span>
                    </p>
                    <p className="text-[10px] text-neutral-400 font-medium font-sans truncate max-w-sm">
                      Justification: "{reg.justification}"
                    </p>
                    <p className="text-[9px] text-neutral-500 font-mono bg-neutral-100 border border-neutral-200/50 px-1.5 py-0.2 rounded w-fit mt-1">
                      Correction Stamp: {reg.requested_punch_in.slice(0,5)} — {reg.requested_punch_out.slice(0,5)}
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