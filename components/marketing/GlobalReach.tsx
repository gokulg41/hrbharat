import Reveal from "./Reveal";

export default function GlobalReach() {
  return (
    <section id="global" className="relative bg-[#0B1220] py-24 md:py-28 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_0%,rgba(14,124,102,0.14),transparent)]"
      />
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <Reveal>
          <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#7FD6C2]">
            Where we operate
          </span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-[32px] md:text-[40px] font-semibold tracking-[-0.02em] text-white">
            Built in India. Ready for growing businesses everywhere.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="mt-5 text-[16px] leading-relaxed text-white/60">
            HRBharat is designed for growing businesses across India and the
            UAE — built to handle the realities of running distributed teams
            without adding operational complexity.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-10 flex justify-center gap-4">
            <span className="text-[13px] font-mono text-white/70 border border-white/10 bg-white/[0.03] px-4 py-2 rounded-full">
              India
            </span>
            <span className="text-[13px] font-mono text-white/70 border border-white/10 bg-white/[0.03] px-4 py-2 rounded-full">
              UAE
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
