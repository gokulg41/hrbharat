"use client";

import React from 'react';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar Structure */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200">
        <Sidebar />
      </div>

      {/* Main Control Panel Viewport */}
      <div className="flex-1 flex flex-col md:pl-64">
        <div className="sticky top-0 z-10 md:hidden bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4">
          <MobileNav />
        </div>
        <main className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}