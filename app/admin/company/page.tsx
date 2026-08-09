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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingStatutory, setSavingStatutory] = useState(false);
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
      const { data: profile } = await supabase.from('profiles').select('company_id, role, full_name').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
      if (profile.full_name) setAdminName(profile.full_name.split(' ')[0]);
      const cid = profile.company_id;
      setCompanyId(cid);

      const [companyRes, empRes, branchRes, subRes, docRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', cid).single(),
        supabase.from('employees').select('id, department').eq('company_id', cid),
        supabase.from('branches').select('id').eq('company_id', cid),
        supabase.from('subscriptions').select('plan_id, status, current_period_end').eq('company_id', cid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('company_documents').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
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
      }
      if (empRes.data) {
        setEmployeeCount(empRes.data.length);
        setDepartmentCount(new Set(empRes.data.map((e) => e.department).filter(Boolean)).size);
      }
      if (branchRes.data) setLocationCount(branchRes.data.length);
      if (subRes.data) setSubscription(subRes.data);
      if (docRes.data) setDocuments(docRes.data);
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
                onClick={() => { if (t.key === 'profile') { setActiveTab('profile'); } else { setLockedNote(t.label); } }}
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