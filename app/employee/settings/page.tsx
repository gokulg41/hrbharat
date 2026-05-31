"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Settings, 
  Key, 
  AlertCircle, 
  ShieldCheck, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Layers, 
  Calendar,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function EmployeeSettingsPage() {
  // Identity Parameters Storage
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Security Credentials Inputs
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadIdentityContext() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email?.toLowerCase().trim())
        .single();

      if (emp) setEmployee(emp);
      setLoading(false);
    }
    loadIdentityContext();
  }, []);

  const handlePasswordMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Security Boundary: Your custom master password must contain at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Input Mismatch: The validation password entries do not cross-match.' });
      return;
    }

    setUpdating(true);
    setMessage(null);

    // Commit password mutation securely down to Supabase native auth layer
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setMessage({ type: 'error', text: `Migration Aborted: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'Access Token Overhaul Absolute! Temporary credentials cleared successfully.' });
      setNewPassword(''); 
      setConfirmPassword('');
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="w-5 h-5 text-slate-900 animate-spin mx-auto" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Secure Settings Registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-12 space-y-10 max-w-5xl mx-auto font-sans antialiased text-slate-800">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account & Security Settings</h1>
        <p className="text-xs text-slate-400 font-medium">Review your system identity mapping nodes and overhaul your temporary authentication tokens.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: SYSTEM IDENTITY VISUALIZATION INFO (TAKES 5 COLS) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.005)] overflow-hidden">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black uppercase">
              {employee?.full_name?.slice(0, 2)}
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">{employee?.full_name}</h3>
              <p className="text-[10px] font-mono font-bold text-slate-400">{employee?.employee_code}</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Corporate Node Identity Details</span>
            
            <div className="flex items-center space-x-3 text-xs">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Email Identity</span>
                <span className="font-bold text-slate-700 font-mono">{employee?.email}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Assigned Role</span>
                <span className="font-bold text-slate-700">{employee?.designation || 'Roster Specialist'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <Layers className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Operational Group</span>
                <span className="font-bold text-slate-700">{employee?.department || 'Operations'} Division</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Deployment Date</span>
                <span className="font-bold text-slate-700 font-mono">{employee?.joining_date || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50/50 border-t border-slate-100 px-6 py-4">
            <p className="text-[10px] leading-relaxed font-semibold text-amber-800/80 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
              <span>Core profile mapping parameters are read-only to protect organizational integrity. Contact HR engineering support to request core changes.</span>
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE PASSWORD OVERHAUL VAULT (TAKES 7 COLS) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.005)] space-y-6">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Lock className="w-4 h-4 text-slate-900" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Credential Overhaul Vault</h3>
          </div>

          {message && (
            <div className={`p-4 text-xs font-bold rounded-xl flex items-start space-x-2.5 border shadow-3xs leading-relaxed ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'
            }`}>
              {message.type === 'success' ? <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordMigration} className="space-y-4">
            <div className="space-y-1 relative">
              <label className="text-[9px] uppercase font-black text-slate-400 block tracking-wide">New Secure Master Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full text-xs font-bold pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/40 focus:outline-none focus:bg-white focus:border-slate-900 transition-all" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black text-slate-400 block tracking-wide">Validate Password String</label>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/40 focus:outline-none focus:bg-white focus:border-slate-900 transition-all" 
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={updating}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs py-3 rounded-xl tracking-wider uppercase transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 group"
              >
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{updating ? 'Committing New Token...' : 'Overhaul Access Key'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}