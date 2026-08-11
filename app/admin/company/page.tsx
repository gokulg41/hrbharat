"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Building2,
  FileText,
  ShieldCheck,
  Bell,
  Plug,
  Wallet,
  ClipboardList,
  MapPin,
  Users,
  Landmark,
  Calendar,
  Crown,
  ChevronRight,
  Search,
  HelpCircle,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Zap,
  Info,
  FileBadge2,
  Webhook,
  MessageCircle,
  FileSpreadsheet,
  Fingerprint,
  Hash,
  Copy,
  KeyRound,
  Smartphone,
  Activity,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   NOTE ON DATA MODEL (verified against the live schema before writing this)
   ─────────────────────────────────────────────
   - `companies` already existed but had no columns for email, website,
     industry, company_size, established_on, PAN, split address fields, or
     statutory numbers beyond GST. Rather than fabricate this data, an
     additive migration added nullable columns for exactly these fields —
     nothing existing was renamed or dropped.
   - There was no table anywhere for uploaded company documents (GST
     certificate, PAN card, etc). A new `company_documents` table was added,
     RLS-scoped the same way `payslips` / `report_activity` already are
     (company_id must belong to the authenticated owner).
   - Logos reuse the existing public `hrbharat-media` bucket (already has
     an authenticated-upload / public-read policy) under
     `company-logos/{company_id}/...`.
   - Statutory documents use a new PRIVATE `company-documents` bucket —
     the existing media bucket is public, which is wrong for GST/PAN/
     incorporation certificates. Read/write/delete are scoped to the
     uploading company's folder only.
   - `Departments` and `Locations` on the overview card are computed from
     real data (distinct `employees.department`, count of `branches`) —
     not stored anywhere as a number.
   - `subscriptions` currently has no row linked to any real company
     (company_id is null on the only row in the table). Rather than invent
     a plan, the Subscription Plan row honestly shows "Not configured"
     unless a real linked subscription is found.
───────────────────────────────────────────── */

type TabKey = 'profile' | 'business' | 'payroll' | 'leave' | 'notifications' | 'integrations' | 'security';
const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'profile', label: 'Company Profile', icon: ClipboardList },
  { key: 'business', label: 'Business Details', icon: Building2 },
  { key: 'payroll', label: 'Payroll Settings', icon: Wallet },
  { key: 'leave', label: 'Leave Settings', icon: Calendar },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'security', label: 'Security', icon: ShieldCheck },
];

const DOC_TYPES: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'gst_certificate', label: 'GST Certificate', icon: FileBadge2 },
  { key: 'pan_card', label: 'PAN Card', icon: FileBadge2 },
  { key: 'pf_registration', label: 'PF Registration Certificate', icon: FileBadge2 },
  { key: 'esi_registration', label: 'ESI Registration Certificate', icon: FileBadge2 },
  { key: 'incorporation_certificate', label: 'Incorporation Certificate', icon: FileBadge2 },
  { key: 'other', label: 'Other Document', icon: FileText },
];

const INDUSTRIES = ['Information Technology', 'Manufacturing', 'Retail', 'Healthcare', 'Education', 'Construction', 'Hospitality', 'Finance', 'Logistics', 'Other'];
const COMPANY_SIZES = ['1 – 10 Employees', '11 – 50 Employees', '51 – 100 Employees', '101 – 500 Employees', '500+ Employees'];
const INDIAN_STATES = ['Andhra Pradesh', 'Delhi', 'Gujarat', 'Karnataka', 'Kerala', 'Maharashtra', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Other'];

function validateEmail(v: string) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function validatePhone(v: string) { return !v || /^(\+91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/\s/g, '')); }
function validateUrl(v: string) { return !v || /^https?:\/\/[^\s]+\.[^\s]+$/.test(v); }
function validatePAN(v: string) { return !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()); }
function validateGST(v: string) { return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.toUpperCase()); }
function validatePincode(v: string) { return !v || /^[1-9][0-9]{5}$/.test(v); }

function formatDate(iso: string | null) {
  if (!iso) return 'Not available';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-ink-600 font-sans block mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[10px] text-rose-600 font-sans mt-1">{error}</p>}
    </div>
  );
}

const inputCls = "w-full text-sm font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-brand text-ink-900";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1 ${checked ? 'bg-brand' : 'bg-[var(--border-hover)]'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function LockedFeatureNote({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-white border border-[var(--border-subtle)] flex items-center justify-center"><Zap className="w-5 h-5 text-ink-400" /></div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-900 font-sans">{title}</p>
          <p className="text-xs text-ink-600 font-sans leading-relaxed">This isn&apos;t live yet — it&apos;s on the roadmap and will unlock here once it ships.</p>
        </div>
        <button onClick={onClose} className="w-full text-sm font-medium font-sans px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] transition-colors">Got it</button>
      </div>
    </div>
  );
}

export default function CompanyPage() {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [adminName, setAdminName] = useState('Administrator');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [company, setCompany] = useState<any>(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [locationCount, setLocationCount] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [profileForm, setProfileForm] = useState<any>(null);
  const [addressForm, setAddressForm] = useState<any>(null);
  const [statutoryForm, setStatutoryForm] = useState<any>(null);
  const [businessForm, setBusinessForm] = useState<any>(null);
  const [payrollSettings, setPayrollSettings] = useState<any>(null);
  const [payrollForm, setPayrollForm] = useState<any>(null);
  const [leaveSettings, setLeaveSettings] = useState<any>(null);
  const [leaveSettingsForm, setLeaveSettingsForm] = useState<any>(null);
  const [leaveTypeForms, setLeaveTypeForms] = useState<Record<string, any>>({});
  const [savingLeaveSettings, setSavingLeaveSettings] = useState(false);
  const [savingLeaveType, setSavingLeaveType] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<any>(null);
  const [notificationForm, setNotificationForm] = useState<any>(null);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [webhookSettings, setWebhookSettings] = useState<any>(null);
  const [webhookForm, setWebhookForm] = useState<any>(null);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [ipAllowlist, setIpAllowlist] = useState('');
  const [savingIpAllowlist, setSavingIpAllowlist] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Security tab — real Supabase Auth state, not app-schema data
  const [adminEmail, setAdminEmail] = useState('');
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [accountStatus, setAccountStatus] = useState('Active');
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrSvg: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const [securityLog, setSecurityLog] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingStatutory, setSavingStatutory] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [locating, setLocating] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingStatutory, setEditingStatutory] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [pendingDocType, setPendingDocType] = useState('gst_certificate');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setAuthUser(user);
      const { data: profile } = await supabase.from('profiles').select('company_id, role, full_name').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
      if (profile.full_name) setAdminName(profile.full_name.split(' ')[0]);
      const cid = profile.company_id;
      setCompanyId(cid);

      const [companyRes, empRes, branchRes, subRes, docRes, payrollRes, leaveSettingsRes, leaveTypesRes, notifRes, webhookRes, companySettingsRes, auditRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', cid).single(),
        supabase.from('employees').select('id, department').eq('company_id', cid),
        supabase.from('branches').select('id').eq('company_id', cid),
        supabase.from('subscriptions').select('plan_id, status, current_period_end').eq('company_id', cid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('company_documents').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
        supabase.from('payroll_settings').select('*').eq('company_id', cid).maybeSingle(),
        supabase.from('leave_settings').select('*').eq('company_id', cid).maybeSingle(),
        supabase.from('leave_type_policies').select('*').eq('company_id', cid),
        supabase.from('notification_settings').select('*').eq('company_id', cid).maybeSingle(),
        supabase.from('webhook_integrations').select('*').eq('company_id', cid).maybeSingle(),
        supabase.from('company_settings').select('*').eq('company_id', cid).maybeSingle(),
        supabase.from('system_audit_logs').select('*').eq('company_id', cid).order('created_at', { ascending: false }).limit(10),
      ]);

      const firstErr = [companyRes, empRes, branchRes, docRes].find((r) => r.error)?.error;
      if (firstErr) setLoadError(firstErr.message);

      if (companyRes.data) {
        setCompany(companyRes.data);
        setProfileForm({
          name: companyRes.data.name || '', email: companyRes.data.email || '', phone: companyRes.data.phone || '',
          website: companyRes.data.website || '', industry: companyRes.data.industry || '', company_size: companyRes.data.company_size || '',
          established_on: companyRes.data.established_on || '', pan_number: companyRes.data.pan_number || '',
        });
        setAddressForm({
          address_line1: companyRes.data.address_line1 || '', address_line2: companyRes.data.address_line2 || '',
          city: companyRes.data.city || '', state: companyRes.data.state || '', pincode: companyRes.data.pincode || '',
          country: companyRes.data.country || 'India',
        });
        setStatutoryForm({
          gst_number: companyRes.data.gst_number || '', esi_number: companyRes.data.esi_number || '',
          pf_establishment_code: companyRes.data.pf_establishment_code || '', professional_tax_number: companyRes.data.professional_tax_number || '',
        });
        setBusinessForm({
          business_type: companyRes.data.business_type || '',
          working_days: companyRes.data.working_days ?? 26,
          default_check_in: companyRes.data.default_check_in ? companyRes.data.default_check_in.slice(0, 5) : '09:30',
          default_check_out: companyRes.data.default_check_out ? companyRes.data.default_check_out.slice(0, 5) : '18:30',
          office_latitude: companyRes.data.office_latitude ?? '',
          office_longitude: companyRes.data.office_longitude ?? '',
          allowed_radius_meters: companyRes.data.allowed_radius_meters ?? 100,
        });
      }
      if (empRes.data) {
        setEmployeeCount(empRes.data.length);
        setDepartmentCount(new Set(empRes.data.map((e) => e.department).filter(Boolean)).size);
      }
      if (branchRes.data) setLocationCount(branchRes.data.length);
      if (subRes.data) setSubscription(subRes.data);
      if (docRes.data) setDocuments(docRes.data);

      const DEFAULT_PAYROLL = {
        pay_cycle: 'Monthly', pay_day: 1,
        pf_enabled: true, pf_employee_rate: 12, pf_employer_rate: 12, pf_wage_ceiling: 15000,
        esi_enabled: true, esi_employee_rate: 0.75, esi_employer_rate: 3.25, esi_wage_ceiling: 21000,
        professional_tax_enabled: true, professional_tax_amount: 200,
        overtime_enabled: false, overtime_rate_multiplier: 1.5,
        rounding_rule: 'nearest_rupee',
      };
      if (payrollRes.data) {
        setPayrollSettings(payrollRes.data);
        setPayrollForm({ ...DEFAULT_PAYROLL, ...payrollRes.data });
      } else {
        setPayrollSettings(null);
        setPayrollForm(DEFAULT_PAYROLL);
      }

      const DEFAULT_LEAVE_SETTINGS = { leave_year_start_month: 1, min_notice_days: 1, max_consecutive_days: 15, allow_negative_balance: false };
      if (leaveSettingsRes.data) {
        setLeaveSettings(leaveSettingsRes.data);
        setLeaveSettingsForm({ ...DEFAULT_LEAVE_SETTINGS, ...leaveSettingsRes.data });
      } else {
        setLeaveSettings(null);
        setLeaveSettingsForm(DEFAULT_LEAVE_SETTINGS);
      }

      // Defaults mirror employees.casual_leave_balance / sick_leave_balance
      // (12 / 12) — the existing per-employee defaults already in the schema.
      // Unpaid Leave has no allocation concept, so annual_allocation stays null.
      const DEFAULT_LEAVE_TYPES: Record<string, any> = {
        'Casual Leave': { leave_type: 'Casual Leave', annual_allocation: 12, carry_forward_enabled: false, carry_forward_max: 0, accrual_method: 'annual' },
        'Sick Leave': { leave_type: 'Sick Leave', annual_allocation: 12, carry_forward_enabled: false, carry_forward_max: 0, accrual_method: 'annual' },
        'Unpaid Leave': { leave_type: 'Unpaid Leave', annual_allocation: null, carry_forward_enabled: false, carry_forward_max: 0, accrual_method: 'annual' },
      };
      const merged: Record<string, any> = { ...DEFAULT_LEAVE_TYPES };
      if (leaveTypesRes.data) for (const row of leaveTypesRes.data) merged[row.leave_type] = { ...DEFAULT_LEAVE_TYPES[row.leave_type], ...row };
      setLeaveTypeForms(merged);

      const DEFAULT_NOTIFICATIONS = {
        notify_leave_requests: true, notify_advance_requests: true, notify_new_employee: true, notify_payroll_processed: true,
        notify_attendance_anomalies: false, notify_low_leave_balance: false, weekly_summary_email: false,
        email_channel_enabled: true, notification_email: companyRes.data?.email || '',
      };
      if (notifRes.data) {
        setNotificationSettings(notifRes.data);
        setNotificationForm({ ...DEFAULT_NOTIFICATIONS, ...notifRes.data });
      } else {
        setNotificationSettings(null);
        setNotificationForm(DEFAULT_NOTIFICATIONS);
      }

      const DEFAULT_WEBHOOK = {
        enabled: false, endpoint_url: '', signing_secret: '',
        send_on_leave_request: true, send_on_advance_request: true, send_on_new_employee: true, send_on_payroll_processed: true,
      };
      if (webhookRes.data) {
        setWebhookSettings(webhookRes.data);
        setWebhookForm({ ...DEFAULT_WEBHOOK, ...webhookRes.data });
      } else {
        setWebhookSettings(null);
        setWebhookForm(DEFAULT_WEBHOOK);
      }

      if (companySettingsRes.data?.allowed_ip) setIpAllowlist(companySettingsRes.data.allowed_ip);
      if (auditRes.data) setAuditLogs(auditRes.data);

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function validateProfile(f: any) {
    const errs: Record<string, string> = {};
    if (!f.name?.trim()) errs.name = 'Company name is required.';
    if (!validateEmail(f.email)) errs.email = 'Enter a valid email address.';
    if (!validatePhone(f.phone)) errs.phone = 'Enter a valid 10-digit Indian phone number.';
    if (!validateUrl(f.website)) errs.website = 'Enter a valid URL (starting with http:// or https://).';
    if (!validatePAN(f.pan_number)) errs.pan_number = 'Enter a valid PAN (e.g. ABCDE1234F).';
    return errs;
  }

  async function saveProfile() {
    const errs = validateProfile(profileForm);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setToast({ type: 'error', text: 'Please fix the highlighted fields before saving.' }); return; }
    setSavingProfile(true);
    const { data, error } = await supabase.from('companies').update({
      name: profileForm.name.trim(), email: profileForm.email || null, phone: profileForm.phone || null,
      website: profileForm.website || null, industry: profileForm.industry || null, company_size: profileForm.company_size || null,
      established_on: profileForm.established_on || null, pan_number: profileForm.pan_number ? profileForm.pan_number.toUpperCase() : null,
    }).eq('id', companyId).select().single();
    setSavingProfile(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setCompany(data);
    setToast({ type: 'success', text: 'Company profile saved.' });
  }

  async function saveAddress() {
    const errs: Record<string, string> = {};
    if (!validatePincode(addressForm.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSavingAddress(true);
    const { data, error } = await supabase.from('companies').update({ ...addressForm }).eq('id', companyId).select().single();
    setSavingAddress(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setCompany(data);
    setEditingAddress(false);
    setToast({ type: 'success', text: 'Registered address updated.' });
  }

  async function saveStatutory() {
    const errs: Record<string, string> = {};
    if (!validateGST(statutoryForm.gst_number)) errs.gst_number = 'Enter a valid 15-character GSTIN.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSavingStatutory(true);
    const { data, error } = await supabase.from('companies').update({
      gst_number: statutoryForm.gst_number ? statutoryForm.gst_number.toUpperCase() : null,
      esi_number: statutoryForm.esi_number || null,
      pf_establishment_code: statutoryForm.pf_establishment_code || null,
      professional_tax_number: statutoryForm.professional_tax_number || null,
    }).eq('id', companyId).select().single();
    setSavingStatutory(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setCompany(data);
    setEditingStatutory(false);
    setToast({ type: 'success', text: 'Statutory details updated.' });
  }

  function validateBusiness(f: any) {
    const errs: Record<string, string> = {};
    const wd = Number(f.working_days);
    if (!wd || wd < 1 || wd > 31) errs.working_days = 'Enter a value between 1 and 31.';
    if (f.default_check_in && f.default_check_out && f.default_check_in >= f.default_check_out) errs.default_check_out = 'Check-out must be after check-in.';
    if (f.office_latitude !== '' && (Number(f.office_latitude) < -90 || Number(f.office_latitude) > 90)) errs.office_latitude = 'Latitude must be between -90 and 90.';
    if (f.office_longitude !== '' && (Number(f.office_longitude) < -180 || Number(f.office_longitude) > 180)) errs.office_longitude = 'Longitude must be between -180 and 180.';
    const radius = Number(f.allowed_radius_meters);
    if (!radius || radius < 10 || radius > 5000) errs.allowed_radius_meters = 'Enter a value between 10 and 5000 metres.';
    return errs;
  }

  async function saveBusiness() {
    const errs = validateBusiness(businessForm);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setToast({ type: 'error', text: 'Please fix the highlighted fields before saving.' }); return; }
    setSavingBusiness(true);
    const { data, error } = await supabase.from('companies').update({
      business_type: businessForm.business_type || null,
      working_days: Number(businessForm.working_days),
      default_check_in: businessForm.default_check_in || null,
      default_check_out: businessForm.default_check_out || null,
      office_latitude: businessForm.office_latitude === '' ? null : Number(businessForm.office_latitude),
      office_longitude: businessForm.office_longitude === '' ? null : Number(businessForm.office_longitude),
      allowed_radius_meters: Number(businessForm.allowed_radius_meters),
    }).eq('id', companyId).select().single();
    setSavingBusiness(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setCompany(data);
    setToast({ type: 'success', text: 'Business details saved. This updates check-in geofencing and payroll working days for all employees.' });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setToast({ type: 'error', text: 'Geolocation is not available in this browser.' }); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusinessForm((f: any) => ({ ...f, office_latitude: pos.coords.latitude.toFixed(7), office_longitude: pos.coords.longitude.toFixed(7) }));
        setLocating(false);
      },
      () => { setLocating(false); setToast({ type: 'error', text: 'Could not get your current location.' }); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function validatePayroll(f: any) {
    const errs: Record<string, string> = {};
    if (!f.pay_day || f.pay_day < 1 || f.pay_day > 28) errs.pay_day = 'Enter a day between 1 and 28.';
    if (f.pf_enabled) {
      if (f.pf_employee_rate < 0 || f.pf_employee_rate > 100) errs.pf_employee_rate = 'Enter a percentage between 0 and 100.';
      if (f.pf_employer_rate < 0 || f.pf_employer_rate > 100) errs.pf_employer_rate = 'Enter a percentage between 0 and 100.';
      if (f.pf_wage_ceiling < 0) errs.pf_wage_ceiling = 'Enter a positive amount.';
    }
    if (f.esi_enabled) {
      if (f.esi_employee_rate < 0 || f.esi_employee_rate > 100) errs.esi_employee_rate = 'Enter a percentage between 0 and 100.';
      if (f.esi_employer_rate < 0 || f.esi_employer_rate > 100) errs.esi_employer_rate = 'Enter a percentage between 0 and 100.';
      if (f.esi_wage_ceiling < 0) errs.esi_wage_ceiling = 'Enter a positive amount.';
    }
    if (f.professional_tax_enabled && f.professional_tax_amount < 0) errs.professional_tax_amount = 'Enter a positive amount.';
    if (f.overtime_enabled && f.overtime_rate_multiplier < 1) errs.overtime_rate_multiplier = 'Multiplier must be at least 1x.';
    return errs;
  }

  async function savePayroll() {
    const f = {
      ...payrollForm,
      pay_day: Number(payrollForm.pay_day),
      pf_employee_rate: Number(payrollForm.pf_employee_rate), pf_employer_rate: Number(payrollForm.pf_employer_rate), pf_wage_ceiling: Number(payrollForm.pf_wage_ceiling),
      esi_employee_rate: Number(payrollForm.esi_employee_rate), esi_employer_rate: Number(payrollForm.esi_employer_rate), esi_wage_ceiling: Number(payrollForm.esi_wage_ceiling),
      professional_tax_amount: Number(payrollForm.professional_tax_amount),
      overtime_rate_multiplier: Number(payrollForm.overtime_rate_multiplier),
    };
    const errs = validatePayroll(f);
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setToast({ type: 'error', text: 'Please fix the highlighted fields before saving.' }); return; }
    setSavingPayroll(true);
    const { data, error } = await supabase.from('payroll_settings').upsert({ ...f, company_id: companyId }, { onConflict: 'company_id' }).select().single();
    setSavingPayroll(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setPayrollSettings(data);
    setPayrollForm(data);
    setToast({ type: 'success', text: 'Payroll settings saved.' });
  }

  async function saveLeaveSettings() {
    const f = leaveSettingsForm;
    const errs: Record<string, string> = {};
    if (f.min_notice_days < 0) errs.min_notice_days = 'Enter a positive number of days.';
    if (f.max_consecutive_days !== null && f.max_consecutive_days !== '' && Number(f.max_consecutive_days) < 1) errs.max_consecutive_days = 'Enter at least 1 day, or leave blank for no cap.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setToast({ type: 'error', text: 'Please fix the highlighted fields before saving.' }); return; }
    setSavingLeaveSettings(true);
    const payload = {
      company_id: companyId,
      leave_year_start_month: Number(f.leave_year_start_month),
      min_notice_days: Number(f.min_notice_days),
      max_consecutive_days: f.max_consecutive_days === '' || f.max_consecutive_days === null ? null : Number(f.max_consecutive_days),
      allow_negative_balance: f.allow_negative_balance,
    };
    const { data, error } = await supabase.from('leave_settings').upsert(payload, { onConflict: 'company_id' }).select().single();
    setSavingLeaveSettings(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setLeaveSettings(data);
    setLeaveSettingsForm(data);
    setToast({ type: 'success', text: 'Leave rules saved.' });
  }

  async function saveLeaveTypePolicy(leaveType: string) {
    const f = leaveTypeForms[leaveType];
    const errs: Record<string, string> = {};
    if (f.annual_allocation !== null && f.annual_allocation !== '' && Number(f.annual_allocation) < 0) errs[`${leaveType}_allocation`] = 'Enter a positive number of days.';
    if (f.carry_forward_enabled && Number(f.carry_forward_max) < 0) errs[`${leaveType}_carry`] = 'Enter a positive number of days.';
    setErrors((prev) => ({ ...prev, ...errs }));
    if (Object.keys(errs).length > 0) { setToast({ type: 'error', text: 'Please fix the highlighted fields before saving.' }); return; }
    setSavingLeaveType(leaveType);
    const payload = {
      company_id: companyId,
      leave_type: leaveType,
      annual_allocation: f.annual_allocation === '' || f.annual_allocation === null ? null : Number(f.annual_allocation),
      carry_forward_enabled: f.carry_forward_enabled,
      carry_forward_max: Number(f.carry_forward_max) || 0,
      accrual_method: f.accrual_method,
    };
    const { data, error } = await supabase.from('leave_type_policies').upsert(payload, { onConflict: 'company_id,leave_type' }).select().single();
    setSavingLeaveType(null);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setLeaveTypeForms((prev) => ({ ...prev, [leaveType]: data }));
    setToast({ type: 'success', text: `${leaveType} policy saved.` });
  }

  async function saveNotifications() {
    const f = notificationForm;
    const errs: Record<string, string> = {};
    if (f.email_channel_enabled && !validateEmail(f.notification_email)) errs.notification_email = 'Enter a valid email address.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setToast({ type: 'error', text: 'Please fix the highlighted fields before saving.' }); return; }
    setSavingNotifications(true);
    const { data, error } = await supabase.from('notification_settings').upsert({ ...f, company_id: companyId }, { onConflict: 'company_id' }).select().single();
    setSavingNotifications(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setNotificationSettings(data);
    setNotificationForm(data);
    setToast({ type: 'success', text: 'Notification preferences saved.' });
  }

  async function saveWebhook() {
    const f = webhookForm;
    const errs: Record<string, string> = {};
    if (f.enabled && !validateUrl(f.endpoint_url)) errs.endpoint_url = 'Enter a valid URL (starting with http:// or https://).';
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setToast({ type: 'error', text: 'Please fix the highlighted fields before saving.' }); return; }
    setSavingWebhook(true);
    const payload: any = {
      company_id: companyId, enabled: f.enabled, endpoint_url: f.endpoint_url || null,
      send_on_leave_request: f.send_on_leave_request, send_on_advance_request: f.send_on_advance_request,
      send_on_new_employee: f.send_on_new_employee, send_on_payroll_processed: f.send_on_payroll_processed,
    };
    // Only send signing_secret if we already have one — otherwise let the column default generate it.
    if (f.signing_secret) payload.signing_secret = f.signing_secret;
    const { data, error } = await supabase.from('webhook_integrations').upsert(payload, { onConflict: 'company_id' }).select().single();
    setSavingWebhook(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setWebhookSettings(data);
    setWebhookForm(data);
    setToast({ type: 'success', text: 'Webhook settings saved.' });
  }

  function copySigningSecret() {
    if (!webhookForm?.signing_secret) return;
    navigator.clipboard.writeText(webhookForm.signing_secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  async function changePassword() {
    const errs: Record<string, string> = {};
    if (newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters.';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setToast({ type: 'error', text: 'Please fix the highlighted fields before saving.' }); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setNewPassword(''); setConfirmPassword('');
    setToast({ type: 'success', text: 'Password updated.' });
  }

  async function saveIpAllowlist() {
    setSavingIpAllowlist(true);
    const { error } = await supabase.from('company_settings').upsert({ company_id: companyId, allowed_ip: ipAllowlist || null }, { onConflict: 'company_id' });
    setSavingIpAllowlist(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setToast({ type: 'success', text: 'IP allowlist saved.' });
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setToast({ type: 'error', text: 'Logo must be a JPG or PNG file.' }); return; }
    if (file.size > 2 * 1024 * 1024) { setToast({ type: 'error', text: 'Logo must be under 2MB.' }); return; }
    setUploadingLogo(true);
    const path = `company-logos/${companyId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('hrbharat-media').upload(path, file, { upsert: true });
    if (upErr) { setUploadingLogo(false); setToast({ type: 'error', text: upErr.message }); return; }
    const { data: urlData } = supabase.storage.from('hrbharat-media').getPublicUrl(path);
    const { data, error } = await supabase.from('companies').update({ logo_url: urlData.publicUrl }).eq('id', companyId).select().single();
    setUploadingLogo(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setCompany(data);
    setToast({ type: 'success', text: 'Logo updated.' });
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { setToast({ type: 'error', text: 'Documents must be PDF, JPG, or PNG.' }); return; }
    if (file.size > 10 * 1024 * 1024) { setToast({ type: 'error', text: 'File must be under 10MB.' }); return; }
    setUploadingDoc(true);
    const path = `${companyId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('company-documents').upload(path, file);
    if (upErr) { setUploadingDoc(false); setToast({ type: 'error', text: upErr.message }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('company_documents').insert({
      company_id: companyId, doc_type: pendingDocType, file_name: file.name, storage_path: path,
      file_size_bytes: file.size, uploaded_by: user?.id,
    }).select().single();
    setUploadingDoc(false);
    if (error) { setToast({ type: 'error', text: error.message }); return; }
    setDocuments((prev) => [data, ...prev]);
    setToast({ type: 'success', text: 'Document uploaded.' });
    if (docInputRef.current) docInputRef.current.value = '';
  }

  async function handleDocDownload(doc: any) {
    const { data, error } = await supabase.storage.from('company-documents').createSignedUrl(doc.storage_path, 60);
    if (error || !data) { setToast({ type: 'error', text: error?.message || 'Could not generate a download link.' }); return; }
    window.open(data.signedUrl, '_blank');
  }

  const initials = adminName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const docsByType = useMemo(() => {
    const map: Record<string, any> = {};
    for (const d of documents) if (!map[d.doc_type]) map[d.doc_type] = d;
    return map;
  }, [documents]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-[var(--surface-card-hover)] rounded-lg animate-pulse" />
        <div className="h-10 w-full bg-[var(--surface-card-hover)] rounded-lg animate-pulse" />
        <div className="h-96 bg-[var(--surface-card-hover)] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)]">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-6 pb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900 font-sans">Good afternoon, {adminName} 👋</h1>
          <p className="text-xs text-ink-400 font-sans mt-0.5">Home <ChevronRight className="w-3 h-3 inline -mt-0.5" /> Company</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input placeholder="Search employee by name, ID or department..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs font-sans bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-10 py-2 w-72 focus:outline-none focus:ring-1 focus:ring-brand placeholder:text-ink-400" />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-400 font-sans border border-[var(--border-subtle)] rounded px-1">⌘K</span>
          </div>
          <button onClick={() => setLockedNote('Notifications')} className="relative p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)]">
            <Bell className="w-4 h-4" />
          </button>
          <button onClick={() => setLockedNote('Help Center')} className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] text-ink-600 hover:bg-[var(--surface-card-hover)]"><HelpCircle className="w-4 h-4" /></button>
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-[11px] font-semibold text-white font-sans">{initials}</div>
        </div>
      </div>

      <div className="px-6 lg:px-8 pt-4">
        <h2 className="text-2xl font-bold text-ink-900 font-sans">Company</h2>
        <p className="text-sm text-ink-400 font-sans mt-0.5">Manage your company information, settings and configuration.</p>
      </div>

      {/* Settings tabs */}
      <div className="px-6 lg:px-8 mt-5 border-b border-[var(--border-subtle)] overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { if (t.key === 'profile' || t.key === 'business' || t.key === 'payroll' || t.key === 'leave' || t.key === 'notifications' || t.key === 'integrations' || t.key === 'security') { setActiveTab(t.key); } else { setLockedNote(t.label); } }}
                className={`flex items-center gap-1.5 whitespace-nowrap pb-3 text-sm font-sans font-medium border-b-2 transition-colors ${isActive ? 'border-brand text-brand font-semibold' : 'border-transparent text-ink-400 hover:text-ink-600'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {loadError && (
        <div className="mx-6 lg:mx-8 mt-4 px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-sans flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {loadError}
        </div>
      )}
      {toast && (
        <div className={`mx-6 lg:mx-8 mt-4 px-4 py-2.5 rounded-lg border text-xs font-sans flex items-center justify-between gap-2 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
          <span className="flex items-center gap-2">{toast.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}{toast.text}</span>
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="px-6 lg:px-8 pt-6 pb-8 space-y-6">
      {activeTab === 'profile' && (
        <>
        {/* Company Profile + Overview */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-bold text-ink-900 font-sans">Company Profile</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 font-sans">
                <CheckCircle2 className="w-3 h-3" /> {company?.owner_id ? 'Verified' : 'Unverified'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-6">
              <div className="flex flex-col items-center md:items-start gap-2">
                <div className="w-32 h-32 rounded-xl bg-[var(--brand-primary-subtle)] border border-blue-100 flex items-center justify-center overflow-hidden">
                  {company?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo_url} alt="Company logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-10 h-10 text-brand" />
                  )}
                </div>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoChange} />
                <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                  className="flex items-center gap-1.5 text-xs font-sans font-semibold px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] disabled:opacity-50">
                  {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {uploadingLogo ? 'Uploading…' : 'Change Logo'}
                </button>
                <p className="text-[10px] text-ink-400 font-sans">JPG, PNG up to 2MB</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Company Name" error={errors.name}>
                    <input className={inputCls} value={profileForm?.name || ''} onChange={(e) => setProfileForm((f: any) => ({ ...f, name: e.target.value }))} />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input className={inputCls} value={profileForm?.email || ''} onChange={(e) => setProfileForm((f: any) => ({ ...f, email: e.target.value }))} placeholder="info@company.com" />
                  </Field>
                  <Field label="Phone Number" error={errors.phone}>
                    <input className={inputCls} value={profileForm?.phone || ''} onChange={(e) => setProfileForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                  </Field>
                  <Field label="Website" error={errors.website}>
                    <input className={inputCls} value={profileForm?.website || ''} onChange={(e) => setProfileForm((f: any) => ({ ...f, website: e.target.value }))} placeholder="https://company.com" />
                  </Field>
                  <Field label="Industry">
                    <select className={inputCls} value={profileForm?.industry || ''} onChange={(e) => setProfileForm((f: any) => ({ ...f, industry: e.target.value }))}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </Field>
                  <Field label="Company Size">
                    <select className={inputCls} value={profileForm?.company_size || ''} onChange={(e) => setProfileForm((f: any) => ({ ...f, company_size: e.target.value }))}>
                      <option value="">Select size</option>
                      {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Established On">
                    <input type="date" className={inputCls} value={profileForm?.established_on || ''} onChange={(e) => setProfileForm((f: any) => ({ ...f, established_on: e.target.value }))} />
                  </Field>
                  <Field label="PAN Number" error={errors.pan_number}>
                    <input className={`${inputCls} uppercase`} maxLength={10} value={profileForm?.pan_number || ''} onChange={(e) => setProfileForm((f: any) => ({ ...f, pan_number: e.target.value.toUpperCase() }))} placeholder="ABCDE1234F" />
                  </Field>
                </div>
                <button onClick={saveProfile} disabled={savingProfile}
                  className="flex items-center gap-1.5 text-sm font-sans font-semibold px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {savingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* Company Overview */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4">Company Overview</p>
            <div className="space-y-1">
              {[
                { icon: Users, tint: 'bg-blue-50 text-blue-600', label: 'Workforce', value: `${employeeCount} Employee${employeeCount === 1 ? '' : 's'}`, action: () => router.push('/admin') },
                { icon: Building2, tint: 'bg-emerald-50 text-emerald-600', label: 'Departments', value: `${departmentCount} Department${departmentCount === 1 ? '' : 's'}`, action: () => router.push('/admin/analytics') },
                { icon: MapPin, tint: 'bg-violet-50 text-violet-600', label: 'Locations', value: `${locationCount} Location${locationCount === 1 ? '' : 's'}`, action: null },
                { icon: Calendar, tint: 'bg-amber-50 text-amber-600', label: 'Account Created', value: formatDate(company?.created_at), action: null },
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <button key={row.label} onClick={row.action || undefined} disabled={!row.action}
                    className="w-full flex items-center gap-3 py-3 border-b border-[var(--border-subtle)] last:border-0 text-left disabled:cursor-default">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${row.tint}`}><Icon className="w-4 h-4" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-ink-400 font-sans">{row.label}</p>
                      <p className="text-sm font-semibold text-ink-900 font-sans truncate">{row.value}</p>
                    </div>
                    {row.action && <ChevronRight className="w-4 h-4 text-ink-400 shrink-0" />}
                  </button>
                );
              })}
              <div className="flex items-center gap-3 py-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600"><Crown className="w-4 h-4" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-ink-400 font-sans">Subscription Plan</p>
                  <p className="text-sm font-semibold text-ink-900 font-sans truncate capitalize">
                    {subscription?.plan_id ? `${subscription.plan_id} Plan` : 'Not configured'}
                  </p>
                </div>
                {subscription?.status ? (
                  <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-sans shrink-0 capitalize">{subscription.status}</span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-[var(--surface-card-hover)] text-ink-400 border border-[var(--border-subtle)] font-sans shrink-0">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address + Statutory + Documents */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Registered Address */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-brand" /> Registered Address</p>
            <div className="space-y-4">
              <Field label="Address Line 1">
                <input disabled={!editingAddress} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} value={addressForm?.address_line1 || ''} onChange={(e) => setAddressForm((f: any) => ({ ...f, address_line1: e.target.value }))} placeholder="Not configured" />
              </Field>
              <Field label="Address Line 2 (Optional)">
                <input disabled={!editingAddress} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} value={addressForm?.address_line2 || ''} onChange={(e) => setAddressForm((f: any) => ({ ...f, address_line2: e.target.value }))} placeholder="Not configured" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City">
                  <input disabled={!editingAddress} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} value={addressForm?.city || ''} onChange={(e) => setAddressForm((f: any) => ({ ...f, city: e.target.value }))} placeholder="Not configured" />
                </Field>
                <Field label="State">
                  {editingAddress ? (
                    <select className={inputCls} value={addressForm?.state || ''} onChange={(e) => setAddressForm((f: any) => ({ ...f, state: e.target.value }))}>
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input disabled className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} value={addressForm?.state || ''} placeholder="Not configured" readOnly />
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="PIN Code" error={errors.pincode}>
                  <input disabled={!editingAddress} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} value={addressForm?.pincode || ''} onChange={(e) => setAddressForm((f: any) => ({ ...f, pincode: e.target.value }))} placeholder="Not configured" />
                </Field>
                <Field label="Country">
                  <input disabled={!editingAddress} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} value={addressForm?.country || ''} onChange={(e) => setAddressForm((f: any) => ({ ...f, country: e.target.value }))} />
                </Field>
              </div>
              {editingAddress ? (
                <div className="flex gap-2">
                  <button onClick={saveAddress} disabled={savingAddress} className="flex items-center gap-1.5 text-xs font-sans font-semibold px-3 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
                    {savingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} {savingAddress ? 'Saving…' : 'Save Address'}
                  </button>
                  <button onClick={() => setEditingAddress(false)} className="text-xs font-sans font-semibold px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditingAddress(true)} className="flex items-center gap-1.5 text-xs font-sans font-semibold px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]">
                  <FileText className="w-3.5 h-3.5" /> Edit Address
                </button>
              )}
            </div>
          </div>

          {/* Statutory Details */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand" /> Statutory Details</p>
            <div className="space-y-4">
              <Field label="GST Number" error={errors.gst_number}>
                <input disabled={!editingStatutory} className={`${inputCls} uppercase disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} maxLength={15} value={statutoryForm?.gst_number || ''} onChange={(e) => setStatutoryForm((f: any) => ({ ...f, gst_number: e.target.value.toUpperCase() }))} placeholder="Not configured" />
              </Field>
              <Field label="ESI Number">
                <input disabled={!editingStatutory} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} value={statutoryForm?.esi_number || ''} onChange={(e) => setStatutoryForm((f: any) => ({ ...f, esi_number: e.target.value }))} placeholder="Not configured" />
              </Field>
              <Field label="PF Establishment Code">
                <input disabled={!editingStatutory} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} value={statutoryForm?.pf_establishment_code || ''} onChange={(e) => setStatutoryForm((f: any) => ({ ...f, pf_establishment_code: e.target.value }))} placeholder="Not configured" />
              </Field>
              <Field label="Professional Tax Number">
                <input disabled={!editingStatutory} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-600`} value={statutoryForm?.professional_tax_number || ''} onChange={(e) => setStatutoryForm((f: any) => ({ ...f, professional_tax_number: e.target.value }))} placeholder="Not configured" />
              </Field>
              {editingStatutory ? (
                <div className="flex gap-2">
                  <button onClick={saveStatutory} disabled={savingStatutory} className="flex items-center gap-1.5 text-xs font-sans font-semibold px-3 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
                    {savingStatutory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} {savingStatutory ? 'Saving…' : 'Save Details'}
                  </button>
                  <button onClick={() => setEditingStatutory(false)} className="text-xs font-sans font-semibold px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditingStatutory(true)} className="flex items-center gap-1.5 text-xs font-sans font-semibold px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]">
                  <FileText className="w-3.5 h-3.5" /> Edit Details
                </button>
              )}
            </div>
          </div>

          {/* Important Documents */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card flex flex-col">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-brand" /> Important Documents</p>
            <div className="space-y-1 flex-1">
              {DOC_TYPES.filter((d) => d.key !== 'other').map((dt) => {
                const doc = docsByType[dt.key];
                return (
                  <div key={dt.key} className="flex items-center gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                    <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink-900 font-sans truncate">{dt.label}</p>
                      <p className="text-[10px] text-ink-400 font-sans truncate">{doc ? doc.file_name : 'Not uploaded yet'}</p>
                    </div>
                    <button onClick={() => doc && handleDocDownload(doc)} disabled={!doc} aria-label={`Download ${dt.label}`}
                      className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {documents.filter((d) => d.doc_type === 'other').map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                  <span className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink-900 font-sans truncate">Other Document</p>
                    <p className="text-[10px] text-ink-400 font-sans truncate">{doc.file_name}</p>
                  </div>
                  <button onClick={() => handleDocDownload(doc)} aria-label="Download document" className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <select value={pendingDocType} onChange={(e) => setPendingDocType(e.target.value)} className="w-full text-xs font-sans bg-[var(--surface-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-ink-600">
                {DOC_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
              <input ref={docInputRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={handleDocUpload} />
              <button onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-sans font-semibold px-3 py-2.5 rounded-lg border border-brand text-brand hover:bg-[var(--brand-primary-subtle)] disabled:opacity-50">
                {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {uploadingDoc ? 'Uploading…' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
        </>
      )}

      {activeTab === 'business' && (
        <>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-sans leading-relaxed">
            These settings are live and already power your app: <span className="font-semibold">Working Days</span> feeds payroll's per-day salary calculation, and
            <span className="font-semibold"> Office Location &amp; Radius</span> is the geofence employees must check in within on Attendance &amp; Shifts. Changes apply to all employees immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Registration */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-brand" /> Business Registration</p>
            <div className="space-y-4">
              <Field label="Business Type">
                <input list="business-type-options" className={inputCls} value={businessForm?.business_type || ''} onChange={(e) => setBusinessForm((f: any) => ({ ...f, business_type: e.target.value }))} placeholder="e.g. Private Limited" />
                <datalist id="business-type-options">
                  {['Sole Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'One Person Company (OPC)', 'SaaS', 'Other'].map((o) => <option key={o} value={o} />)}
                </datalist>
              </Field>
              <Field label="Working Days per Month" error={errors.working_days}>
                <input type="number" min={1} max={31} className={inputCls} value={businessForm?.working_days ?? ''} onChange={(e) => setBusinessForm((f: any) => ({ ...f, working_days: e.target.value }))} />
                <p className="text-[10px] text-ink-400 font-sans mt-1">Used to compute each employee&apos;s per-day salary in Payroll.</p>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Default Check-in">
                  <input type="time" className={inputCls} value={businessForm?.default_check_in || ''} onChange={(e) => setBusinessForm((f: any) => ({ ...f, default_check_in: e.target.value }))} />
                </Field>
                <Field label="Default Check-out" error={errors.default_check_out}>
                  <input type="time" className={inputCls} value={businessForm?.default_check_out || ''} onChange={(e) => setBusinessForm((f: any) => ({ ...f, default_check_out: e.target.value }))} />
                </Field>
              </div>
            </div>
          </div>

          {/* Office Location & Geofencing */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-brand" /> Office Location &amp; Geofencing</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude" error={errors.office_latitude}>
                  <input type="number" step="0.0000001" className={inputCls} value={businessForm?.office_latitude ?? ''} onChange={(e) => setBusinessForm((f: any) => ({ ...f, office_latitude: e.target.value }))} placeholder="28.6139000" />
                </Field>
                <Field label="Longitude" error={errors.office_longitude}>
                  <input type="number" step="0.0000001" className={inputCls} value={businessForm?.office_longitude ?? ''} onChange={(e) => setBusinessForm((f: any) => ({ ...f, office_longitude: e.target.value }))} placeholder="77.2090000" />
                </Field>
              </div>
              <button onClick={useCurrentLocation} disabled={locating} className="flex items-center gap-1.5 text-xs font-sans font-semibold px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] disabled:opacity-50">
                {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />} {locating ? 'Locating…' : 'Use My Current Location'}
              </button>
              <Field label="Allowed Check-in Radius (metres)" error={errors.allowed_radius_meters}>
                <input type="number" min={10} max={5000} className={inputCls} value={businessForm?.allowed_radius_meters ?? ''} onChange={(e) => setBusinessForm((f: any) => ({ ...f, allowed_radius_meters: e.target.value }))} />
                <p className="text-[10px] text-ink-400 font-sans mt-1">Employees must be within this distance of the office to check in.</p>
              </Field>
              {businessForm?.office_latitude && businessForm?.office_longitude && (
                <a href={`https://www.google.com/maps?q=${businessForm.office_latitude},${businessForm.office_longitude}`} target="_blank" rel="noreferrer" className="text-xs font-sans font-semibold text-brand hover:underline inline-block">
                  View on Google Maps →
                </a>
              )}
            </div>
          </div>
        </div>

        <button onClick={saveBusiness} disabled={savingBusiness}
          className="flex items-center gap-1.5 text-sm font-sans font-semibold px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
          {savingBusiness ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {savingBusiness ? 'Saving…' : 'Save Business Details'}
        </button>
        </>
      )}

      {activeTab === 'payroll' && payrollForm && (
        <>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-sans leading-relaxed">
            {payrollSettings ? 'These values are read from ' : 'This is a new settings table — '}<span className="font-semibold">payroll_settings</span>, which is new and stores the rates shown below.
            {' '}Your payroll processing logic (wherever gross/net salary is currently computed) will need to be updated to read from this table for these numbers to actually apply — saving here does not yet change past or future payroll runs on its own.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-brand" /> Pay Cycle</p>
            <div className="space-y-4">
              <Field label="Pay Cycle">
                <select className={inputCls} value={payrollForm.pay_cycle} onChange={(e) => setPayrollForm((f: any) => ({ ...f, pay_cycle: e.target.value }))}>
                  {['Monthly', 'Bi-Weekly', 'Weekly'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Salary Day of Month" error={errors.pay_day}>
                <input type="number" min={1} max={28} className={inputCls} value={payrollForm.pay_day} onChange={(e) => setPayrollForm((f: any) => ({ ...f, pay_day: e.target.value }))} />
                <p className="text-[10px] text-ink-400 font-sans mt-1">Day salaries are credited each cycle (capped at 28 to stay valid for every month).</p>
              </Field>
              <Field label="Rounding Rule">
                <select className={inputCls} value={payrollForm.rounding_rule} onChange={(e) => setPayrollForm((f: any) => ({ ...f, rounding_rule: e.target.value }))}>
                  <option value="nearest_rupee">Nearest ₹1</option>
                  <option value="nearest_ten">Nearest ₹10</option>
                  <option value="no_rounding">No Rounding</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-ink-900 font-sans flex items-center gap-2"><Wallet className="w-4 h-4 text-brand" /> Overtime</p>
              <Toggle checked={payrollForm.overtime_enabled} onChange={(v) => setPayrollForm((f: any) => ({ ...f, overtime_enabled: v }))} label="Enable overtime pay" />
            </div>
            <Field label="Overtime Rate Multiplier" error={errors.overtime_rate_multiplier}>
              <input type="number" step="0.1" min={1} disabled={!payrollForm.overtime_enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={payrollForm.overtime_rate_multiplier} onChange={(e) => setPayrollForm((f: any) => ({ ...f, overtime_rate_multiplier: e.target.value }))} />
              <p className="text-[10px] text-ink-400 font-sans mt-1">e.g. 1.5 pays overtime hours at 1.5× the regular per-hour rate.</p>
            </Field>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-ink-900 font-sans flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand" /> Provident Fund (PF)</p>
              <Toggle checked={payrollForm.pf_enabled} onChange={(v) => setPayrollForm((f: any) => ({ ...f, pf_enabled: v }))} label="Enable PF" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee Rate (%)" error={errors.pf_employee_rate}>
                <input type="number" step="0.1" disabled={!payrollForm.pf_enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={payrollForm.pf_employee_rate} onChange={(e) => setPayrollForm((f: any) => ({ ...f, pf_employee_rate: e.target.value }))} />
              </Field>
              <Field label="Employer Rate (%)" error={errors.pf_employer_rate}>
                <input type="number" step="0.1" disabled={!payrollForm.pf_enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={payrollForm.pf_employer_rate} onChange={(e) => setPayrollForm((f: any) => ({ ...f, pf_employer_rate: e.target.value }))} />
              </Field>
              <Field label="Wage Ceiling (₹)" error={errors.pf_wage_ceiling}>
                <input type="number" disabled={!payrollForm.pf_enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={payrollForm.pf_wage_ceiling} onChange={(e) => setPayrollForm((f: any) => ({ ...f, pf_wage_ceiling: e.target.value }))} />
              </Field>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-ink-900 font-sans flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand" /> ESI (Employee State Insurance)</p>
              <Toggle checked={payrollForm.esi_enabled} onChange={(v) => setPayrollForm((f: any) => ({ ...f, esi_enabled: v }))} label="Enable ESI" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee Rate (%)" error={errors.esi_employee_rate}>
                <input type="number" step="0.05" disabled={!payrollForm.esi_enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={payrollForm.esi_employee_rate} onChange={(e) => setPayrollForm((f: any) => ({ ...f, esi_employee_rate: e.target.value }))} />
              </Field>
              <Field label="Employer Rate (%)" error={errors.esi_employer_rate}>
                <input type="number" step="0.05" disabled={!payrollForm.esi_enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={payrollForm.esi_employer_rate} onChange={(e) => setPayrollForm((f: any) => ({ ...f, esi_employer_rate: e.target.value }))} />
              </Field>
              <Field label="Wage Ceiling (₹)" error={errors.esi_wage_ceiling}>
                <input type="number" disabled={!payrollForm.esi_enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={payrollForm.esi_wage_ceiling} onChange={(e) => setPayrollForm((f: any) => ({ ...f, esi_wage_ceiling: e.target.value }))} />
              </Field>
            </div>
          </div>

          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-ink-900 font-sans flex items-center gap-2"><Landmark className="w-4 h-4 text-brand" /> Professional Tax</p>
              <Toggle checked={payrollForm.professional_tax_enabled} onChange={(v) => setPayrollForm((f: any) => ({ ...f, professional_tax_enabled: v }))} label="Enable Professional Tax" />
            </div>
            <Field label="Monthly Amount (₹)" error={errors.professional_tax_amount}>
              <input type="number" disabled={!payrollForm.professional_tax_enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={payrollForm.professional_tax_amount} onChange={(e) => setPayrollForm((f: any) => ({ ...f, professional_tax_amount: e.target.value }))} />
              <p className="text-[10px] text-ink-400 font-sans mt-1">Flat monthly deduction, per applicable state slab.</p>
            </Field>
          </div>
        </div>

        <button onClick={savePayroll} disabled={savingPayroll}
          className="flex items-center gap-1.5 text-sm font-sans font-semibold px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
          {savingPayroll ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {savingPayroll ? 'Saving…' : 'Save Payroll Settings'}
        </button>
        </>
      )}

      {activeTab === 'leave' && leaveSettingsForm && (
        <>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-sans leading-relaxed">
            {leaveSettings ? 'These policies are read from ' : 'This is a new settings table — '}<span className="font-semibold">leave_type_policies</span> and <span className="font-semibold">leave_settings</span>.
            {' '}Each employee&apos;s actual running balance still lives on <span className="font-semibold">employees.casual_leave_balance / sick_leave_balance</span> and in <span className="font-semibold">leave_balances</span> — this page defines the policy going forward; it doesn&apos;t retroactively change balances already allocated to existing employees.
          </p>
        </div>

        {/* General leave rules */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
          <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-brand" /> General Leave Rules</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Leave Year Starts In">
              <select className={inputCls} value={leaveSettingsForm.leave_year_start_month} onChange={(e) => setLeaveSettingsForm((f: any) => ({ ...f, leave_year_start_month: e.target.value }))}>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Minimum Notice (days)" error={errors.min_notice_days}>
              <input type="number" min={0} className={inputCls} value={leaveSettingsForm.min_notice_days} onChange={(e) => setLeaveSettingsForm((f: any) => ({ ...f, min_notice_days: e.target.value }))} />
              <p className="text-[10px] text-ink-400 font-sans mt-1">How far in advance an employee must apply for planned leave.</p>
            </Field>
            <Field label="Max Consecutive Days" error={errors.max_consecutive_days}>
              <input type="number" min={1} className={inputCls} value={leaveSettingsForm.max_consecutive_days ?? ''} onChange={(e) => setLeaveSettingsForm((f: any) => ({ ...f, max_consecutive_days: e.target.value }))} placeholder="No cap" />
              <p className="text-[10px] text-ink-400 font-sans mt-1">Leave blank for no cap on a single leave request.</p>
            </Field>
            <div className="flex items-center justify-between border border-[var(--border-subtle)] rounded-lg px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-ink-600 font-sans">Allow Negative Balance</p>
                <p className="text-[10px] text-ink-400 font-sans">Lets employees apply for leave beyond their remaining balance.</p>
              </div>
              <Toggle checked={leaveSettingsForm.allow_negative_balance} onChange={(v) => setLeaveSettingsForm((f: any) => ({ ...f, allow_negative_balance: v }))} label="Allow negative leave balance" />
            </div>
          </div>
          <button onClick={saveLeaveSettings} disabled={savingLeaveSettings}
            className="mt-4 flex items-center gap-1.5 text-sm font-sans font-semibold px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
            {savingLeaveSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {savingLeaveSettings ? 'Saving…' : 'Save Leave Rules'}
          </button>
        </div>

        {/* Per leave-type policy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {['Casual Leave', 'Sick Leave', 'Unpaid Leave'].map((leaveType) => {
            const f = leaveTypeForms[leaveType];
            if (!f) return null;
            const isUnpaid = leaveType === 'Unpaid Leave';
            const tint = leaveType === 'Casual Leave' ? 'bg-blue-50 text-blue-600' : leaveType === 'Sick Leave' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500';
            return (
              <div key={leaveType} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card flex flex-col">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tint}`}><Calendar className="w-4 h-4" /></span>
                  <p className="text-sm font-bold text-ink-900 font-sans">{leaveType}</p>
                </div>
                <div className="space-y-4 flex-1">
                  {isUnpaid ? (
                    <p className="text-xs text-ink-400 font-sans italic">Unpaid Leave has no annual allocation or balance — employees can request it whenever paid leave is exhausted.</p>
                  ) : (
                    <Field label="Annual Allocation (days)" error={errors[`${leaveType}_allocation`]}>
                      <input type="number" min={0} className={inputCls} value={f.annual_allocation ?? ''} onChange={(e) => setLeaveTypeForms((prev) => ({ ...prev, [leaveType]: { ...prev[leaveType], annual_allocation: e.target.value } }))} />
                    </Field>
                  )}
                  {!isUnpaid && (
                    <>
                      <Field label="Accrual Method">
                        <select className={inputCls} value={f.accrual_method} onChange={(e) => setLeaveTypeForms((prev) => ({ ...prev, [leaveType]: { ...prev[leaveType], accrual_method: e.target.value } }))}>
                          <option value="annual">Full amount at year start</option>
                          <option value="monthly">Accrued monthly</option>
                        </select>
                      </Field>
                      <div className="flex items-center justify-between border border-[var(--border-subtle)] rounded-lg px-3 py-2.5">
                        <p className="text-xs font-semibold text-ink-600 font-sans">Carry Forward</p>
                        <Toggle checked={f.carry_forward_enabled} onChange={(v) => setLeaveTypeForms((prev) => ({ ...prev, [leaveType]: { ...prev[leaveType], carry_forward_enabled: v } }))} label={`Carry forward ${leaveType}`} />
                      </div>
                      {f.carry_forward_enabled && (
                        <Field label="Max Carry-Forward (days)" error={errors[`${leaveType}_carry`]}>
                          <input type="number" min={0} className={inputCls} value={f.carry_forward_max ?? 0} onChange={(e) => setLeaveTypeForms((prev) => ({ ...prev, [leaveType]: { ...prev[leaveType], carry_forward_max: e.target.value } }))} />
                        </Field>
                      )}
                    </>
                  )}
                </div>
                {!isUnpaid && (
                  <button onClick={() => saveLeaveTypePolicy(leaveType)} disabled={savingLeaveType === leaveType}
                    className="mt-4 flex items-center justify-center gap-1.5 text-xs font-sans font-semibold px-3 py-2.5 rounded-lg border border-brand text-brand hover:bg-[var(--brand-primary-subtle)] disabled:opacity-50">
                    {savingLeaveType === leaveType ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} {savingLeaveType === leaveType ? 'Saving…' : `Save ${leaveType} Policy`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}

      {activeTab === 'notifications' && notificationForm && (
        <>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-sans leading-relaxed">
            These preferences save for real to <span className="font-semibold">notification_settings</span>. But there&apos;s no email/SMS provider connected in this project yet, and the bell icon in the header is still a UI placeholder —
            {' '}so nothing will actually be sent or shown until that delivery layer is built. This page defines what people will get once it exists.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-1 flex items-center gap-2"><Bell className="w-4 h-4 text-brand" /> Notification Events</p>
            <p className="text-[10px] text-ink-400 font-sans mb-4">Choose what you want to be notified about. Each of these maps to a real event already happening in HRBharat.</p>
            <div className="space-y-1">
              {[
                { key: 'notify_leave_requests', label: 'New Leave Request', sub: 'When an employee submits a leave request.' },
                { key: 'notify_advance_requests', label: 'New Advance Request', sub: 'When an employee requests a salary advance.' },
                { key: 'notify_new_employee', label: 'New Employee Added', sub: 'When an employee record is created.' },
                { key: 'notify_payroll_processed', label: 'Payroll Processed', sub: 'When a payroll run completes for the month.' },
                { key: 'notify_attendance_anomalies', label: 'Attendance Anomalies', sub: 'Late check-ins or missed check-outs.' },
                { key: 'notify_low_leave_balance', label: 'Low Leave Balance', sub: 'When an employee is close to exhausting their balance.' },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-900 font-sans">{row.label}</p>
                    <p className="text-[10px] text-ink-400 font-sans">{row.sub}</p>
                  </div>
                  <Toggle checked={notificationForm[row.key]} onChange={(v) => setNotificationForm((f: any) => ({ ...f, [row.key]: v }))} label={row.label} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
              <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-brand" /> Delivery Channels</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between border border-[var(--border-subtle)] rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-ink-600 font-sans">Email</p>
                    <p className="text-[10px] text-ink-400 font-sans">Requires an email provider to be connected — not wired up yet.</p>
                  </div>
                  <Toggle checked={notificationForm.email_channel_enabled} onChange={(v) => setNotificationForm((f: any) => ({ ...f, email_channel_enabled: v }))} label="Enable email notifications" />
                </div>
                <Field label="Notification Email" error={errors.notification_email}>
                  <input disabled={!notificationForm.email_channel_enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={notificationForm.notification_email || ''} onChange={(e) => setNotificationForm((f: any) => ({ ...f, notification_email: e.target.value }))} placeholder="you@company.com" />
                </Field>
                <div className="flex items-center justify-between border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 opacity-60">
                  <div>
                    <p className="text-xs font-semibold text-ink-600 font-sans">In-App</p>
                    <p className="text-[10px] text-ink-400 font-sans">The notification bell UI exists but isn&apos;t connected to real events yet.</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-[var(--surface-card-hover)] text-ink-400 border border-[var(--border-subtle)] font-sans">Not live</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink-900 font-sans">Weekly Summary Email</p>
                  <p className="text-[10px] text-ink-400 font-sans mt-1">A digest of attendance, leave, and payroll activity, sent once a week.</p>
                </div>
                <Toggle checked={notificationForm.weekly_summary_email} onChange={(v) => setNotificationForm((f: any) => ({ ...f, weekly_summary_email: v }))} label="Weekly summary email" />
              </div>
            </div>

            <button onClick={saveNotifications} disabled={savingNotifications}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-sans font-semibold px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
              {savingNotifications ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {savingNotifications ? 'Saving…' : 'Save Notification Preferences'}
            </button>
          </div>
        </div>
        </>
      )}

      {activeTab === 'integrations' && webhookForm && (
        <>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-sans leading-relaxed">
            HRBharat has no OAuth apps or provider credentials connected for any third-party service yet, so a real &quot;Connect&quot; flow for WhatsApp, Slack, Google Calendar, etc. isn&apos;t possible from here.
            {' '}The one integration below is genuinely functional to configure: a custom outbound webhook. Like Notifications, it saves for real but needs backend trigger code (not present in this project) to actually fire.
          </p>
        </div>

        {/* Custom Webhook — the one real integration */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-ink-900 font-sans flex items-center gap-2"><Webhook className="w-4 h-4 text-brand" /> Custom Webhook</p>
            <Toggle checked={webhookForm.enabled} onChange={(v) => setWebhookForm((f: any) => ({ ...f, enabled: v }))} label="Enable webhook" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Field label="Endpoint URL" error={errors.endpoint_url}>
                <input disabled={!webhookForm.enabled} className={`${inputCls} disabled:bg-[var(--surface-card-hover)] disabled:text-ink-400`} value={webhookForm.endpoint_url || ''} onChange={(e) => setWebhookForm((f: any) => ({ ...f, endpoint_url: e.target.value }))} placeholder="https://your-system.com/webhooks/hrbharat" />
              </Field>
              {webhookForm.signing_secret ? (
                <Field label="Signing Secret">
                  <div className="flex items-center gap-2">
                    <input readOnly className={`${inputCls} font-mono text-xs`} value={webhookForm.signing_secret} />
                    <button onClick={copySigningSecret} aria-label="Copy signing secret" className="p-2.5 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)] shrink-0">
                      {secretCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-ink-400 font-sans mt-1">Used to verify payloads actually came from HRBharat once delivery is implemented.</p>
                </Field>
              ) : (
                <p className="text-[10px] text-ink-400 font-sans italic">A signing secret will be generated automatically the first time you save.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-600 font-sans mb-2">Events to Send</p>
              <div className="space-y-1">
                {[
                  { key: 'send_on_leave_request', label: 'New Leave Request' },
                  { key: 'send_on_advance_request', label: 'New Advance Request' },
                  { key: 'send_on_new_employee', label: 'New Employee Added' },
                  { key: 'send_on_payroll_processed', label: 'Payroll Processed' },
                ].map((row) => (
                  <div key={row.key} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                    <p className="text-xs text-ink-600 font-sans">{row.label}</p>
                    <Toggle checked={webhookForm[row.key]} onChange={(v) => setWebhookForm((f: any) => ({ ...f, [row.key]: v }))} label={row.label} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={saveWebhook} disabled={savingWebhook}
            className="mt-5 flex items-center gap-1.5 text-sm font-sans font-semibold px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
            {savingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {savingWebhook ? 'Saving…' : 'Save Webhook'}
          </button>
        </div>

        {/* Available third-party integrations — honest placeholders, no fake "connected" state */}
        <div>
          <p className="text-sm font-bold text-ink-900 font-sans mb-1">Available Integrations</p>
          <p className="text-[10px] text-ink-400 font-sans mb-4">These aren&apos;t connected yet — each needs a real provider account and OAuth setup on HRBharat&apos;s side first.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'WhatsApp Business', desc: 'Send payslips and leave approvals over WhatsApp.', icon: MessageCircle, tint: 'bg-emerald-50 text-emerald-600' },
              { name: 'Google Calendar', desc: 'Sync approved leave onto employee calendars.', icon: Calendar, tint: 'bg-blue-50 text-blue-600' },
              { name: 'Slack', desc: 'Post leave and attendance alerts to a channel.', icon: Hash, tint: 'bg-violet-50 text-violet-600' },
              { name: 'Tally / Zoho Books', desc: 'Export payroll journal entries automatically.', icon: FileSpreadsheet, tint: 'bg-amber-50 text-amber-600' },
              { name: 'Biometric Attendance', desc: 'Pull check-in/out data from a biometric device.', icon: Fingerprint, tint: 'bg-rose-50 text-rose-600' },
            ].map((intg) => {
              const Icon = intg.icon;
              return (
                <div key={intg.name} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-card flex flex-col">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mb-3 ${intg.tint}`}><Icon className="w-4 h-4" /></span>
                  <p className="text-sm font-semibold text-ink-900 font-sans">{intg.name}</p>
                  <p className="text-[10px] text-ink-400 font-sans mt-1 flex-1">{intg.desc}</p>
                  <button onClick={() => setLockedNote(intg.name)} className="mt-3 text-xs font-sans font-semibold px-3 py-2 rounded-lg border border-[var(--border-subtle)] text-ink-600 hover:bg-[var(--surface-card-hover)]">Connect</button>
                </div>
              );
            })}
          </div>
        </div>
        </>
      )}

      {activeTab === 'security' && (
        <>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-sans leading-relaxed">
            Password changes and the activity feed below use your real Supabase Auth session and <span className="font-semibold">system_audit_logs</span> — both genuinely functional.
            {' '}Things like enforced password policy, 2FA, and session timeout are controlled at the Supabase Auth project level, not by this app&apos;s database, so they aren&apos;t shown here to avoid implying a toggle that wouldn&apos;t actually do anything.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Password */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><KeyRound className="w-4 h-4 text-brand" /> Change Password</p>
            <div className="space-y-4">
              <Field label="New Password" error={errors.newPassword}>
                <input type="password" className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
              </Field>
              <Field label="Confirm New Password" error={errors.confirmPassword}>
                <input type="password" className={inputCls} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </Field>
              <button onClick={changePassword} disabled={savingPassword || !newPassword}
                className="flex items-center gap-1.5 text-sm font-sans font-semibold px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {savingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>

          {/* Account Access */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><Smartphone className="w-4 h-4 text-brand" /> Account Access</p>
            <div className="space-y-1">
              {[
                { label: 'Signed In As', value: authUser?.email || '—' },
                { label: 'Last Sign-in', value: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                { label: 'Account Created', value: authUser?.created_at ? formatDate(authUser.created_at) : '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                  <p className="text-xs text-ink-400 font-sans">{row.label}</p>
                  <p className="text-xs font-semibold text-ink-900 font-sans">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* IP Allowlist */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand" /> IP Allowlist</p>
            <p className="text-[10px] text-ink-400 font-sans mb-4">
              Stored on <span className="font-mono">company_settings.allowed_ip</span> — this looks like a parallel table to the geofencing fields already on Business Details, so it&apos;s worth confirming which one your app actually enforces against before relying on this.
            </p>
            <Field label="Allowed IP Addresses">
              <textarea rows={3} className={inputCls} value={ipAllowlist} onChange={(e) => setIpAllowlist(e.target.value)} placeholder="e.g. 203.0.113.4, 203.0.113.5 — leave blank to allow any IP" />
            </Field>
            <button onClick={saveIpAllowlist} disabled={savingIpAllowlist}
              className="mt-4 flex items-center gap-1.5 text-sm font-sans font-semibold px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white disabled:opacity-50">
              {savingIpAllowlist ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {savingIpAllowlist ? 'Saving…' : 'Save Allowlist'}
            </button>
          </div>

          {/* Recent Security Activity */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-card">
            <p className="text-sm font-bold text-ink-900 font-sans mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-brand" /> Recent Activity</p>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-ink-400 font-sans italic text-center py-8">No activity recorded yet.</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                    <span className="w-7 h-7 rounded-lg bg-[var(--surface-card-hover)] flex items-center justify-center shrink-0 mt-0.5"><Activity className="w-3.5 h-3.5 text-ink-600" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ink-900 font-sans leading-snug">{log.description}</p>
                      <p className="text-[10px] text-ink-400 font-sans mt-0.5">{log.actor_name} · {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}

        {/* Info bar */}
        <div className="bg-[var(--brand-primary-subtle)] border border-blue-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-brand shrink-0" />
            <p className="text-xs text-ink-600 font-sans">Company information is used for payroll processing, statutory compliance and official communications.</p>
          </div>
          <p className="text-xs font-sans text-ink-600 shrink-0">Need help? <button onClick={() => setLockedNote('Contact Support')} className="font-semibold text-brand hover:underline">Contact support</button></p>
        </div>
      </div>

      {lockedNote && <LockedFeatureNote title={lockedNote} onClose={() => setLockedNote(null)} />}
    </div>
  );
}