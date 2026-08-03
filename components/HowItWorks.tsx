import CTAButton from "./CTAButton";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1100px 480px at 80% -10%, rgba(13,110,98,0.08), transparent 60%)",
        }}
      />
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-16 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
        <div className="mkt-fade-up">
          <span className="mkt-eyebrow">HR &amp; Payroll, unified</span>
          <h1 className="mt-4 text-[2.5rem] sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.08] text-[var(--mkt-navy)]">
            Your people.
            <br />
            Your payroll.
            <br />
            One powerful platform.
          </h1>
          <p className="mt-6 text-lg text-[var(--mkt-muted)] max-w-xl leading-relaxed">
            HRBharat brings attendance, payroll, leave management and
            employee operations into one simple platform — helping
            businesses spend less time on administration and more time
            growing.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <CTAButton size="lg">Book a Demo</CTAButton>
            <CTAButton variant="secondary" size="lg" href="#solution" icon={false}>
              Explore HRBharat
            </CTAButton>
          </div>
        </div>

        <div className="relative mkt-fade-up" style={{ animationDelay: "120ms" }}>
          <OpsConsole />
        </div>
      </div>

      <div className="border-y border-[var(--mkt-border)] bg-[var(--mkt-canvas-alt)]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6">
          <p className="text-center text-sm text-[var(--mkt-muted)] tracking-tight">
            Built for modern businesses that want HR to simply work.
          </p>
        </div>
      </div>
    </section>
  );
}

function OpsConsole() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[2rem] bg-[var(--mkt-navy)]/5 -z-10 blur-2xl" />
      <div className="mkt-console rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="absolute left-0 right-0 h-24 bg-gradient-to-b from-[var(--mkt-teal)]/15 to-transparent mkt-scanline pointer-events-none" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e8ecf0]/30" />
            <span className="w-2 h-2 rounded-full bg-[#e8ecf0]/30" />
            <span className="w-2 h-2 rounded-full bg-[#e8ecf0]/30" />
          </div>
          <span className="mkt-console-mono text-[11px] tracking-widest text-white/50 uppercase">
            HRBharat — Live Console
          </span>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          <ConsoleTile label="Attendance today" value="94%" sub="212 / 226 checked in" />
          <ConsoleTile label="Payroll run" value="₹—" sub="Processing, 226 employees" masked />
          <ConsoleTile label="Leave requests" value="7" sub="3 pending approval" />
          <ConsoleTile label="Salary advances" value="2" sub="Awaiting review" />
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="mkt-console-mono text-[11px] text-white/50 uppercase tracking-wider">
                Team activity
              </span>
              <span className="mkt-console-mono text-[11px] text-[var(--mkt-teal-light)]">
                ● live
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                "Ravi K. clocked in — Warehouse, Chennai",
                "Leave approved — Fatima A., 2 days",
                "Payslip generated — 226 employees",
              ].map((line) => (
                <div key={line} className="flex items-center gap-2 text-[13px] text-white/70">
                  <span className="w-1 h-1 rounded-full bg-[var(--mkt-teal)] shrink-0" />
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsoleTile({
  label,
  value,
  sub,
  masked,
}: {
  label: string;
  value: string;
  sub: string;
  masked?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4">
      <p className="mkt-console-mono text-[10.5px] text-white/45 uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className={`text-2xl font-semibold ${masked ? "tracking-widest" : ""}`}>
        {value}
      </p>
      <p className="mkt-console-mono text-[11px] text-white/40 mt-1">{sub}</p>
    </div>
  );
}
