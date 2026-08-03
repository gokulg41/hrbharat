const STEPS = [
  { n: "01", title: "Set up your company", desc: "Add your company details and configure how HRBharat should work for your team." },
  { n: "02", title: "Add your employees", desc: "Bring your workforce into the platform in minutes, not days." },
  { n: "03", title: "Manage HR & attendance", desc: "Track attendance, handle leave, and keep employee records current." },
  { n: "04", title: "Run payroll and grow", desc: "Process payroll with confidence, and let the platform scale with you." },
];

export default function HowItWorks() {
  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
      <div className="max-w-2xl">
        <span className="mkt-eyebrow">How it works</span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--mkt-navy)]">
          From setup to payroll, in four steps.
        </h2>
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {STEPS.map((step, i) => (
          <div key={step.n} className="relative">
            {i < STEPS.length - 1 && (
              <div className="hidden lg:block absolute top-5 left-[calc(100%-0.5rem)] w-6 h-px bg-[var(--mkt-border-strong)]" />
            )}
            <span className="mkt-console-mono text-[13px] text-[var(--mkt-teal)] font-semibold">
              {step.n}
            </span>
            <h3 className="mt-3 text-[16px] font-semibold text-[var(--mkt-navy)]">
              {step.title}
            </h3>
            <p className="mt-2 text-[14px] text-[var(--mkt-muted)] leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
