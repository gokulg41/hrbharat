import Reveal from "./Reveal";

const industries = [
  "Manufacturing",
  "Healthcare & clinics",
  "Education",
  "Travel & hospitality",
  "Professional services",
  "Retail",
  "Growing SMEs",
];

export default function Industries() {
  return (
    <section id="industries" className="bg-[#FCFCFB] py-24 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="max-w-xl mx-auto text-center">
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#0E7C66]">
              Solutions
            </span>
            <h2 className="mt-4 text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] text-[#10131A]">
              Built for businesses across industries.
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {industries.map((ind, i) => (
            <Reveal key={ind} delay={i * 50}>
              <span className="inline-block text-[14px] font-medium text-[#10131A] bg-white border border-[#E6E8EC] px-5 py-2.5 rounded-full hover:border-[#0E7C66] hover:text-[#0E7C66] transition-colors">
                {ind}
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
