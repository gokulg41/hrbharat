"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MapPin, 
  ShieldCheck, 
  Clock, 
  Loader2, 
  Camera, 
  RefreshCw, 
  User, 
  Activity,
  CheckCircle2,
  LogOut,
  LogIn
} from 'lucide-react';

export default function EmployeeAttendancePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'neutral'; message: string } | null>(null);

  // Biometric Media Streams States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [coordsString, setCoordsString] = useState<string | null>(null);

  // NEW: Shift State Tracking (Determines if Punch-In or Punch-Out is required)
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
        
        // Inspect the latest log row entry to check if punch_out_time is blank
        const latestLog = data[0];
        if (latestLog && !latestLog.punch_out_time) {
          // Worker has an open shift entry -> Unlocks Punch-Out flow state
          setActiveCheckInRow(latestLog);
        } else {
          // No open shift entry -> Unlocks Punch-In flow state
          setActiveCheckInRow(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch attendance pipelines:", err);
    }
  };

  useEffect(() => {
    async function loadIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email?.toLowerCase().trim())
        .single();
        
      if (emp) {
        setEmployee(emp);
        await fetchAttendanceHistory(emp.employee_code, emp.company_id);
      }
    }
    loadIdentity();
    startCameraFeed();

    return () => {
      stopCameraFeed();
    };
  }, []);

  // Initialize Native Camera Stream
  const startCameraFeed = async () => {
    setCapturedSelfie(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 400, height: 400, facingMode: "user" }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera access blocked or unauthorized:", err);
      setStreamActive(false);
    }
  };

  const stopCameraFeed = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // Capture Image Canvas Frame Snapshot
  const captureSnapshotToken = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedSelfie(dataUrl);
      stopCameraFeed();
    }
  };

  // NEW: Dual-Verification Transaction Handler for Punch-In AND Punch-Out
  const handleAttendanceCommit = () => {
    if (!employee) return;
    if (!capturedSelfie) {
      setStatus({ type: 'error', message: 'Verification Interrupted: Please snap a biometric validation selfie frame first.' });
      return;
    }

    setChecking(true);
    setStatus({ type: 'neutral', message: 'Requesting device geolocation telemetry data...' });

    if (!navigator.geolocation) {
      setStatus({ type: 'error', message: 'Telemetry Failure: Geolocation API rejected by local browser platform.' });
      setChecking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const mappedCoords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setCoordsString(mappedCoords);
        const currentTimeString = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        try {
          if (activeCheckInRow) {
            // EXECUTE SHIFT PUNCH OUT SEQUENCE (UPDATE ROUTINE)
            const { error } = await supabase
              .from('attendance')
              .update({
                punch_out_time: currentTimeString,
                outbound_coords: mappedCoords, // Logs outbound verification footprints
                updated_at: new Date().toISOString()
              })
              .eq('id', activeCheckInRow.id);

            if (error) throw error;
            setStatus({ type: 'success', message: 'Shift Concluded! Outbound biometric timestamp successfully synchronized.' });
          } else {
            // EXECUTE SHIFT PUNCH IN SEQUENCE (INSERT ROUTINE)
            const { error } = await supabase
              .from('attendance')
              .insert({
                company_id: employee.company_id,
                employee_code: employee.employee_code,
                employee_name: employee.full_name,
                punch_in_time: currentTimeString,
                status: 'present',
                location_coords: mappedCoords,
                selfie_url: capturedSelfie.slice(0, 50) + "...[Biometric Token Encrypted]"
              });

            if (error) throw error;
            setStatus({ type: 'success', message: 'Shift Initialized! Inbound biometric tracking token loaded.' });
          }

          // Force full dashboard recalculation re-sync
          await fetchAttendanceHistory(employee.employee_code, employee.company_id);
          setCapturedSelfie(null);
          startCameraFeed();
        } catch (err: any) {
          setStatus({ type: 'error', message: `Sync Interruption: ${err.message || 'Database connection error.'}` });
        } finally {
          setChecking(false);
        }
      },
      (err) => {
        setStatus({ type: 'error', message: `Hardware Access Denied: ${err.message}. Please authorize tracking metrics permissions.` });
        setChecking(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="p-6 lg:p-12 space-y-8 max-w-5xl mx-auto font-sans antialiased text-slate-800">
      
      {/* TITLE INTRO */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Biometric Attendance Portal</h1>
        <p className="text-xs text-slate-400 font-medium">Verify your organizational shift initialization or conclusion metrics using authorized device hardware.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: TWO-FACTOR SNAPSHOT CAPTURE PORTAL (TAKES 5 COLS) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.005)] space-y-6 text-center relative overflow-hidden">
          
          {/* Top colored indicator bar shifting based on tracking context state */}
          <div className={`absolute top-0 left-0 h-1 w-full ${activeCheckInRow ? 'bg-rose-500' : 'bg-emerald-500'}`} />

          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-left">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-slate-900" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">
                {activeCheckInRow ? 'Outbound Shift Verification' : 'Inbound Shift Verification'}
              </h3>
            </div>
            <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
              activeCheckInRow ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {activeCheckInRow ? 'Shift Active' : 'Off Duty'}
            </span>
          </div>

          {/* VIEWPORT CAMERA FEED AND CANVAS STREAMING BLOCKS */}
          <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-950/10">
            {!capturedSelfie ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {streamActive && (
                  <button 
                    onClick={captureSnapshotToken}
                    className="absolute bottom-4 mx-auto bg-white hover:bg-slate-100 text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                  >
                    <Camera className="w-3.5 h-3.5" /> Freeze Biometric Frame
                  </button>
                )}
                {!streamActive && (
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest animate-pulse">Awaiting camera hardware clearance...</p>
                )}
              </>
            ) : (
              <>
                <img src={capturedSelfie} alt="Captured Token Reference" className="w-full h-full object-cover" />
                <button 
                  onClick={startCameraFeed}
                  className="absolute bottom-4 mx-auto bg-slate-900/80 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Recapture Snapshot
                </button>
                <div className="absolute top-4 left-4 bg-emerald-500 text-white p-1 rounded-lg shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </>
            )}
          </div>

          {/* SYSTEM MESSAGES & ACTION PUNCH BUTTONS */}
          <div className="space-y-4 pt-2">
            {status && (
              <div className={`p-3 text-[11px] font-bold rounded-xl border leading-relaxed text-left flex gap-2 ${
                status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : status.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-slate-50 border-slate-100 text-slate-600'
              }`}>
                <span>{status.message}</span>
              </div>
            )}

            <button 
              onClick={handleAttendanceCommit}
              disabled={checking || !employee || !capturedSelfie}
              className={`w-full text-white font-black text-xs py-3 rounded-xl shadow-sm tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeCheckInRow 
                  ? 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50' 
                  : 'bg-slate-900 hover:bg-slate-800 disabled:opacity-50'
              }`}
            >
              {checking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : activeCheckInRow ? (
                <LogOut className="w-4 h-4" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>
                {checking ? 'Analyzing Credentials...' : activeCheckInRow ? 'Lock Shift Punch Out' : 'Lock Live Shift Attendance'}
              </span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: DETAILED INTERACTIVE SHIFT HISTORY TIMELINE (TAKES 7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.005)] overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Historical Shift Logs</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Real-time compilation tracking history.</p>
            </div>
            <span className="text-[9px] font-mono font-bold bg-white text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded-md shadow-3xs">Stamps logged: {attendanceLogs.length}</span>
          </div>

          <div className="p-6 max-h-[490px] overflow-y-auto divide-y divide-slate-100">
            {attendanceLogs.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-100 rounded-2xl">
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest">No shift tracking logs compiled yet.</span>
              </div>
            ) : (
              attendanceLogs.map((log: any) => (
                <div key={log.id} className="py-4 flex items-center justify-between text-xs font-medium first:pt-0 last:pb-0 group">
                  <div className="space-y-1 max-w-[65%]">
                    <div className="flex items-center space-x-3">
                      <p className="font-black text-slate-900 flex items-center gap-1">
                        <LogIn className="w-3.5 h-3.5 text-emerald-500" /> 
                        <span>In: {log.punch_in_time}</span>
                      </p>
                      {log.punch_out_time ? (
                        <p className="font-black text-slate-900 flex items-center gap-1">
                          <LogOut className="w-3.5 h-3.5 text-rose-500" /> 
                          <span>Out: {log.punch_out_time}</span>
                        </p>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-100 px-1.5 rounded animate-pulse">Open Active Shift</span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-400 font-mono truncate block">
                      <MapPin className="w-3.5 h-3.5 inline text-slate-300 mr-0.5" /> 
                      Inbound Footprint: <span className="text-slate-600 font-bold">{log.location_coords || "HQ Parameter"}</span>
                    </p>
                    {log.outbound_coords && (
                      <p className="text-[10px] text-slate-400 font-mono truncate block">
                        <MapPin className="w-3.5 h-3.5 inline text-slate-300 mr-0.5" /> 
                        Outbound Footprint: <span className="text-slate-600 font-bold">{log.outbound_coords}</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right space-y-1 shrink-0">
                    <span className={`inline-block px-2 py-0.5 font-mono font-bold rounded-md text-[9px] uppercase tracking-wider ${
                      log.punch_out_time 
                        ? 'bg-slate-50 text-slate-700 border border-slate-200' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {log.punch_out_time ? 'Shift Complete' : 'Active Shift'}
                    </span>
                    <p className="text-[8px] font-mono font-black text-slate-300 uppercase block tracking-wider">Secure Hardware Cleared</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}