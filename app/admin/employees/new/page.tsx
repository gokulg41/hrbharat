'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, User, Briefcase, IndianRupee, Landmark, ChevronDown, ChevronUp, CheckCircle2, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { onboardEmployeeAction } from '@/lib/actions';

/* ─────────────────────────────────────────────
   Add Employee — real onboarding form, backed by the actual
   `employees` table schema (verified against the live Supabase
   project). Required-in-db columns with no default are marked *:
   full_name, phone_number, department, designation, monthly_salary,
   joining_date. Everything else is optional and left null if unset.
───────────────────────────────────────────── */

const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Intern'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function generateEmployeeCode(companyPrefix: string) {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${companyPrefix}-${rand}`;
}

interface FormState {
  full_name: string;
  phone_number: string;
  email: string;
  date_of_birth: string;
  emergency_contact: string;
  employee_code: string;
  department: string;
  designation: string;
  employment_type: string;
  joining_date: string;
  probation_end_date: string;
  monthly_salary: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
}

const INITIAL_STATE: FormState = {
  full_name: '',
  phone_number: '',
  email: '',
  date_of_birth: '',
  emergency_contact: '',
  employee_code: '',
  department: '',
  designation: '',
  employment_type: 'Full-Time',
  joining_date: todayISO(),
  probation_end_date: '',
  monthly_salary: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
};

const REQUIRED_FIELDS: (keyof FormState)[] = [
  'full_name',
  'phone_number',
  'email',
  'department',
  'designation',
  'joining_date',
  'monthly_salary',
];

const inputClass =
  'w-full px-3.5 py-2.5 text-sm font-sans text-ink-900 bg-surface-card border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-ink-400';
const labelClass = 'text-xs font-sans font-medium text-ink-600 block mb-1.5';

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className={labelClass}>
        {label} {required && <span className="text-status-danger">*</span>}
      </span>
      {children}
      {error && <p className="text-[11px] text-status-danger font-sans mt-1">{error}</p>}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <h3 className="text-sm font-semibold text-ink-900 font-sans">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function AddEmployeePage() {
  const router = useRouter();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyPrefix, setCompanyPrefix] = useState('EMP');
  const [identityLoading, setIdentityLoading] = useState(true);

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdEmployee, setCreatedEmployee] = useState<{
    fullName: string;
    email: string;
    employeeCode: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadIdentity() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIdentityLoading(false);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        const { data: company } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
        if (company?.name) {
          const initials = company.name
            .split(' ')
            .map((w: string) => w[0])
            .filter(Boolean)
            .slice(0, 3)
            .join('')
            .toUpperCase();
          setCompanyPrefix(initials || 'EMP');
        }
      }
      setIdentityLoading(false);
    }
    loadIdentity();
  }, []);

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    REQUIRED_FIELDS.forEach((field) => {
      if (!form[field] || !form[field].trim()) next[field] = 'This field is required';
    });
    if (form.monthly_salary && (isNaN(Number(form.monthly_salary)) || Number(form.monthly_salary) < 0)) {
      next.monthly_salary = 'Enter a valid salary amount';
    }
    if (form.phone_number && !/^\+?[0-9\s-]{7,15}$/.test(form.phone_number.trim())) {
      next.phone_number = 'Enter a valid phone number';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!companyId) {
      setSubmitError("Couldn't determine your company. Try refreshing the page.");
      return;
    }
    if (!validate()) return;

    setSubmitting(true);

    const employeeCode = form.employee_code.trim() || generateEmployeeCode(companyPrefix);

    const result = await onboardEmployeeAction({
      companyId,
      fullName: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone_number.trim(),
      designation: form.designation.trim(),
      department: form.department.trim(),
      monthlySalary: Number(form.monthly_salary),
      employeeCode,
      bankAccount: form.account_number.trim() || null,
      ifscCode: form.ifsc_code.trim() || null,
      joiningDate: form.joining_date,
      dateOfBirth: form.date_of_birth || null,
      emergencyContact: form.emergency_contact.trim() || null,
      employmentType: form.employment_type,
      probationEndDate: form.probation_end_date || null,
      bankName: form.bank_name.trim() || null,
      upiId: form.upi_id.trim() || null,
    });

    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error || 'Something went wrong while onboarding this employee.');
      return;
    }

    setCreatedEmployee({
      fullName: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      employeeCode: employeeCode.toUpperCase(),
      tempPassword: `Temp@${employeeCode.trim()}`,
    });
  }

  function handleCopyCredentials() {
    if (!createdEmployee) return;
    const text = `Email: ${createdEmployee.email}\nTemporary Password: ${createdEmployee.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (createdEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface-card border border-border-subtle rounded-xl p-6 md:p-8 space-y-5">
          <div className="flex flex-col items-center text-center gap-2">
            <span className="w-12 h-12 rounded-full bg-status-success-bg text-status-success flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </span>
            <h2 className="text-lg font-bold text-ink-900 font-sans">Employee added</h2>
            <p className="text-sm text-ink-400 font-sans">
              {createdEmployee.fullName} ({createdEmployee.employeeCode}) can now sign in with the credentials below.
            </p>
          </div>

          <div className="bg-status-warning-bg border border-status-warning/20 rounded-lg p-4 space-y-2.5">
            <div>
              <p className="text-[11px] font-sans font-medium text-ink-600">Login Email</p>
              <p className="text-sm font-mono text-ink-900 break-all">{createdEmployee.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-sans font-medium text-ink-600">Temporary Password</p>
              <p className="text-sm font-mono text-ink-900">{createdEmployee.tempPassword}</p>
            </div>
            <p className="text-[11px] font-sans text-status-warning pt-1">
              Share this securely — the employee will be asked to set a new password on first login.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-sans font-medium text-ink-600 border border-border-subtle hover:bg-surface-card-hover transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Credentials'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="flex-1 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-sans font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface-card border-b border-border-subtle">
        <div className="flex items-center gap-3 px-4 md:px-8 h-[76px]">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-600 hover:bg-surface-card-hover transition-colors cursor-pointer shrink-0"
            aria-label="Back to Employees"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-ink-900 font-sans truncate">Add New Employee</h1>
            <p className="text-xs text-ink-400 font-sans mt-0.5">
              Employees <span className="mx-1 text-ink-400">›</span> <span className="text-ink-600">Add New Employee</span>
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 md:px-8 py-6 pb-16 max-w-3xl mx-auto space-y-5">
        {submitError && (
          <div className="bg-status-danger-bg border border-status-danger/20 text-status-danger text-sm font-sans rounded-lg px-4 py-3">
            Couldn&rsquo;t save this employee: {submitError}
          </div>
        )}

        <SectionCard icon={User} title="Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required error={errors.full_name}>
              <input
                value={form.full_name}
                onChange={(e) => setField('full_name', e.target.value)}
                placeholder="e.g. Arjun Singh"
                className={`${inputClass} ${errors.full_name ? 'border-status-danger' : 'border-border-subtle'}`}
              />
            </Field>
            <Field label="Phone Number" required error={errors.phone_number}>
              <input
                value={form.phone_number}
                onChange={(e) => setField('phone_number', e.target.value)}
                placeholder="e.g. 98765 43210"
                className={`${inputClass} ${errors.phone_number ? 'border-status-danger' : 'border-border-subtle'}`}
              />
            </Field>
            <Field label="Email" required error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="name@company.com"
                className={`${inputClass} ${errors.email ? 'border-status-danger' : 'border-border-subtle'}`}
              />
            </Field>
            <Field label="Date of Birth">
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setField('date_of_birth', e.target.value)}
                className={`${inputClass} border-border-subtle`}
              />
            </Field>
            <Field label="Emergency Contact">
              <input
                value={form.emergency_contact}
                onChange={(e) => setField('emergency_contact', e.target.value)}
                placeholder="Name and phone number"
                className={`${inputClass} border-border-subtle`}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={Briefcase} title="Employment Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Employee ID">
              <input
                value={form.employee_code}
                onChange={(e) => setField('employee_code', e.target.value)}
                placeholder="Auto-generated if left blank"
                className={`${inputClass} border-border-subtle`}
              />
            </Field>
            <Field label="Employment Type" required>
              <select
                value={form.employment_type}
                onChange={(e) => setField('employment_type', e.target.value)}
                className={`${inputClass} border-border-subtle cursor-pointer`}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department" required error={errors.department}>
              <input
                value={form.department}
                onChange={(e) => setField('department', e.target.value)}
                placeholder="e.g. Engineering"
                className={`${inputClass} ${errors.department ? 'border-status-danger' : 'border-border-subtle'}`}
              />
            </Field>
            <Field label="Designation" required error={errors.designation}>
              <input
                value={form.designation}
                onChange={(e) => setField('designation', e.target.value)}
                placeholder="e.g. Software Engineer"
                className={`${inputClass} ${errors.designation ? 'border-status-danger' : 'border-border-subtle'}`}
              />
            </Field>
            <Field label="Joining Date" required error={errors.joining_date}>
              <input
                type="date"
                value={form.joining_date}
                onChange={(e) => setField('joining_date', e.target.value)}
                className={`${inputClass} ${errors.joining_date ? 'border-status-danger' : 'border-border-subtle'}`}
              />
            </Field>
            <Field label="Probation End Date">
              <input
                type="date"
                value={form.probation_end_date}
                onChange={(e) => setField('probation_end_date', e.target.value)}
                className={`${inputClass} border-border-subtle`}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={IndianRupee} title="Compensation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Monthly Salary (₹)" required error={errors.monthly_salary}>
              <input
                inputMode="numeric"
                value={form.monthly_salary}
                onChange={(e) => setField('monthly_salary', e.target.value)}
                placeholder="e.g. 45000"
                className={`${inputClass} ${errors.monthly_salary ? 'border-status-danger' : 'border-border-subtle'}`}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Bank details — optional, collapsed by default */}
        <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBankDetails((v) => !v)}
            className="w-full flex items-center justify-between p-5 md:p-6 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4" />
              </span>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-ink-900 font-sans">Bank Details</h3>
                <p className="text-xs text-ink-400 font-sans">Optional — can be added later</p>
              </div>
            </div>
            {showBankDetails ? <ChevronUp className="w-4 h-4 text-ink-400" /> : <ChevronDown className="w-4 h-4 text-ink-400" />}
          </button>
          {showBankDetails && (
            <div className="px-5 md:px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border-subtle pt-4">
              <Field label="Bank Name">
                <input
                  value={form.bank_name}
                  onChange={(e) => setField('bank_name', e.target.value)}
                  className={`${inputClass} border-border-subtle`}
                />
              </Field>
              <Field label="Account Number">
                <input
                  value={form.account_number}
                  onChange={(e) => setField('account_number', e.target.value)}
                  className={`${inputClass} border-border-subtle font-mono`}
                />
              </Field>
              <Field label="IFSC Code">
                <input
                  value={form.ifsc_code}
                  onChange={(e) => setField('ifsc_code', e.target.value.toUpperCase())}
                  className={`${inputClass} border-border-subtle font-mono`}
                />
              </Field>
              <Field label="UPI ID">
                <input
                  value={form.upi_id}
                  onChange={(e) => setField('upi_id', e.target.value)}
                  placeholder="name@bank"
                  className={`${inputClass} border-border-subtle`}
                />
              </Field>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="px-4 py-2.5 rounded-lg text-sm font-sans font-medium text-ink-600 border border-border-subtle hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || identityLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-sans font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Saving…' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}