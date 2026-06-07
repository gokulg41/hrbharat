"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AlertCircle,
  ShieldCheck,
  Loader2,
  Mail,
  Briefcase,
  Layers,
  Calendar,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function EmployeeSettingsPage() {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
        .from('employees').select('*').eq('email', user.email?.toLowerCase().trim()).single();
      if (emp) setEmployee(emp);
      setLoading(false);
    }
    loadIdentityContext();
  }, []);

  const handlePasswordMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setUpdating(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#9b9a97]">Loading…</p>
      </div>
    );
  }

  const inputClass =
    "w-full text-sm px-2 py-1.5 border border-[#e9e9e7] rounded-md bg-white text-[#37352f] placeholder:text-[#c1c0bb] focus:outline-none focus:ring-2 focus:ring-[#2eaadc]/30 focus:border-[#2eaadc] transition-all";

  const labelClass = "block text-xs font-medium text-[#787774] mb-1";

  return (
    <div className="min-h-screen bg-white font-sans text-[#37352f]">

      {/* TOP BAR */}
      <header className="border-b border-[#e9e9e7] sticky top-0 z-40 bg-white">
        <div className="max-w-4xl mx-auto px-8 h-12 flex items-center gap-1.5 text-sm">
          <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
            <span className="text-white text-[8px] font-bold">HB</span>
          </div>
          <span className="text-[#c1c0bb]">/</span>
          <span className="font-medium">Settings</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-10">

        {/* PAGE TITLE */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-[#9b9a97]">Manage your account details and password.</p>
        </div>

        <hr className="border-[#e9e9e7]" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* ── PROFILE INFO ── */}
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-semibold text-[#9b9a97] uppercase tracking-widest">Profile</p>

            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f7f6f3] border border-[#e9e9e7] flex items-center justify-center text-sm font-semibold text-[#37352f] shrink-0">
                {employee?.full_name?.slice(0, 2)?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#37352f]">{employee?.full_name}</p>
                <p className="text-xs text-[#9b9a97] font-mono">{employee?.employee_code}</p>
              </div>
            </div>

            {/* Properties */}
            <div className="space-y-3">
              {[
                { icon: Mail, label: 'Email', value: employee?.email },
                { icon: Briefcase, label: 'Role', value: employee?.designation || 'Specialist' },
                { icon: Layers, label: 'Department', value: employee?.department || 'Operations' },
                { icon: Calendar, label: 'Joined', value: employee?.joining_date || 'N/A' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-[#c1c0bb] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-[#9b9a97]">{label}</p>
                    <p className="text-sm text-[#37352f] font-mono">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Read-only notice */}
            <div className="flex items-start gap-2 text-xs text-[#787774] bg-[#f7f6f3] border border-[#e9e9e7] rounded-md px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#9b9a97]" />
              Profile details are read-only. Contact HR to request changes.
            </div>
          </div>

          {/* ── CHANGE PASSWORD ── */}
          <div className="lg:col-span-7 space-y-5">
            <p className="text-xs font-semibold text-[#9b9a97] uppercase tracking-widest flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> Change Password
            </p>

            {message && (
              <div className={`text-sm px-4 py-2.5 rounded-md border flex items-start gap-2 ${
                message.type === 'success'
                  ? 'bg-[#edfbf3] border-[#b7ebcf] text-[#0f7b43]'
                  : 'bg-[#fdecea] border-[#f5c0bb] text-[#d44c47]'
              }`}>
                {message.type === 'success'
                  ? <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                {message.text}
              </div>
            )}

            <form onSubmit={handlePasswordMigration} className="space-y-4">
              <div>
                <label className={labelClass}>New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c1c0bb] hover:text-[#787774] cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-md bg-[#37352f] text-white hover:bg-[#2d2c28] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                {updating ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}