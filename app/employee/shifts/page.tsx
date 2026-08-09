"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Clock, Plus, Users, Trash2 } from 'lucide-react';

export default function ShiftManagementEngine() {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [gracePeriod, setGracePeriod] = useState('15');

  const fetchShiftsState = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();
    if (!profile?.company_id) return;

    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true });

    setShifts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchShiftsState();
  }, []);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startTime || !endTime) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id).single();

    // Format times with seconds for PostgreSQL time compatibility
    await supabase.from('shifts').insert({
      company_id: profile?.company_id,
      name,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      grace_period_minutes: parseInt(gracePeriod)
    });

    setName(''); setStartTime('09:00'); setEndTime('18:00'); setGracePeriod('15');
    fetchShiftsState();
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shift? Employees linked to it will fallback to defaults.")) return;
    await supabase.from('shifts').delete().eq('id', id);
    fetchShiftsState();
  };

  if (loading) return <div className="p-6 text-xs text-ink-400 font-bold animate-pulse">Loading shifts...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-black text-ink-900 tracking-tight">Shift Timings</h2>
        <p className="text-xs text-ink-600 font-medium">Configure rosters, shift timings, and late grace thresholds</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* SHIFT CREATION FORM */}
        <form onSubmit={handleCreateShift} className="bg-surface-card border border-border-subtle rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-ink-900 tracking-wider">Create Shift</h3>
          
          <div>
            <label className="text-[10px] uppercase font-bold text-ink-400 block mb-1">Shift Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Night Shift, Guard Rotation" className="w-full text-xs font-medium px-3 py-2 border border-border-subtle rounded-xl focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-ink-400 block mb-1">Start Time</label>
              <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full text-xs font-medium px-3 py-2 border border-border-subtle rounded-xl focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-ink-400 block mb-1">End Time</label>
              <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full text-xs font-medium px-3 py-2 border border-border-subtle rounded-xl focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-ink-400 block mb-1">Grace Period (Minutes)</label>
            <input type="number" required value={gracePeriod} onChange={e => setGracePeriod(e.target.value)} placeholder="15" className="w-full text-xs font-medium px-3 py-2 border border-border-subtle rounded-xl focus:outline-none" />
          </div>

          <button type="submit" className="w-full bg-brand hover:bg-brand-hover text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1">
            <Plus className="w-4 h-4" />
            <span>Create Shift</span>
          </button>
        </form>

        {/* SHIFTS CONFIGURATION ROSTER FEED */}
        <div className="lg:col-span-2 bg-surface-card border border-border-subtle rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-ink-400 tracking-wider">Active Shifts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shifts.map(sf => (
              <div key={sf.id} className="p-4 border border-border-subtle bg-surface-card-hover/60 rounded-2xl flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center space-x-1.5 text-ink-900 font-black text-sm">
                    <Clock className="w-4 h-4 text-ink-600" />
                    <span>{sf.name}</span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-ink-600 mt-2 space-y-0.5 bg-surface-card border border-border-subtle p-2 rounded-xl">
                    <p>Hours: {sf.start_time.substring(0,5)} - {sf.end_time.substring(0,5)}</p>
                    <p className="text-status-warning">Grace period: {sf.grace_period_minutes} mins</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteShift(sf.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg w-fit transition-all flex items-center space-x-1 text-[10px] font-bold border border-red-100">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}