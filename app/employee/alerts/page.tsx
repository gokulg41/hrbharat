"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Clock, UserX, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

export default function OwnerAlertDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ late: [], absent: [], noShow: [], presentCount: 0 });
  const [todayDate, setTodayDate] = useState('');

  const fetchRealtimeOperationalLogs = async () => {
    setLoading(true);
    const todayStr = new Date().toISOString().split('T')[0];
    setTodayDate(todayStr);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) return;

    // 1. Fetch all active employees
    const { data: employees } = await supabase
      .from('employees')
      .select('id, full_name, department, shift_id, shifts(name, start_time)')
      .eq('company_id', profile.company_id)
      .eq('status', 'Active');

    // 2. Fetch today's real-time attendance logs
    const { data: attendanceToday } = await supabase
      .from('attendance')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('date', todayStr);

    const attendanceMap = new Map(attendanceToday?.map(log => [log.employee_id, log]));

    let lateList: any = [];
    let absentList: any = [];
    let noShowList: any = [];
    let presentCounter = 0;

    employees?.forEach(emp => {
      const log = attendanceMap.get(emp.id);

      if (!log) {
        // No record at all means they haven't checked in yet today
        noShowList.push(emp);
      } else if (log.status === 'Absent') {
        absentList.push({ ...emp, ...log });
      } else if (log.is_late) {
        lateList.push({ ...emp, ...log });
        presentCounter++;
      } else {
        presentCounter++;
      }
    });

    setSummary({ late: lateList, absent: absentList, noShow: noShowList, presentCount: presentCounter });
    setLoading(false);
  };

  useEffect(() => {
    fetchRealtimeOperationalLogs();
  }, []);

  if (loading) return <div className="p-6 text-xs text-slate-400 font-bold animate-pulse">COMPILING DAILY LIVE WORKFORCE TELEMETRY...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Morning Operations Control</h2>
          <p className="text-xs text-slate-500 font-medium">Real-time status breakdown for <span className="font-bold text-slate-800">{todayDate}</span></p>
        </div>
        <button onClick={fetchRealtimeOperationalLogs} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
          <RefreshCw className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* TOP SUMMARY COUNTER WIDGET DECK */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center space-x-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl"><Clock className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-black text-amber-900">{summary.late.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Late Arrivals</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3">
          <div className="p-2.5 bg-red-100 text-red-800 rounded-xl"><UserX className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-black text-red-900">{summary.absent.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Marked Absent</p>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-3">
          <div className="p-2.5 bg-slate-200 text-slate-700 rounded-xl"><AlertCircle className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-black text-slate-900">{summary.noShow.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Check-In</p>
          </div>
        </div>
      </div>

      {/* EXPANDED FEED PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LATE WORKERS FEED PANEL */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wide">🚨 Late Tracker Logs</h3>
          {summary.late.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium py-2">No late arrivals detected this morning. Great discipline!</p>
          ) : (
            <div className="space-y-2">
              {summary.late.map((emp: any) => (
                <div key={emp.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900">{emp.full_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{emp.department} • Shift: {emp.shifts?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-amber-800">+{emp.minutes_late} Mins</p>
                    <p className="text-[9px] text-slate-400 font-mono">In at {emp.punch_in_time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PENDING / NO CHECK-IN LIST PANEL */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wide">⚠️ Pending Shift Check-Ins</h3>
          {summary.noShow.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium py-2">100% attendance deployment complete.</p>
          ) : (
            <div className="space-y-2">
              {summary.noShow.map((emp: any) => (
                <div key={emp.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900">{emp.full_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{emp.department}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">Expected {emp.shifts?.start_time || "09:00"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}