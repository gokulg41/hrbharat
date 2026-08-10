"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  User,
  Lock,
  Bell,
  Landmark,
  ShieldCheck,
  History,
  Trash2,
  Upload,
  Save,
  Eye,
  EyeOff,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Monitor,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL (verified against live schema before writing this page)
   ─────────────────────────────────────────────
   - Profile fields shown are the columns actually written at onboarding
     (see lib/actions.ts createEmployee): full_name, phone_number,
     joining_date, department, designation, employee_code, email. There is
     no separate "mobile_number"/"date_of_joining" column in active use —
     those are unused duplicate columns left over on the table, so this
     page reads/writes phone_number and joining_date instead.
   - Only Full Name and Phone Number are self-editable here. Employee ID,
     Department, Role and Date of Joining are HR/admin-controlled fields
     (they feed payroll, RBAC, and reporting elsewhere in the app), and
     Email is the identity key every other page keys off of
     (`.eq('email', user.email)`), so none of those are safe for an
     employee to change from this page.
   - employees had no employee-level UPDATE policy at all (checked
     pg_policy: two SELECT policies scoped to the caller's own row, plus an
     owner/admin ALL policy — no self UPDATE). auth_user_id is also not
     reliably populated across existing rows. So profile/banking/
     notification writes go through three new SECURITY DEFINER RPCs
     (update_own_employee_profile / update_own_employee_banking /
     update_own_notification_preferences) added in migration
     employee_self_service_settings — each one scoped server-side to
     lower(trim(email)) = lower(auth.email()) and limited to a fixed
     whitelist of self-service columns, so the client can never touch
     salary, status, company_id, department, designation, or
     employee_code even though it's calling with the anon key.
   - notify_leave_requests / notify_payslip_ready / notify_attendance_alerts
     are new real columns (same migration), default true — not fabricated
     toggle state.
   - Change Password re-authenticates with the current password via
     supabase.auth.signInWithPassword before calling
     supabase.auth.updateUser, so "Current Password" in the mockup is
     actually checked rather than decorative.
   - Privacy & Security shows only real data available client-side from
     the Supabase Auth session: email verification state and last sign-in
     time (both on the auth User object). Two-factor authentication isn't
     wired up anywhere in this app yet, so it's labeled "Not enabled" with
     no fake toggle rather than pretending it works.
   - Session History has no backing table anywhere in the schema, so it
     honestly shows only the current session (device/browser read from
     navigator.userAgent, sign-in time from the real auth session) with a
     note that historical session tracking isn't implemented yet, instead
     of inventing a login history.
   - Delete Account cannot actually delete anything from the browser —
     deleting an auth user needs the service-role key, which must never
     reach client code. Confirming the modal calls
     request_own_account_deletion, a SECURITY DEFINER RPC that writes a
     real row into system_audit_logs (event_type
     'account_deletion_requested') so the company admin has something
     concrete to act on, instead of a button that silently does nothing.
───────────────────────────────────────────── */

type Employee = {
  id: string;
  company_id: string | null;
  employee_code: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  department: string | null;
  designation: string | null;
  joining_date: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  notify_leave_requests: boolean;
  notify_payslip_ready: boolean;
  notify_attendance_alerts: boolean;
};

type Toast = { type: 'success' | 'error'; text: string } | null;

const NAV_ITEMS = [
  { key: 'profile', label: 'Profile Information', icon: User },
  { key: 'password', label: 'Change Password', icon: Lock },
  { key: 'notifications', label: 'Notification Preferences', icon: Bell },
  { key: 'banking', label: 'Account & Banking', icon: Landmark },
  { key: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
  { key: 'sessions', label: 'Session History', icon: History },
] as const;

type SectionKey = (typeof NAV_ITEMS)[number]['key'];

function maskAccount(num?: string | null) {
  if (!num) return null;
  const digits = String(num).replace(/\s+/g, '');
  return digits.length <= 4 ? `•••• ${digits}` : `•••• ${digits.slice(-4)}`;
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function formatDateTime(d?: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

/** Minimal, honest UA parse — just enough for "Chrome on macOS" style labels, no fingerprinting library. */
function parseUserAgent(ua: string) {
  let browser = 'Unknown browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

  let device = 'Desktop';
  if (/iphone/i.test(ua)) device = 'iPhone';
  else if (/ipad/i.test(ua)) device = 'iPad';
  else if (/android/i.test(ua)) device = 'Android device';
  else if (/mac os/i.test(ua)) device = 'Mac';
  else if (/windows/i.test(ua)) device = 'Windows PC';
  else if (/linux/i.test(ua)) device = 'Linux PC';

  return { browser, device };
}

/* ── Small shared bits ───────────────────────────────────────── */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

function Card({
  id,
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  innerRef,
  danger = false,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  innerRef?: (el: HTMLDivElement | null) => void;
  danger?: boolean;
}) {
  return (
    <div
      id={id}
      ref={innerRef}
      className={`bg-surface-card border rounded-2xl shadow-card scroll-mt-20 ${
        danger ? 'border-status-danger/30 bg-status-danger-bg/30' : 'border-border-subtle'
      }`}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                danger ? 'bg-status-danger-bg text-status-danger' : 'bg-brand-subtle text-brand'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className={`text-[15px] font-bold font-sans ${danger ? 'text-status-danger' : 'text-ink-900'}`}>{title}</h2>
            {subtitle && <p className="text-xs text-ink-600 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const inputClass =
  'w-full text-sm px-3 py-2.5 border border-border-subtle rounded-lg bg-surface-card text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:bg-surface-card-hover disabled:text-ink-600 disabled:cursor-not-allowed';

const labelClass = 'block text-xs font-medium text-ink-600 mb-1.5';

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[40px] rounded-full transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-brand' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function EmployeeSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLDivElement | null>>>({});

  const [toast, setToast] = useState<Toast>(null);

  /* Profile form */
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  /* Password form */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  /* Notification toggles */
  const [notifyLeave, setNotifyLeave] = useState(true);
  const [notifyPayslip, setNotifyPayslip] = useState(true);
  const [notifyAttendance, setNotifyAttendance] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  /* Banking modal */
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upi, setUpi] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  /* Delete account modal */
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);

  const showToast = (t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setAuthEmail(user.email ?? null);
      setLastSignInAt((user as any).last_sign_in_at ?? null);
      setEmailVerified(Boolean((user as any).email_confirmed_at));

      const { data: emp, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email?.toLowerCase().trim())
        .single();

      if (error || !emp) {
        setEmployee(null);
        setLoading(false);
        return;
      }

      setEmployee(emp as Employee);
      setFullName(emp.full_name || '');
      setPhoneNumber(emp.phone_number || '');
      setNotifyLeave(emp.notify_leave_requests ?? true);
      setNotifyPayslip(emp.notify_payslip_ready ?? true);
      setNotifyAttendance(emp.notify_attendance_alerts ?? true);
      setBankName(emp.bank_name || '');
      setBankAccount(emp.bank_account_number || '');
      setIfsc(emp.ifsc_code || '');
      setUpi(emp.upi_id || '');
    } catch (err) {
      console.error('Settings load error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* Scroll-spy for the left nav */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const key = (visible[0].target as HTMLElement).dataset.sectionKey as SectionKey | undefined;
          if (key) setActiveSection(key);
        }
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  const scrollToSection = (key: SectionKey) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast({ type: 'error', text: 'Full name cannot be empty.' });
      return;
    }
    setSavingProfile(true);
    try {
      const { data, error } = await supabase.rpc('update_own_employee_profile', {
        p_full_name: fullName,
        p_phone_number: phoneNumber,
      });
      if (error) throw error;
      if (data) setEmployee((prev) => (prev ? { ...prev, ...data } : prev));
      showToast({ type: 'success', text: 'Profile updated.' });
    } catch (err: any) {
      showToast({ type: 'error', text: err.message || 'Could not update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast({ type: 'error', text: 'Enter your current password.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (!authEmail) {
      showToast({ type: 'error', text: 'Could not verify your account. Try signing in again.' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: currentPassword,
      });
      if (verifyErr) {
        showToast({ type: 'error', text: 'Current password is incorrect.' });
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;
      showToast({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast({ type: 'error', text: err.message || 'Could not update password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const persistNotifications = async (next: { leave?: boolean; payslip?: boolean; attendance?: boolean }) => {
    setSavingNotif(true);
    try {
      const { error } = await supabase.rpc('update_own_notification_preferences', {
        p_notify_leave_requests: next.leave ?? notifyLeave,
        p_notify_payslip_ready: next.payslip ?? notifyPayslip,
        p_notify_attendance_alerts: next.attendance ?? notifyAttendance,
      });
      if (error) throw error;
    } catch (err: any) {
      showToast({ type: 'error', text: err.message || 'Could not save notification preference.' });
    } finally {
      setSavingNotif(false);
    }
  };

  const handleSaveBanking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      const { data, error } = await supabase.rpc('update_own_employee_banking', {
        p_bank_name: bankName,
        p_bank_account_number: bankAccount,
        p_ifsc_code: ifsc,
        p_upi_id: upi,
      });
      if (error) throw error;
      if (data) setEmployee((prev) => (prev ? { ...prev, ...data } : prev));
      showToast({ type: 'success', text: 'Bank details updated.' });
      setBankModalOpen(false);
    } catch (err: any) {
      showToast({ type: 'error', text: err.message || 'Could not update bank details.' });
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestDeletion = async () => {
    setRequestingDeletion(true);
    try {
      const { error } = await supabase.rpc('request_own_account_deletion', { p_reason: deleteReason || null });
      if (error) throw error;
      setDeletionRequested(true);
      showToast({ type: 'success', text: 'Deletion request submitted.' });
    } catch (err: any) {
      showToast({ type: 'error', text: err.message || 'Could not submit deletion request.' });
    } finally {
      setRequestingDeletion(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = (employee?.full_name || 'EM')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const currentDevice = typeof navigator !== 'undefined' ? parseUserAgent(navigator.userAgent) : { browser: 'Unknown', device: 'Unknown' };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-canvas font-sans">
        <div className="h-14 border-b border-border-subtle bg-surface-card px-6 flex items-center">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="px-6 lg:px-8 py-6 space-y-6 max-w-[1400px] mx-auto">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-5">
            <Skeleton className="h-64 rounded-2xl" />
            <div className="space-y-5">
              <Skeleton className="h-56 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-surface-canvas font-sans flex items-center justify-center px-6">
        <p className="text-sm text-ink-600">No employee profile found for this account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-canvas font-sans text-ink-900">
      {/* TOP HEADER */}
      <header className="border-b border-border-subtle sticky top-0 z-30 bg-surface-canvas/95 backdrop-blur">
        <div className="px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center shrink-0">
              <span className="text-white text-[9px] font-bold">HR</span>
            </div>
            <span className="text-ink-400">/</span>
            <span className="font-semibold text-ink-900">Settings</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-50 flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-xl shadow-lg border ${
            toast.type === 'success'
              ? 'bg-status-success-bg text-status-success border-status-success/20'
              : 'bg-status-danger-bg text-status-danger border-status-danger/20'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.text}
        </div>
      )}

      <main className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">
        {/* PAGE HEADER */}
        <div className="mb-6">
          <h1 className="text-[26px] font-bold tracking-tight text-ink-900">Settings</h1>
          <p className="mt-1 text-sm text-ink-600">Manage your profile, account and preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-5 items-start">
          {/* LEFT NAV */}
          <div className="bg-surface-card border border-border-subtle rounded-2xl shadow-card p-4 lg:sticky lg:top-20 overflow-x-auto lg:overflow-visible">
            <p className="text-[15px] font-bold text-ink-900 font-sans px-2 mb-2 hidden lg:block">Settings</p>
            <nav className="flex lg:flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => scrollToSection(item.key)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-sans whitespace-nowrap transition-colors cursor-pointer ${
                      active ? 'bg-brand-subtle text-brand font-semibold' : 'text-ink-600 hover:bg-surface-card-hover'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand' : 'text-ink-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* RIGHT CONTENT */}
          <div className="space-y-5 min-w-0">
            {/* PROFILE INFORMATION */}
            <Card
              id="profile"
              innerRef={(el) => {
                sectionRefs.current.profile = el;
                if (el) el.dataset.sectionKey = 'profile';
              }}
              title="Profile Information"
              subtitle="View and update your personal information."
              icon={User}
              action={
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-11 h-11 rounded-full bg-brand-subtle border border-brand/20 flex items-center justify-center text-sm font-bold text-brand">
                    {initials}
                  </div>
                  <button
                    type="button"
                    disabled
                    title="Photo upload isn't wired up yet"
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand border border-brand/30 px-3 py-2 rounded-lg opacity-50 cursor-not-allowed"
                  >
                    <Upload className="w-3.5 h-3.5" /> Change Photo
                  </button>
                </div>
              }
            >
              <form onSubmit={handleSaveProfile} className="px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Employee ID</label>
                    <input className={inputClass} value={employee.employee_code} disabled />
                  </div>
                  <div>
                    <label className={labelClass}>Department</label>
                    <input className={inputClass} value={employee.department || '—'} disabled />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input className={inputClass} value={employee.email || ''} disabled />
                  </div>
                  <div>
                    <label className={labelClass}>Mobile Number</label>
                    <input className={inputClass} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Add a mobile number" />
                  </div>
                  <div>
                    <label className={labelClass}>Role</label>
                    <input className={inputClass} value={employee.designation || '—'} disabled />
                  </div>
                  <div>
                    <label className={labelClass}>Date of Joining</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input className={`${inputClass} pl-9`} value={formatDate(employee.joining_date)} disabled />
                    </div>
                  </div>
                </div>

                <p className="flex items-start gap-2 text-xs text-ink-600 bg-surface-card-hover border border-border-subtle rounded-lg px-3 py-2.5 mt-4">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-ink-400" />
                  Employee ID, Department, Role, Email and Date of Joining are managed by HR — contact your admin to update these.
                </p>

                <div className="flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingProfile ? 'Saving…' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </Card>

            {/* CHANGE PASSWORD */}
            <Card
              id="password"
              innerRef={(el) => {
                sectionRefs.current.password = el;
                if (el) el.dataset.sectionKey = 'password';
              }}
              title="Change Password"
              subtitle="Update your password regularly to keep your account secure."
              icon={Lock}
            >
              <form onSubmit={handleChangePassword} className="px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        className={`${inputClass} pr-9`}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                      <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 cursor-pointer">
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        className={`${inputClass} pr-9`}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                      <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 cursor-pointer">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        className={`${inputClass} pr-9`}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 cursor-pointer">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {savingPassword ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </form>
            </Card>

            {/* NOTIFICATIONS + BANKING */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <Card
                id="notifications"
                innerRef={(el) => {
                  sectionRefs.current.notifications = el;
                  if (el) el.dataset.sectionKey = 'notifications';
                }}
                title="Notification Preferences"
                subtitle="Choose how you want to receive notifications."
                icon={Bell}
              >
                <div className="px-6 pb-5 divide-y divide-border-subtle">
                  {[
                    { label: 'Leave Requests', sub: 'Get notified about leave request updates', checked: notifyLeave, set: (v: boolean) => { setNotifyLeave(v); persistNotifications({ leave: v }); } },
                    { label: 'Salary & Payslip', sub: 'Get notified when payslip is available', checked: notifyPayslip, set: (v: boolean) => { setNotifyPayslip(v); persistNotifications({ payslip: v }); } },
                    { label: 'Attendance Alerts', sub: 'Get notified about attendance corrections', checked: notifyAttendance, set: (v: boolean) => { setNotifyAttendance(v); persistNotifications({ attendance: v }); } },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-900">{row.label}</p>
                        <p className="text-xs text-ink-600 mt-0.5">{row.sub}</p>
                      </div>
                      <Toggle checked={row.checked} onChange={row.set} disabled={savingNotif} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card
                id="banking"
                innerRef={(el) => {
                  sectionRefs.current.banking = el;
                  if (el) el.dataset.sectionKey = 'banking';
                }}
                title="Account & Banking"
                subtitle="View your bank account details and manage account settings."
                icon={Landmark}
                action={
                  <button
                    onClick={() => setBankModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand border border-brand/30 hover:bg-brand-subtle px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Update Bank Details
                  </button>
                }
              >
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <p className="text-xs text-ink-600 mb-1">Bank Account</p>
                    <p className="text-lg font-bold text-ink-900 font-mono">{maskAccount(employee.bank_account_number) || 'Not added'}</p>
                    {employee.bank_name && <p className="text-xs text-ink-600 mt-0.5">{employee.bank_name}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-ink-600 mb-1">IFSC Code</p>
                    <p className="text-sm font-medium text-ink-900 font-mono">{employee.ifsc_code || '—'}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* PRIVACY & SECURITY */}
            <Card
              id="privacy"
              innerRef={(el) => {
                sectionRefs.current.privacy = el;
                if (el) el.dataset.sectionKey = 'privacy';
              }}
              title="Privacy & Security"
              subtitle="Your account's login and security status."
              icon={ShieldCheck}
            >
              <div className="px-6 pb-6 divide-y divide-border-subtle">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-ink-400" />
                    <span className="text-sm text-ink-600">Login Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-900 font-mono">{authEmail}</span>
                    {emailVerified && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-status-success-bg text-status-success">Verified</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-ink-400" />
                    <span className="text-sm text-ink-600">Last Sign-in</span>
                  </div>
                  <span className="text-sm font-medium text-ink-900">{formatDateTime(lastSignInAt)}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-ink-400" />
                    <span className="text-sm text-ink-600">Two-Factor Authentication</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-card-hover text-ink-600">Not enabled</span>
                </div>
              </div>
              <p className="mx-6 mb-6 flex items-start gap-2 text-xs text-ink-600 bg-surface-card-hover border border-border-subtle rounded-lg px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-ink-400" />
                Two-factor authentication isn&apos;t set up for this app yet.
              </p>
            </Card>

            {/* SESSION HISTORY */}
            <Card
              id="sessions"
              innerRef={(el) => {
                sectionRefs.current.sessions = el;
                if (el) el.dataset.sectionKey = 'sessions';
              }}
              title="Session History"
              subtitle="Devices that have signed in to your account."
              icon={History}
            >
              <div className="px-6 pb-5">
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-ink-400 border-b border-border-subtle">
                        <th className="font-semibold pb-2.5 pr-3">Device</th>
                        <th className="font-semibold pb-2.5 pr-3">Browser</th>
                        <th className="font-semibold pb-2.5 pr-3">Date &amp; Time</th>
                        <th className="font-semibold pb-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      <tr>
                        <td className="py-3 pr-3 text-ink-900 font-medium whitespace-nowrap flex items-center gap-2">
                          <Monitor className="w-3.5 h-3.5 text-ink-400" /> {currentDevice.device}
                        </td>
                        <td className="py-3 pr-3 text-ink-900 whitespace-nowrap">{currentDevice.browser}</td>
                        <td className="py-3 pr-3 text-ink-900 whitespace-nowrap">{formatDateTime(lastSignInAt)}</td>
                        <td className="py-3 text-right">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-status-success-bg text-status-success">Current Session</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="flex items-start gap-2 text-xs text-ink-600 bg-surface-card-hover border border-border-subtle rounded-lg px-3 py-2.5 mt-4">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-ink-400" />
                  Only your current session is shown — historical login tracking isn&apos;t implemented yet.
                </p>
              </div>
            </Card>

            {/* ACCOUNT ACTIONS */}
            <div className="bg-status-danger-bg/40 border border-status-danger/30 rounded-2xl shadow-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-status-danger">Account Actions</p>
                <p className="text-xs text-ink-600 mt-0.5">Delete your account and all associated data permanently.</p>
              </div>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-status-danger bg-surface-card border border-status-danger/40 hover:bg-status-danger-bg px-4 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" /> Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── BANK DETAILS MODAL ── */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setBankModalOpen(false)} />
          <div className="relative bg-surface-card border border-border-subtle rounded-2xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-ink-900">Update Bank Details</h3>
              <button onClick={() => setBankModalOpen(false)} className="w-7 h-7 rounded-md flex items-center justify-center text-ink-400 hover:bg-surface-card-hover cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBanking} className="space-y-4">
              <div>
                <label className={labelClass}>Bank Name</label>
                <input className={inputClass} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. State Bank of India" />
              </div>
              <div>
                <label className={labelClass}>Account Number</label>
                <input className={inputClass} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Account number" />
              </div>
              <div>
                <label className={labelClass}>IFSC Code</label>
                <input className={inputClass} value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" />
              </div>
              <div>
                <label className={labelClass}>UPI ID (optional)</label>
                <input className={inputClass} value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="e.g. name@upi" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  className="text-sm font-medium text-ink-600 hover:bg-surface-card-hover px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingBank && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingBank ? 'Saving…' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE ACCOUNT CONFIRMATION MODAL ── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative bg-surface-card border border-border-subtle rounded-2xl shadow-lg w-full max-w-md p-6">
            {deletionRequested ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-status-success-bg flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-5 h-5 text-status-success" />
                </div>
                <p className="text-sm font-semibold text-ink-900">Request submitted</p>
                <p className="text-xs text-ink-600 mt-1.5 max-w-xs mx-auto">
                  Your company admin has been notified and will process this request. Your account remains active until then.
                </p>
                <button
                  onClick={() => { setDeleteModalOpen(false); setDeletionRequested(false); setDeleteConfirmText(''); setDeleteReason(''); }}
                  className="mt-4 text-sm font-semibold text-white bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-status-danger-bg flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-status-danger" />
                  </div>
                  <h3 className="text-[15px] font-bold text-ink-900">Delete your account?</h3>
                </div>
                <p className="text-sm text-ink-600 mb-4">
                  This can&apos;t be undone from here. We&apos;ll send a deletion request to your company admin, who will remove your account and data.
                  Type <span className="font-mono font-semibold text-ink-900">DELETE</span> to confirm.
                </p>
                <div className="space-y-3">
                  <input
                    className={inputClass}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                  />
                  <textarea
                    className={`${inputClass} min-h-[72px] resize-none`}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Reason (optional)"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="text-sm font-medium text-ink-600 hover:bg-surface-card-hover px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestDeletion}
                    disabled={deleteConfirmText !== 'DELETE' || requestingDeletion}
                    className="flex items-center gap-2 text-sm font-semibold text-white bg-status-danger hover:opacity-90 px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {requestingDeletion && <Loader2 className="w-4 h-4 animate-spin" />}
                    {requestingDeletion ? 'Submitting…' : 'Request Deletion'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}