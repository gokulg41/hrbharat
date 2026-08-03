import Reveal from "./Reveal";

const placeholders = [
  {
    quote:
      "Placeholder — replace with a verified customer testimonial once available. Focus on a specific, measurable outcome (e.g. time saved on payroll runs).",
    name: "Customer name",
    role: "Title · Company",
    label: "Pilot customer — placeholder",
  },
  {
    quote:
      "Placeholder — replace with a verified customer testimonial once available. Focus on how attendance or leave management improved day-to-day.",
    name: "Customer name",
    role: "Title · Company",
    label: "Early customer — placeholder",
  },
  {
    quote:
      "Placeholder — replace with a verified customer testimonial once available.",
    name: "Customer name",
    role: "Title · Company",
    label: "Testimonial coming soon",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[#FCFCFB] py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="max-w-xl">
            <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] text-[#10131A]">
              What early customers say.
            </h2>
            <p className="mt-3 text-[13.5px] text-[#5B6472]">
              The cards below are clearly-labeled placeholders — swap in
              verified testimonials as they come in.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {placeholders.map((t, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="h-full rounded-2xl bg-white border border-dashed border-[#C7CBD3] p-6 flex flex-col">
                <span className="self-start text-[10px] font-mono uppercase tracking-[0.1em] text-[#5B6472] bg-[#F4F5F7] px-2.5 py-1 rounded-md mb-5">
                  {t.label}
                </span>
                <p className="text-[14px] leading-relaxed text-[#5B6472] flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#E6E8EC]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#10131A]">
                      {t.name}
                    </p>
                    <p className="text-[12px] text-[#5B6472]">{t.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
