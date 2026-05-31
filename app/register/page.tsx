"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, Loader2, Mail, Lock, User } from 'lucide-react';

export default function BusinessRegistrationGateway() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fetchingGeo, setFetchingGeo] = useState<boolean>(false);
  const [latitude, setLatitude] = useState<string>('');
const [longitude, setLongitude] = useState<string>('');

  async function handleCorporateOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName || !ownerName || !email || !password) {
      return setErrorMsg("Please input all required corporate parameters.");
    }

    try {
      setLoading(true);
      setErrorMsg('');

      const res = await fetch('/api/company/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, ownerName, email, password, branch })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register enterprise profile.");

      alert(`Corporate Instance Registered for ${companyName}!\nYour Workspace Code is: ${data.companyCode}\nUse these admin credentials to log in.`);
      router.push('/'); // Route them directly back to your unified entry screen
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected network deployment failure occurred.");
    } finally {
      setLoading(false);
    }
  }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-medium text-xs text-slate-700">
      <div className="bg-white border p-6 rounded-3xl shadow-xl max-w-md w-full space-y-5">
        
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-lg mx-auto shadow-md">HB</div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight mt-3">Register Company Profile</h2>
          <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">HRBharat Enterprise Setup Panel</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl font-semibold">{errorMsg}</div>
        )}

        <form onSubmit={handleCorporateOnboarding} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-500 uppercase">Registered Company Name *</label>
              <div className="relative mt-1">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Tata Systems" className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none" required />
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-500 uppercase">Primary Office Hub</label>
              <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. Mumbai Corporate HQ" className="w-full mt-1 p-2 bg-slate-50 border rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none" />
            </div>
          </div>

          <div className="border-t pt-3 space-y-3.5">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Master Administrative Account</h4>
            
            <div>
              <label className="font-bold text-slate-500 uppercase">Executive Owner Name *</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Devilal" className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-500 uppercase">Corporate Email Address *</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none" required />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-500 uppercase">System Password Key *</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none" required />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition disabled:bg-slate-400">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? "Deploying SaaS Architecture..." : "Deploy Corporate Infrastructure"}
          </button>
        </form>

        <div className="text-center pt-2 border-t text-[10px]">
          <p className="text-slate-400">Already configured? <a href="/" className="text-slate-900 font-bold underline hover:text-slate-700">Log In to Workspace</a></p>
        </div>
      </div>
    </div>
  );
}