"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatINR } from '@/lib/utils';
import { UserPlus, X, IndianRupee, Users, LayoutDashboard, Building2, Search, RefreshCw } from 'lucide-react';

export default function AdminDashboardHub() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(''); 
  const [baseSalary, setBaseSalary] = useState(''); 
  const [tempPassword, setTempPassword] = useState('');
  const [empCode, setEmpCode] = useState(''); 
  const [branchName, setBranchName] = useState(''); 

  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    let output = [...employees];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      output = output.filter(e => (e.full_name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q) || (e.employee_code || '').toLowerCase().includes(q));
    }
    if (selectedBranch) output = output.filter(e => e.branch_name === selectedBranch);
    setFilteredEmployees(output);
  }, [searchQuery, selectedBranch, employees]);

  async function fetchEmployees() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setEmployees(data || []);
      setFilteredEmployees(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleOnboardWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !role || !baseSalary || !tempPassword) return alert("Fill out fields!");
    
    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: tempPassword, role, salary: baseSalary, empCode, branch: branchName })
      });

      const outcome = await res.json();
      if (!res.ok) throw new Error(outcome.error || "Failed");

      alert(`Success! Onboarded ${name} with password: ${tempPassword}`);
      setName(''); setEmail(''); setRole(''); setBaseSalary(''); setTempPassword(''); setEmpCode(''); setBranchName('');
      setShowAddDrawer(false);
      fetchEmployees();
    } catch (err: any) { alert(err.message); } finally { setSubmitting(false); }
  }

  const uniqueBranches = Array.from(new Set(employees.map(e => e.branch_name).filter(Boolean)));
  const totalPayroll = filteredEmployees.reduce((sum, e) => sum + (Number(e.base_salary) || 0), 0);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6 my-6 font-medium text-slate-800">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2"><LayoutDashboard className="w-6 h-6" /> HRBharat Admin Portal</h1>
          <p className="text-xs text-slate-400">Manage workforce roster configuration parameters</p>
        </div>
        <button onClick={() => setShowAddDrawer(!showAddDrawer)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1">
          {showAddDrawer ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />} Onboard Worker
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div><span className="text-xs text-slate-400 font-bold uppercase">Active Roster</span><h3 className="text-xl font-black">{filteredEmployees.length} Workers</h3></div>
          <div className="p-3 bg-slate-50 rounded-xl"><Users className="w-5 h-5" /></div>
        </div>
        <div className="bg-white border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div><span className="text-xs text-slate-400 font-bold uppercase">Monthly Payroll Expenditures</span><h3 className="text-xl font-black text-emerald-600">{formatINR(totalPayroll)}</h3></div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><IndianRupee className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search staff..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border rounded-xl text-sm focus:outline-none" />
        </div>
        <div>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs focus:outline-none h-full">
            <option value="">All Operational Branches</option>
            {uniqueBranches.map((b: any) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        {(searchQuery || selectedBranch) && (
          <button onClick={() => { setSearchQuery(''); setSelectedBranch(''); }} className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center justify-center gap-1"><RefreshCw className="w-3 h-3" /> Clear Filters</button>
        )}
      </div>

      {showAddDrawer && (
        <form onSubmit={handleOnboardWorker} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 border-b pb-1">Create Worker Account</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 text-xs">
            <div><label className="font-bold text-slate-500">Full Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 p-2 bg-white border rounded-xl" required /></div>
            <div><label className="font-bold text-slate-500">Email Address *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 p-2 bg-white border rounded-xl" required /></div>
            <div><label className="font-bold text-slate-500">Temporary Password *</label><input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className="w-full mt-1 p-2 bg-amber-50 border border-amber-200 font-mono" required /></div>
            <div><label className="font-bold text-slate-500">Role/Designation *</label><input type="text" value={role} onChange={(e) => setRole(e.target.value)} className="w-full mt-1 p-2 bg-white border rounded-xl" required /></div>
            <div><label className="font-bold text-slate-500">Monthly Salary *</label><input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} className="w-full mt-1 p-2 bg-white border rounded-xl" required /></div>
            <div><label className="font-bold text-slate-500">Branch Name</label><input type="text" value={branchName} onChange={(e) => setBranchName(e.target.value)} className="w-full mt-1 p-2 bg-white border rounded-xl" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t text-xs">
            <button type="button" onClick={() => setShowAddDrawer(false)} className="px-4 py-2 bg-slate-200 rounded-xl font-semibold">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-sm disabled:bg-slate-400">{submitting ? "Provisioning..." : "Onboard Account"}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 uppercase text-slate-400 font-bold border-b">
            <tr><th className="p-4">Staff Details</th><th className="p-4">Designation</th><th className="p-4">Salary Scale</th></tr>
          </thead>
          <tbody className="divide-y font-medium text-slate-700">
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                <td className="p-4"><p className="font-bold text-slate-900">{emp.full_name || emp.name}</p><p className="text-[10px] text-slate-400 font-mono">#{emp.employee_code} • {emp.email}</p></td>
                <td className="p-4"><p className="font-bold text-slate-800">{emp.role}</p><p className="text-[10px] text-slate-400 flex items-center gap-0.5"><Building2 className="w-3 h-3" /> {emp.branch_name || "HQ"}</p></td>
                <td className="p-4 font-black text-slate-950">{formatINR(emp.base_salary || emp.monthly_salary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}