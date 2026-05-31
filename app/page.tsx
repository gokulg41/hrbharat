import Link from 'next/link';
import { CheckCircle, ShieldCheck, Smartphone, Zap } from 'lucide-react';

export default function LandingPage() {
  const tiers = [
    { name: 'Starter Plan', price: '₹999', limit: 'Up to 10 Employees', desc: 'Perfect for small shops, agencies & early-stage startups.' },
    { name: 'Growth Plan', price: '₹1,999', limit: 'Up to 30 Employees', desc: 'Ideal for growing factories, restaurants, and local offices.' },
    { name: 'Business Plan', price: '₹3,999', limit: 'Up to 75 Employees', desc: 'Full power capabilities for established distributed operations.' },
  ];
// app/page.tsx - Update your header navigation strip links

<header className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center border-b border-slate-100">
  <h1 className="text-2xl font-black text-teal-700 tracking-tight">HR<span className="text-slate-900">Bharat</span></h1>
  <div className="space-x-4">
    {/* Update this to link straight to your admin panel for rapid testing */}
    <Link href="/admin" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
      Sign In
    </Link>
    
    {/* Update this to point to your registration wizard */}
    <Link href="/register" className="bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-teal-800 transition-all shadow-sm">
      Create Account
    </Link>
  </div>
</header>
  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center border-b border-slate-100">
        <h1 className="text-2xl font-black text-teal-700 tracking-tight">HR<span className="text-slate-900">Bharat</span></h1>
        <div className="space-x-4">
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Sign In</Link>
          <Link href="/signup" className="bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-teal-800 transition-all shadow-sm">Create Account</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-16 pb-24 text-center">
        <span className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">Designed for Indian SMBs</span>
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto mt-6 leading-tight">
          Payroll, attendance, and employee management for Indian small businesses.
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed">
          Run attendance, salary, payslips, leave, and compliance reminders from one simple dashboard built for Indian SMBs. No technical expertise required.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto px-4">
          <Link href="/signup" className="bg-teal-700 text-white font-semibold px-8 py-4 rounded-xl text-md hover:bg-teal-800 transition-all shadow-lg shadow-teal-900/20">Start 14-Day Free Trial</Link>
          <Link href="#pricing" className="bg-white text-slate-800 border border-slate-300 font-semibold px-8 py-4 rounded-xl text-md hover:bg-slate-50 transition-all">View Local Plans</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-20 text-left px-4">
          {[
            { title: 'Selfie Check-In', desc: 'Geo-verified staff tracking', icon: Smartphone },
            { title: '1-Click Salary', desc: 'Instant calculation loops', icon: Zap },
            { title: 'WhatsApp Ready', desc: 'Direct digital slip distribution', icon: CheckCircle },
            { title: 'Compliance Base', desc: 'Built-in local accounting insights', icon: ShieldCheck }
          ].map((feat, idx) => (
            <div key={idx} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <feat.icon className="w-8 h-8 text-teal-700 mb-3" />
              <h4 className="font-bold text-slate-900">{feat.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{feat.desc}</p>
            </div>
          ))}
        </div>

        <section id="pricing" className="pt-24">
          <h3 className="text-3xl font-extrabold text-slate-900">Simple, Predictable Monthly Rates</h3>
          <p className="text-slate-500 mt-2">No setup fees. Clear value pricing context built for Indian margins.</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12 px-4">
            {tiers.map((tier, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col text-left relative overflow-hidden">
                {idx === 1 && <div className="absolute top-0 right-0 bg-teal-700 text-white font-bold text-[10px] tracking-widest uppercase px-4 py-1 rounded-bl-xl">Popular</div>}
                <h4 className="text-lg font-bold text-slate-900">{tier.name}</h4>
                <div className="flex items-baseline mt-4 mb-2">
                  <span className="text-4xl font-black text-slate-900">{tier.price}</span>
                  <span className="text-slate-500 text-sm ml-1">/month</span>
                </div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md self-start mb-4">{tier.limit}</span>
                <p className="text-sm text-slate-500 flex-1">{tier.desc}</p>
                <Link href="/signup" className="mt-8 bg-slate-900 text-white font-medium text-center py-3 rounded-xl hover:bg-slate-800 transition-all">Select System Configuration</Link>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}