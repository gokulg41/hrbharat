"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Navigation } from 'lucide-react';

export default function SmartRegistrationGate() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  // Geofencing Location States
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100'); // Default to 100 meters
  
  const [submitting, setSubmitting] = useState(false);
  const [fetchingGeo, setFetchingGeo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to instantly grab current live coordinates from browser
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser engine.");
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
        alert(`Location detection failed: ${error.message}. Please input manually.`);
        setFetchingGeo(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // THIS IS THE MAIN ENTRY FUNCTION LOOP THAT HANDLES YOUR SUBMISSION PIPELINE
  const handleRegisterPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;
    setSubmitting(true);
    setErrorMessage(null);

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // 1. Check if an Admin has pre-registered this email address as an employee
      const { data: preRegisteredEmployee } = await supabase
        .from('employees')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      // 2. Provision authorization token inside Supabase secure auth vault
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (authError) {
        setErrorMessage(authError.message);
        setSubmitting(false);
        return;
      }

      if (authData?.user) {
        // FIXED: Set role explicitly to 'admin' when registering a fresh workspace
        let assignedRole = 'admin';
        let finalCompanyId = '';

        if (preRegisteredEmployee) {
          // MATCH DETECTED: The user is a pre-registered employee!
          assignedRole = 'employee';
          finalCompanyId = preRegisteredEmployee.company_id;

          // Link employee record to the live user account
          const { error: employeeLinkError } = await supabase
            .from('employees')
            .update({ id: authData.user.id })
            .eq('id', preRegisteredEmployee.id);

          if (employeeLinkError) {
            setErrorMessage(`Employee Account Association Failed: ${employeeLinkError.message}`);
            setSubmitting(false);
            return;
          }

        } else {
          // NO MATCH: The user is an admin registering a brand new company
          const freshCompanyId = crypto.randomUUID();
          finalCompanyId = freshCompanyId;

          // Build their corporate entity workspace with custom GPS parameters
          const { error: companyError } = await supabase
            .from('companies')
            .insert({
              id: freshCompanyId,
              name: companyName || `${fullName}'s Enterprise`,
              owner_id: authData.user.id,
              business_type: "Digital Products & SaaS",
              address: "Remote / Digital Workspace",
              phone: "0000000000",
              office_latitude: latitude ? parseFloat(latitude) : 28.6139,
              office_longitude: longitude ? parseFloat(longitude) : 77.2090,
              allowed_radius_meters: radius ? parseInt(radius) : 100
            });

          if (companyError) {
            setErrorMessage(`Company Workspace Registration Failure: ${companyError.message}`);
            setSubmitting(false);
            return;
          }
        }

        // 3. SECURE UPSERT PROFILE STEP
        const profileData = {
          id: authData.user.id,
          full_name: fullName,
          role: assignedRole,
          company_id: finalCompanyId
        };

        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });

        if (upsertError) {
          setErrorMessage(`Profile Initialization Error: ${upsertError.message}`);
          setSubmitting(false);
          return;
        }

        // Redirect directly to the secure login screen
        router.push('/login');
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected system registration breakdown occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-black text-slate-900 tracking-tight">Create your account</h2>
        <p className="mt-2 text-center text-xs text-slate-500 font-medium">
          HRBharat • Central Workspace Gateway Node
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-slate-200 rounded-3xl shadow-sm sm:px-10">
          
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Form tag connects directly to our submission function logic */}
          <form onSubmit={handleRegisterPipeline} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block mb-1">Full Identity Name</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Rajesh Kumar" className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-slate-50/50" />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block mb-1">Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.in" className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-slate-50/50" />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block mb-1">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-slate-50/50" />
            </div>

            {/* OWNERS SECTION: BUSINESS DETAILS & GEOFENCE COORDINATES */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block mb-1">Company / Workspace Name (Owners Only)</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g., Monk Digital Media" className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-slate-50/50" />
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-teal-700" /> <span>Workspace Geofencing</span>
                  </span>
                  <button type="button" onClick={handleDetectCurrentLocation} disabled={fetchingGeo} className="text-[10px] font-bold text-teal-700 hover:text-teal-800 flex items-center space-x-1 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs cursor-pointer">
                    <Navigation className={`w-2.5 h-2.5 ${fetchingGeo ? 'animate-spin' : ''}`} />
                    <span>{fetchingGeo ? 'Detecting...' : 'Detect My Location'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block mb-0.5">Office Latitude</label>
                    <input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="e.g., 28.6139" className="w-full text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none bg-white" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block mb-0.5">Office Longitude</label>
                    <input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="e.g., 77.2090" className="w-full text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none bg-white" />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wide block mb-0.5">Allowed Radius Buffer (Meters)</label>
                  <input type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="100" className="w-full text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none bg-white" />
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-medium leading-normal">
                Employees: You can ignore the company/location boxes. Your account auto-links to your organization profile based on your corporate email routing setup.
              </p>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm mt-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none">
              {submitting ? 'Constructing Secure Space Node...' : 'Register Profile'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs font-medium text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-teal-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}