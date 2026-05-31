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
  Eye
} from 'lucide-react';

export default function AdminClientDashboard() {
  const router = useRouter();
  
  // App States Matrices
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [workforce, setWorkforce] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingAdvances, setPendingAdvances] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [disconnectNode, setDisconnectNode] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      // 1. Authenticate check directly on the client side
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. Fetch admin profile parameters
      const { data: prof } = await supabase
        .from('profiles')
        .select('company_id, full_name, role')
        .eq('id', user.id)
        .single();

      if (!prof || prof.role !== 'admin') {
        router.push('/login');
        return;
      }

      setProfile(prof);

      // 3. Fallback isolation check for corporate connection
      if (!prof.company_id) {
        setDisconnectNode(true);
        setLoading(false);
        return;
      }

      // 4. Fire data arrays query stream in parallel over client socket
      const [companyRes, employeesRes, leavesRes, advancesRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', prof.company_id).single(),
        supabase.from('employees').select('*').eq('company_id', prof.company_id),
        supabase.from('leave_requests').select('*').eq('company_id', prof.company_id).eq('status', 'pending'),
        supabase.from('advance_salary_requests').select('*').eq('company_id', prof.company_id).eq('status', 'pending')
      ]);

      if (companyRes.data) setCompany(companyRes.data);
      if (employeesRes.data) setWorkforce(employeesRes.data);
      if (leavesRes.data) setPendingLeaves(leavesRes.data);
      if (advancesRes.data) setPendingAdvances(advancesRes.data);
      
      setLoading(false);
    }

    loadDashboardData();
  }, [router]);

  // Action handlers for live approval workflows
  const handleActionUpdate = async (table: 'leave_requests' | 'advance_salary_requests', id: string, status: 'approved' | 'rejected') => {
    if (!profile?.company_id) return;
    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (!error) {
      if (table === 'leave_requests') {
        setPendingLeaves(prev => prev.filter(item => item.id !== id));
      } else {
        setPendingAdvances(prev => prev.filter(item => item.id !== id));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Executive Control Center...</p>
      </div>
    );
  }

  if (disconnectNode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-md text-center shadow-sm">
          <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Corporate Node Disconnected</h2>
          <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">
            Your profile successfully authenticated but is missing an assigned Company ID. Please complete your business registration node configuration.
          </p>
        </div>
      </div>
    );
  }

  // Live dynamic metric calculations
  const totalActiveWorkers = workforce.length;
  const totalMonthlyPayroll = workforce.reduce((sum, emp) => sum + (Number(emp.monthly_salary) || 0), 0);
  const totalAdvanceClaims = pendingAdvances.reduce((sum, req) => sum + req.requested_amount, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-10 font-sans antialiased text-slate-800">
      
      {/* EXECUTIVE META HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-700 uppercase tracking-wider mb-1">
            <Building className="w-3.5 h-3.5" />
            <span>{company?.name || 'Corporate Node Cluster'}</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Operational Overview</h1>
          <p className="text-xs font-medium text-slate-400">Welcome back, {profile?.full_name} • System Core Monitor</p>
        </div>

        {/* FAST-ACTION BUTTON PANEL */}
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin" className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold py-2.5 px-4 rounded-xl shadow-2xs border border-slate-200/80 transition-all cursor-pointer">
            <Search className="w-4 h-4 text-slate-500" />
            <span>Staff Lookup Directory</span>
          </Link>
          <Link href="/admin" className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer">
            <UserPlus className="w-4 h-4" />
            <span>Onboard New Worker</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* METRICS METERS PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 border border-slate-200/60 rounded-3xl shadow-3xs relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Active Personnel</span>
              <div className="p-2 bg-teal-50 border border-teal-100 rounded-xl text-teal-700"><Users className="w-4 h-4" /></div>
            </div>
            <div className="text-4xl font-black text-slate-900 tracking-tight">{totalActiveWorkers}</div>
            <p className="text-[11px] text-slate-400 font-medium mt-2">Active records inside workforce array.</p>
          </div>

          <div className="bg-white p-6 border border-slate-200/60 rounded-3xl shadow-3xs relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Monthly Payroll</span>
              <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700"><IndianRupee className="w-4 h-4" /></div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">₹{totalMonthlyPayroll.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-400 font-medium mt-3">Gross recurring infrastructure liability.</p>
          </div>

          <div className="bg-white p-6 border border-slate-200/60 rounded-3xl shadow-3xs relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Pending Leaves</span>
              <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700"><Clock className="w-4 h-4" /></div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-slate-900 tracking-tight">{pendingLeaves.length}</span>
              {pendingLeaves.length > 0 && (
                <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md animate-pulse">Action Required</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-2">Time-off tokens awaiting executive signature.</p>
          </div>

          <div className="bg-white p-6 border border-slate-200/60 rounded-3xl shadow-3xs relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Advance Requests</span>
              <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700"><Banknote className="w-4 h-4" /></div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">₹{totalAdvanceClaims.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-400 font-medium mt-3">Aggregated short-term asset credit claims.</p>
          </div>
        </div>

        {/* WORKFORCE AUDITING LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-3xl shadow-3xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-md font-black text-slate-900 tracking-tight">Roster Matrix Audit</h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">Quick lookup of core active asset profiles.</p>
                </div>
                <Link href="/admin" className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center space-x-0.5 group">
                  <span>Open Staff Check Page</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>

              {workforce.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Roster Array Empty</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[290px] overflow-y-auto pr-1">
                  {workforce.slice(0, 4).map((emp) => (
                    <div key={emp.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-900">{emp.full_name}</span>
                          <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">{emp.employee_code}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {emp.designation || 'Staff Member'} • <span className="text-slate-500">{emp.department || 'Operations'}</span>
                        </p>
                      </div>
                      <div className="text-right flex items-center space-x-4">
                        <div>
                          <p className="text-xs font-bold text-slate-900">₹{Number(emp.monthly_salary || 0).toLocaleString('en-IN')}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{emp.phone_number || 'No Contact Data'}</p>
                        </div>
                        <Link href="/admin" className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-all"><Eye className="w-3.5 h-3.5" /></Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-3xl shadow-3xs p-6 space-y-5">
            <div>
              <h3 className="text-md font-black text-slate-900 tracking-tight">Active Terminal Controls</h3>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">Geofence compliance criteria rule bounds.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="p-2 bg-teal-50 border border-teal-100 rounded-xl text-teal-700 mt-0.5"><MapPin className="w-3.5 h-3.5" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Secure Geofenced Gateways</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">
                    Terminal authorization limited strictly to corporate parameters of **{company?.allowed_radius_meters || 100} meters**.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WORKFLOW TRACKERS GATEWAY PIPELINES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LEAVE APPROVAL PIPELINE */}
          <div className="bg-white border border-slate-200/60 rounded-3xl shadow-3xs p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Leave Approval Queue ({pendingLeaves.length})</span>
            </h3>

            {pendingLeaves.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                All time-off clear • Zero pending filings
              </div>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {pendingLeaves.map((ticket) => (
                  <div key={ticket.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-900">{ticket.employee_name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Code: <span className="font-mono font-bold">{ticket.employee_code}</span> • Type: <span className="text-teal-700 font-bold">{ticket.leave_type}</span>
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium flex items-center"><Calendar className="w-2.5 h-2.5 mr-1" /> {ticket.start_date} to {ticket.end_date}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button onClick={() => handleActionUpdate('leave_requests', ticket.id, 'approved')} className="p-1.5 bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-2xs cursor-pointer"><CheckCircle2 className="w-4 h-4" /></button>
                      <button onClick={() => handleActionUpdate('leave_requests', ticket.id, 'rejected')} className="p-1.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-2xs cursor-pointer"><XCircle className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ADVANCE PAYROLL PIPELINE */}
          <div className="bg-white border border-slate-200/60 rounded-3xl shadow-3xs p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Advance Salary Ledgers ({pendingAdvances.length})</span>
            </h3>

            {pendingAdvances.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Disbursement balances clean • Zero pending requests
              </div>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {pendingAdvances.map((claim) => (
                  <div key={claim.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-black text-slate-900">{claim.employee_name}</p>
                        <span className="text-[9px] font-mono font-bold bg-slate-200/80 text-slate-700 px-1 py-0.2 rounded">{claim.employee_code}</span>
                      </div>
                      {claim.reason && <p className="text-[10px] text-slate-400 italic font-medium leading-tight max-w-xs truncate">"{claim.reason}"</p>}
                      <p className="text-[11px] text-rose-700 font-bold mt-1">Claim: ₹{claim.requested_amount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button onClick={() => handleActionUpdate('advance_salary_requests', claim.id, 'approved')} className="p-1.5 bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-2xs cursor-pointer"><CheckCircle2 className="w-4 h-4" /></button>
                      <button onClick={() => handleActionUpdate('advance_salary_requests', claim.id, 'rejected')} className="p-1.5 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-2xs cursor-pointer"><XCircle className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}