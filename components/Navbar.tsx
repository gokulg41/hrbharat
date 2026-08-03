import { Factory, Stethoscope, GraduationCap, Plane, Briefcase, Store, TrendingUp } from "lucide-react";

const INDUSTRIES = [
  { icon: Factory, label: "Manufacturing" },
  { icon: Stethoscope, label: "Healthcare & Clinics" },
  { icon: GraduationCap, label: "Education" },
  { icon: Plane, label: "Travel & Hospitality" },
  { icon: Briefcase, label: "Professional Services" },
  { icon: Store, label: "Retail" },
  { icon: TrendingUp, label: "Growing SMEs" },
];

export default function Industries() {
  return (
    <>
      <section id="industries" className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <span className="mkt-eyebrow">Industries</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--mkt-navy)]">
            Built for businesses across industries.
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {INDUSTRIES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="mkt-card flex items-center gap-2.5 rounded-full pl-3.5 pr-5 py-2.5"
            >
              <Icon className="w-4 h-4 text-[var(--mkt-teal)]" strokeWidth={1.75} />
              <span className="text-[13.5px] font-medium text-[var(--mkt-navy)]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="global" className="bg-[var(--mkt-canvas-alt)] border-y border-[var(--mkt-border)]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--mkt-navy)] max-w-2xl mx-auto">
            Built in India. Ready for growing businesses everywhere.
          </h3>
          <p className="mt-4 text-[15px] text-[var(--mkt-muted)] max-w-xl mx-auto leading-relaxed">
            HRBharat is designed for growing businesses across India and the
            UAE — built to scale with companies as their teams grow.
          </p>
        </div>
      </section>
    </>
  );
}
