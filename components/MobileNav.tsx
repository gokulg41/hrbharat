"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, CalendarCheck, Wallet, LayoutDashboard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileNav() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Staff', path: '/dashboard/employees', icon: Users },
    { name: 'Haziri', path: '/dashboard/attendance', icon: CalendarCheck },
    { name: 'Leave', path: '/dashboard/leave', icon: FileText },
    { name: 'Salary', path: '/dashboard/payroll', icon: Wallet },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-50 flex justify-around items-center h-16 px-2">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center w-full h-full text-center transition-all ${
              isActive ? 'text-teal-700 font-semibold' : 'text-slate-400 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-teal-700' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}