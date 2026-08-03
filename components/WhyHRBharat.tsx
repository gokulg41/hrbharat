const PLACEHOLDERS = [
  {
    quote:
      "Placeholder — replace with a verified customer quote once available. Focus on a specific, measurable outcome (e.g. time saved on payroll each month).",
    name: "Early Customer",
    role: "Placeholder — Operations Lead",
    tag: "Pilot Customer — Replace with verified testimonial",
  },
  {
    quote:
      "Placeholder — replace with a verified customer quote once available. Focus on a specific pain point HRBharat resolved.",
    name: "Early Customer",
    role: "Placeholder — Founder",
    tag: "Customer testimonial coming soon",
  },
  {
    quote:
      "Placeholder — replace with a verified customer quote once available. Focus on how the team's experience changed.",
    name: "Early Customer",
    role: "Placeholder — HR Manager",
    tag: "Pilot Customer — Replace with verified testimonial",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[var(--mkt-canvas-alt)] border-y border-[var(--mkt-border)]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <span className="mkt-eyebrow">Early customers</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--mkt-navy)]">
            Trusted by the teams building with us.
          </h2>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLACEHOLDERS.map((t, i) => (
            <div key={i} className="mkt-card rounded-2xl p-6 flex flex-col">
              <span className="inline-block text-[10.5px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 w-fit">
                {t.tag}
              </span>
              <p className="mt-5 text-[14.5px] text-[var(--mkt-text)]/80 leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--mkt-navy)]/10 flex items-center justify-center text-[12px] font-semibold text-[var(--mkt-navy)]">
                  {t.name.split(" ").map((w) => w[0]).join("")}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--mkt-navy)]">
                    {t.name}
                  </p>
                  <p className="text-[12px] text-[var(--mkt-muted)]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
