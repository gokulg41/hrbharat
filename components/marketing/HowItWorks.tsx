import Reveal from "./Reveal";

const steps = [
  {
    n: "01",
    title: "Set up your company",
    desc: "Create your workspace and configure it around how your business runs.",
  },
  {
    n: "02",
    title: "Add your employees",
    desc: "Bring your team on board with centralized employee records.",
  },
  {
    n: "03",
    title: "Manage HR & attendance",
    desc: "Track attendance, handle leave, and manage requests in one place.",
  },
  {
    n: "04",
    title: "Run payroll and grow",
    desc: "Process payroll with confidence, backed by accurate operational data.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] text-[#10131A] max-w-xl">
            From setup to payroll, in four steps.
          </h2>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="relative pl-0">
                <span className="font-mono text-[13px] text-[#0E7C66]">
                  {s.n}
                </span>
                <h3 className="mt-3 text-[16px] font-semibold text-[#10131A]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#5B6472]">
                  {s.desc}
                </p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1.5 left-[calc(100%+8px)] w-[calc(100%-16px)] h-px bg-[#E6E8EC]" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
