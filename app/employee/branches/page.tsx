"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { MapPin, Plus, Trash2, Navigation, Layers } from 'lucide-react';

export default function BranchManagementEngine() {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [radius, setRadius] = useState(100);
  const [geoLoading, setGeoLoading] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
    if (!profile?.company_id) return;

    const { data } = await supabase.from('branches').select('*').eq('company_id', profile.company_id);
    setBranches(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCaptureLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(7));
        setLon(pos.coords.longitude.toFixed(7));
        setGeoLoading(false);
      },
      () => { alert("Failed to fetch accurate coordinates."); setGeoLoading(false); },
      { enableHighAccuracy: true }
    );
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !lat || !lon) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();

    await supabase.from('branches').insert({
      company_id: profile?.company_id,
      branch_name: name,
      address,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      allowed_radius_meters: radius
    });

    setName(''); setAddress(''); setLat(''); setLon(''); setRadius(100);
    fetchBranches();
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm("Are you sure you want to remove this branch outlet?")) return;
    await supabase.from('branches').delete().eq('id', id);
    fetchBranches();
  };

  if (loading) return <div className="p-6 text-xs text-slate-400 font-bold animate-pulse">SYNCHRONIZING ENTERPRISE BRANCH MAPS...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Multi-Location Branch Matrix</h2>
        <p className="text-xs text-slate-500 font-medium">Declare separated physical outlets with isolated geofence parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* BRANCH INTAKE FORM */}
        <form onSubmit={handleCreateBranch} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Initialize New Branch</h3>
          
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Branch Outlet Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Mumbai Central Hub" className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none" />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Physical Address</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Full street address context..." className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Latitude</label>
              <input type="number" step="any" required value={lat} onChange={e => setLat(e.target.value)} className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none bg-slate-50 font-mono" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Longitude</label>
              <input type="number" step="any" required value={lon} onChange={e => setLon(e.target.value)} className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none bg-slate-50 font-mono" />
            </div>
          </div>

          <div className="flex space-x-2">
            <button type="button" onClick={handleCaptureLocation} disabled={geoLoading} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] py-2 rounded-xl transition-all flex items-center justify-center space-x-1">
              <Navigation className="w-3.5 h-3.5" />
              <span>{geoLoading ? "Locating..." : "Detect Live GPS"}</span>
            </button>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Allowed Radius (Meters)</label>
            <input type="number" required value={radius} onChange={e => setRadius(parseInt(e.target.value))} className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl focus:outline-none" />
          </div>

          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1">
            <Plus className="w-4 h-4" />
            <span>Deploy Branch Perimeter</span>
          </button>
        </form>

          {/* ACTIVE ROSTER CARD FEED */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Authorized Outlets</h3>
            {branches.length === 0 ? (
              <p className="text-xs font-medium text-slate-400 py-6 text-center">No structural branches configured yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {branches.map(br => (
                  <div key={br.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-2xl flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center space-x-1.5 text-slate-900 font-black text-sm">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span>{br.branch_name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-1">{br.address || 'No location address text logged'}</p>
                      <div className="text-[10px] font-mono text-slate-500 mt-2 space-y-0.5 bg-white border border-slate-100 p-2 rounded-xl">
                        <p>LAT: {br.latitude}</p>
                        <p>LON: {br.longitude}</p>
                        <p className="text-teal-700 font-bold">FENCE: {br.allowed_radius_meters} meters</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteBranch(br.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg w-fit transition-all flex items-center space-x-1 text-[10px] font-bold border border-red-100">
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
}