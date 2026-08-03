import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Reveal from "./Reveal";

const ticker = [
  { name: "Anjali Rao", dept: "Operations", status: "Checked in", time: "09:02" },
  { name: "Rahul Verma", dept: "Sales", status: "Checked in", time: "09:11" },
  { name: "Fatima Al Suwaidi", dept: "Finance", status: "On leave", time: "—" },
  { name: "Karthik Iyer", dept: "Manufacturing", status: "Checked in", time: "08:47" },
];

export default function Hero() {
  return (
    <section className="relative bg-[#FCFCFB] pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
      {/* ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(11,18,32,0.06),transparent)]"
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
          {/* left: copy */}
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-[#0E7C66] bg-[#E9F5F2] border border-[#CFE9E3] px-3 py-1.5 rounded-full">
                HR &amp; Payroll, unified
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 text-[42px] leading-[1.08] sm:text-[52px] md:text-[60px] font-semibold tracking-[-0.02em] text-[#10131A]">
                Your people. Your payroll.
                <br />
                One powerful platform.
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="mt-6 text-[17px] leading-relaxed text-[#5B6472] max-w-[540px]">
                HRBharat brings attendance, payroll, leave management and
                employee operations into one simple platform — helping
                businesses spend less time on administration and more time
                growing.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/book-demo"
                  className="group inline-flex items-center justify-center gap-2 bg-[#0B1220] text-white font-semibold text-[15px] px-6 py-3.5 rounded-lg hover:bg-[#142238] transition-colors"
                >
                  Book a Demo
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                <a
                  href="#solution"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#10131A] font-semibold text-[15px] px-6 py-3.5 rounded-lg border border-[#E0E3E8] hover:border-[#C7CBD3] transition-colors"
                >
                  Explore HRBharat
                </a>
              </div>
            </Reveal>

            <Reveal delay={260}>
              <div className="mt-10 flex items-center gap-6 text-[13px] text-[#5B6472]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#0E7C66]" />
                  Built for India &amp; UAE
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#0E7C66]" />
                  No setup complexity
                </span>
              </div>
            </Reveal>
          </div>

          {/* right: signature product mockup */}
          <Reveal delay={160}>
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(60%_60%_at_50%_20%,rgba(14,124,102,0.10),transparent)]"
              />
              <div className="relative rounded-2xl bg-[#0B1220] border border-white/[0.06] shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] p-6 md:p-7">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-white/40">
                      Payroll run · August
                    </p>
                    <p className="text-white text-[15px] font-semibold mt-1">
                      Monthly payroll
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#7FD6C2] bg-[#0E7C66]/15 border border-[#0E7C66]/30 px-2.5 py-1 rounded-md">
                    On track
                  </span>
                </div>

                <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden mb-1.5">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[#0E7C66] to-[#4FBFA3]" />
                </div>
                <p className="text-[11px] font-mono text-white/35 mb-6">
                  78% processed · 142 of 182 employees
                </p>

                <div className="h-px bg-white/[0.06] mb-5" />

                <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-white/40 mb-3">
                  Live attendance
                </p>
                <div className="space-y-2.5">
                  {ticker.map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.05] px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] font-mono text-white/70">
                          {row.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] text-white truncate">
                            {row.name}
                          </p>
                          <p className="text-[11px] text-white/35">
                            {row.dept}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-[11px] font-mono ${
                            row.status === "On leave"
                              ? "text-white/40"
                              : "text-[#7FD6C2]"
                          }`}
                        >
                          {row.status}
                        </p>
                        <p className="text-[10px] font-mono text-white/25">
                          {row.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
