import {
  ClipboardList,
  Calculator,
  CalendarX2,
  MessageSquareWarning,
  Clock,
  EyeOff,
  Sheet,
  AlertTriangle,
} from "lucide-react";

const PROBLEMS = [
  { icon: ClipboardList, text: "Manual attendance tracking that no one fully trusts" },
  { icon: Calculator, text: "Payroll calculations redone by hand, every single month" },
  { icon: CalendarX2, text: "Leave requests and approvals lost in the chaos" },
  { icon: MessageSquareWarning, text: "Employee requests scattered across WhatsApp threads" },
  { icon: Clock, text: "HR administration that eats hours it shouldn't" },
  { icon: EyeOff, text: "No real visibility into what's actually happening" },
  { icon: Sheet, text: "The business still runs on a dozen spreadsheets" },
  { icon: AlertTriangle, text: "Payroll errors that cost trust as much as money" },
];

export default function Problem() {
  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
      <div className="max-w-2xl">
        <span className="mkt-eyebrow">The problem</span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--mkt-navy)]">
          HR shouldn&apos;t feel like another full-time job.
        </h2>
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PROBLEMS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="mkt-card rounded-xl p-5 hover:border-[var(--mkt-border-strong)] transition-colors"
          >
            <Icon className="w-5 h-5 text-[var(--mkt-navy)]" strokeWidth={1.75} />
            <p className="mt-4 text-[14.5px] leading-snug text-[var(--mkt-text)]">
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
