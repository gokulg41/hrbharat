"use client";

import { useState, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Navigation, Loader2, ChevronRight } from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  const [submitting, setSubmitting] = useState(false);
  const [fetchingGeo, setFetchingGeo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    setFetchingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setFetchingGeo(false);
      },
      (error) => {
        alert(`Could not detect location: ${error.message}`);
        setFetchingGeo(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;
    setSubmitting(true);
    setErrorMessage(null);

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // 1. Check if pre-registered as an employee
      const { data: preRegisteredEmployee } = await supabase
        .from('employees')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      // 2. Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError) {
        setErrorMessage(authError.message);
        setSubmitting(false);
        return;
      }

      if (!authData?.user) {
        setErrorMessage("Account creation failed. Please try again.");
        setSubmitting(false);
        return;
      }

      let assignedRole = 'admin';
      let finalCompanyId = '';

      if (preRegisteredEmployee) {
        // ── EMPLOYEE: link to existing company ──────────────────────
        assignedRole = 'employee';
        finalCompanyId = preRegisteredEmployee.company_id;

        const { error: linkError } = await supabase
          .from('employees')
          .update({ id: authData.user.id })
          .eq('id', preRegisteredEmployee.id);

        if (linkError) {
          setErrorMessage(`Could not link employee account: ${linkError.message}`);
          setSubmitting(false);
          return;
        }
      } else {
        // ── ADMIN: create a new company ──────────────────────────────
        assignedRole = 'admin';
        const freshCompanyId = crypto.randomUUID();
        finalCompanyId = freshCompanyId;

        const { error: companyError } = await supabase
          .from('companies')
          .insert({
            id: freshCompanyId,
            name: companyName || `${fullName}'s Company`,
            owner_id: authData.user.id,
            business_type: "Digital Products & SaaS",
            address: "Remote / Digital Workspace",
            phone: "0000000000",
            office_latitude: latitude ? parseFloat(latitude) : 28.6139,
            office_longitude: longitude ? parseFloat(longitude) : 77.2090,
            allowed_radius_meters: radius ? parseInt(radius) : 100,
          });

        if (companyError) {
          setErrorMessage(`Could not create company: ${companyError.message}`);
          setSubmitting(false);
          return;
        }
      }

      // 3. Upsert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: authData.user.id, full_name: fullName, role: assignedRole, company_id: finalCompanyId },
          { onConflict: 'id' }
        );

      if (profileError) {
        setErrorMessage(`Profile error: ${profileError.message}`);
        setSubmitting(false);
        return;
      }

      // 4. ── REDIRECT BY ROLE ───────────────────────────────────────────
      if (assignedRole === 'employee') {
        router.push('/employee');
      } else {
        // Admin → plan selection, preserving ?plan= from landing page CTA
        const planParam = searchParams.get('plan');
        router.push(planParam ? `/signup/plan?plan=${planParam}` : '/signup/plan');
      }

    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full text-sm px-3 py-2 border border-[#e9e9e7] rounded-md bg-white text-[#37352f] placeholder:text-[#c1c0bb] focus:outline-none focus:ring-2 focus:ring-[#2eaadc]/30 focus:border-[#2eaadc] transition-all";

  const labelClass = "block text-xs font-medium text-[#787774] mb-1.5";

  return (
    <div className="min-h-screen bg-white font-sans text-[#37352f] flex">

      {/* ── LEFT PANEL — branding ── */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#f7f6f3] border-r border-[#e9e9e7] flex-col justify-between p-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#37352f] flex items-center justify-center shrink-0">
            <span className="text-white text-[9px] font-bold">HB</span>
          </div>
          <span className="font-semibold text-[#37352f]">HRBharat</span>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#37352f] leading-snug">
              The simplest way to manage your team in India.
            </h2>
            <p className="mt-3 text-sm text-[#787774] leading-relaxed">
              Attendance, payroll, leave, and compliance — all in one clean dashboard built for Indian SMBs.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "7-day free trial, no credit card needed",
              "Geo-verified selfie check-in",
              "Automated salary slips with PF & ESIC",
              "Leave management & approval workflows",
            ].map((point) => (
              <div key={point} className="flex items-center gap-2.5 text-sm text-[#37352f]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0f7b43] shrink-0" />
                {point}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#c1c0bb]">© 2026 HRBharat</p>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-8">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">HB</span>
            </div>
            <span className="font-semibold text-sm text-[#37352f]">HRBharat</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-[#9b9a97]">
              Already have one?{' '}
              <Link href="/login" className="text-[#37352f] font-medium underline underline-offset-2 hover:no-underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="text-sm px-4 py-2.5 rounded-md border bg-[#fdecea] border-[#f5c0bb] text-[#d44c47]">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Personal details */}
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Rajesh Kumar" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Work Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="rajesh@company.in" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" className={inputClass} />
              </div>
            </div>

            <hr className="border-[#e9e9e7]" />

            {/* Company section */}
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  Company Name
                  <span className="ml-1.5 text-[#c1c0bb] font-normal">(skip if you're an employee)</span>
                </label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Monk Digital Media" className={inputClass} />
              </div>

              {/* Geofence block */}
              <div className="rounded-md border border-[#e9e9e7] bg-[#f7f6f3] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#9b9a97] uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Office Location
                  </p>
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={fetchingGeo}
                    className="flex items-center gap-1.5 text-xs text-[#787774] hover:text-[#37352f] border border-[#e9e9e7] bg-white px-2.5 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Navigation className={`w-3 h-3 ${fetchingGeo ? 'animate-spin' : ''}`} />
                    {fetchingGeo ? 'Detecting…' : 'Detect my location'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Latitude</label>
                    <input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="28.6139" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Longitude</label>
                    <input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="77.2090" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Geofence Radius (meters)</label>
                  <input type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="100" className={inputClass} />
                </div>
              </div>

              <p className="text-xs text-[#9b9a97] leading-relaxed">
                If you're an employee, leave the company fields blank. Your account will auto-link based on your email.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-md bg-[#37352f] text-white hover:bg-[#2d2c28] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              ) : (
                <>Create account <ChevronRight className="w-4 h-4" /></>
              )}
            </button>

          </form>

          <p className="text-xs text-center text-[#c1c0bb]">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="underline hover:text-[#787774]">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-[#787774]">Privacy Policy</Link>
          </p>

        </div>
      </div>
    </div>
  );
}

// useSearchParams needs Suspense boundary in Next.js App Router
export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
