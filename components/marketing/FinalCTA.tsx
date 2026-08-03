import { MapPin, Wallet, CalendarCheck, Users, HandCoins, BarChart3 } from "lucide-react";

const FEATURES = [
  {
    icon: MapPin,
    title: "Smart Attendance",
    desc: "GPS and geofence-based attendance tracking gives every business centralized, trustworthy visibility into who's working, where.",
  },
  {
    icon: Wallet,
    title: "Powerful Payroll",
    desc: "Simplify payroll processing and cut down the manual calculations that eat up a week every month.",
  },
  {
    icon: CalendarCheck,
    title: "Leave Management",
    desc: "Employees request leave, managers approve it — all digitally, with a clear record of every decision.",
  },
  {
    icon: Users,
    title: "Employee Management",
    desc: "Centralized employee records and HR information, kept current and accessible in one place.",
  },
  {
    icon: HandCoins,
    title: "Salary Advance Requests",
    desc: "Employees can submit salary advance requests directly through the platform, with a clear approval trail.",
  },
  {
    icon: BarChart3,
    title: "HR Dashboard & Reports",
    desc: "Give business owners and HR teams real visibility into workforce operations, at a glance.",
  },
];

export default function Features() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
      <div className="max-w-2xl">
        <span className="mkt-eyebrow">Platform</span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--mkt-navy)]">
          Everything HR needs, built in.
        </h2>
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="group mkt-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(11,29,51,0.08)]"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--mkt-teal-soft)] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <Icon className="w-5 h-5 text-[var(--mkt-teal)]" strokeWidth={1.75} />
            </div>
            <h3 className="mt-5 text-[17px] font-semibold text-[var(--mkt-navy)]">
              {title}
            </h3>
            <p className="mt-2 text-[14px] text-[var(--mkt-muted)] leading-relaxed">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
