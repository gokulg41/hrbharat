"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MapPin,
  Loader2,
  Camera,
  RefreshCw,
  Activity,
  CheckCircle2,
  LogOut,
  LogIn,
  Circle,
} from 'lucide-react';

export default function EmployeeAttendancePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'neutral'; message: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [coordsString, setCoordsString] = useState<string | null>(null);
  const [activeCheckInRow, setActiveCheckInRow] = useState<any | null>(null);

  const fetchAttendanceHistory = async (empCode: string, compId: string) => {
    try {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('company_id', compId)
        .eq('employee_code', empCode)
        .order('created_at', { ascending: false });
      if (data) {
        setAttendanceLogs(data);
        const latestLog = data[0];
        setActiveCheckInRow(latestLog && !latestLog.punch_out_time ? latestLog : null);
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    }
  };

  useEffect(() => {
    async function loadIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase
        .from('employees').select('*').eq('email', user.email?.toLowerCase().trim()).single();
      if (emp) {
        setEmployee(emp);
        await fetchAttendanceHistory(emp.employee_code, emp.company_id);
      }
    }
    loadIdentity();
    startCameraFeed();
    return () => { stopCameraFeed(); };
  }, []);

  const startCameraFeed = async () => {
    setCapturedSelfie(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400, facingMode: "user" }, audio: false });
      if (videoRef.current) { videoRef.current.srcObject = stream; setStreamActive(true); }
    } catch (err) { setStreamActive(false); }
  };

  const stopCameraFeed = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  const captureSnapshotToken = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setCapturedSelfie(canvas.toDataURL('image/jpeg'));
      stopCameraFeed();
    }
  };

  const handleAttendanceCommit = () => {
    if (!employee) return;
    if (!capturedSelfie) { setStatus({ type: 'error', message: 'Please capture a photo first.' }); return; }
    setChecking(true);
    setStatus({ type: 'neutral', message: 'Fetching your location…' });
    if (!navigator.geolocation) {
      setStatus({ type: 'error', message: 'Geolocation not supported.' });
      setChecking(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const mappedCoords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setCoordsString(mappedCoords);
        const currentTimeString = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        try {
          if (activeCheckInRow) {
            const { error } = await supabase.from('attendance').update({ punch_out_time: currentTimeString, outbound_coords: mappedCoords, updated_at: new Date().toISOString() }).eq('id', activeCheckInRow.id);
            if (error) throw error;
            setStatus({ type: 'success', message: 'Punched out successfully.' });
          } else {
            const { error } = await supabase.from('attendance').insert({ company_id: employee.company_id, employee_code: employee.employee_code, employee_name: employee.full_name, punch_in_time: currentTimeString, status: 'present', location_coords: mappedCoords, selfie_url: capturedSelfie.slice(0, 50) + "...[token]" });
            if (error) throw error;
            setStatus({ type: 'success', message: 'Punched in successfully.' });
          }
          await fetchAttendanceHistory(employee.employee_code, employee.company_id);
          setCapturedSelfie(null);
          startCameraFeed();
        } catch (err: any) {
          setStatus({ type: 'error', message: err.message || 'Something went wrong.' });
        } finally { setChecking(false); }
      },
      (err) => { setStatus({ type: 'error', message: `Location access denied: ${err.message}` }); setChecking(false); },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#37352f]">

      {/* TOP BAR */}
      <header className="border-b border-[#e9e9e7] bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">HB</span>
            </div>
            <span className="text-[#c1c0bb]">/</span>
            <span className="font-medium text-[#37352f]">Attendance</span>
          </div>
          {activeCheckInRow && (
            <div className="flex items-center gap-1.5 text-xs text-[#d44c47]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d44c47] animate-pulse inline-block" />
              Shift active
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10 space-y-8">

        {/* PAGE TITLE */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="mt-1 text-sm text-[#9b9a97]">
            {employee ? `${employee.full_name} · ${employee.employee_code}` : 'Verify your attendance with a photo and location.'}
          </p>
        </div>

        {/* STATUS */}
        {status && (
          <div className={`text-sm px-4 py-2.5 rounded-md border ${
            status.type === 'success' ? 'bg-[#edfbf3] border-[#b7ebcf] text-[#0f7b43]'
            : status.type === 'error' ? 'bg-[#fdecea] border-[#f5c0bb] text-[#d44c47]'
            : 'bg-[#f7f6f3] border-[#e9e9e7] text-[#787774]'
          }`}>
            {status.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* ── CAMERA PANEL ── */}
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-semibold text-[#9b9a97] uppercase tracking-widest flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" />
              {activeCheckInRow ? 'Punch Out' : 'Punch In'}
            </p>

            {/* Viewport */}
            <div className="relative w-full aspect-square bg-[#111] rounded-lg overflow-hidden border border-[#e9e9e7]">
              {!capturedSelfie ? (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover -scale-x-100" />
                  {streamActive ? (
                    <button
                      onClick={captureSnapshotToken}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white hover:bg-[#f7f6f3] text-[#37352f] text-xs font-medium px-4 py-2 rounded-md border border-[#e9e9e7] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                    >
                      <Camera className="w-3.5 h-3.5" /> Capture Photo
                    </button>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-xs text-[#9b9a97]">Waiting for camera…</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <img src={capturedSelfie} alt="Captured" className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-[#edfbf3] border border-[#b7ebcf] text-[#0f7b43] text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Captured
                  </div>
                  <button
                    onClick={startCameraFeed}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#37352f]/80 hover:bg-[#37352f] text-white text-xs font-medium px-4 py-2 rounded-md flex items-center gap-1.5 backdrop-blur-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retake
                  </button>
                </>
              )}
            </div>

            {coordsString && (
              <p className="text-xs text-[#9b9a97] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {coordsString}
              </p>
            )}

            {/* Action button */}
            <button
              onClick={handleAttendanceCommit}
              disabled={checking || !employee || !capturedSelfie}
              className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeCheckInRow
                  ? 'bg-[#fdecea] text-[#d44c47] hover:bg-[#fad4d1] border border-[#f5c0bb]'
                  : 'bg-[#37352f] text-white hover:bg-[#2d2c28]'
              }`}
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" />
                : activeCheckInRow ? <LogOut className="w-4 h-4" />
                : <LogIn className="w-4 h-4" />}
              {checking ? 'Processing…' : activeCheckInRow ? 'Punch Out' : 'Punch In'}
            </button>
          </div>

          {/* ── SHIFT HISTORY ── */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-[#9b9a97] uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Shift History
              </p>
              <span className="text-xs text-[#c1c0bb]">{attendanceLogs.length} records</span>
            </div>

            {attendanceLogs.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[#e9e9e7] rounded-lg">
                <p className="text-sm text-[#c1c0bb]">No attendance records yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e9e9e7] max-h-[520px] overflow-y-auto">
                {attendanceLogs.map((log: any) => (
                  <div key={log.id} className="py-3.5 flex items-start justify-between gap-4 hover:bg-[#f7f6f3] px-2 -mx-2 rounded-md transition-colors group">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1.5 text-sm">
                          <LogIn className="w-3.5 h-3.5 text-[#0f7b43] shrink-0" />
                          {log.punch_in_time}
                        </span>
                        {log.punch_out_time ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <LogOut className="w-3.5 h-3.5 text-[#d44c47] shrink-0" />
                            {log.punch_out_time}
                          </span>
                        ) : (
                          <span className="text-xs text-[#d97706] bg-[#fef3c7] border border-[#fde68a] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Circle className="w-2 h-2 fill-current" /> Active
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {log.location_coords && (
                          <p className="text-xs text-[#9b9a97] font-mono flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" /> In: {log.location_coords}
                          </p>
                        )}
                        {log.outbound_coords && (
                          <p className="text-xs text-[#9b9a97] font-mono flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" /> Out: {log.outbound_coords}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${
                      log.punch_out_time
                        ? 'text-[#787774] bg-[#f7f6f3] border-[#e9e9e7]'
                        : 'text-[#0f7b43] bg-[#edfbf3] border-[#b7ebcf]'
                    }`}>
                      {log.punch_out_time ? 'Complete' : 'In progress'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}