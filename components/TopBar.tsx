"use client";

import { useEffect, useState } from 'react';
// FIXED: Changed path alias shortcut to a direct, safe relative path
import { supabase } from '@/lib/supabase';
import { User, Building, Bell } from 'lucide-react';

export default function TopBar() {
  const [companyName, setCompanyName] = useState('Workspace Node');
  const [userName, setUserName] = useState('Staff Profile');

  useEffect(() => {
    async function loadTopBarIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('full_name, company_id').eq('id', user.id).single();
      if (profile?.full_name) setUserName(profile.full_name);

      if (profile?.company_id) {
        const { data: company } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
        if (company?.name) setCompanyName(company.name);
      }
    }
    loadTopBarIdentity();
  }, []);

  return (
    <div className="w-full h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      {/* LEFT SITE BRAND CONTEXT DISPLAY */}
      <div className="flex items-center space-x-2">
        <Building className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-black text-slate-900 tracking-tight uppercase">{companyName}</span>
      </div>

      {/* RIGHT CONTROLS DECK */}
      <div className="flex items-center space-x-4">
        <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
        </button>
        
        <div className="h-4 w-[1px] bg-slate-200"></div>

        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-slate-900 text-white flex items-center justify-center text-[10px] font-black rounded-full shadow-xs uppercase">
            {userName.substring(0, 2)}
          </div>
          <span className="text-xs font-bold text-slate-700 hidden sm:inline-block">{userName}</span>
        </div>
      </div>
    </div>
  );
}